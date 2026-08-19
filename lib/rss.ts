import { ART_TERMS, BLOCK_TERMS, FEEDS, type Feed } from "./feeds";
import type { Scope } from "./data";

export type Article = {
  title: string;
  url: string;
  source: string;
  summary: string;
  published: string | null;
  scope: Scope;
  /** ISO 국가코드. 해외(intl) 기사만 채워진다. 판단 불가하면 "XX". */
  country: string | null;
};

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'",
};

function decode(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, name: string) => {
      if (name.startsWith("#x") || name.startsWith("#X")) {
        return String.fromCodePoint(parseInt(name.slice(2), 16));
      }
      if (name.startsWith("#")) {
        return String.fromCodePoint(parseInt(name.slice(1), 10));
      }
      return ENTITIES[name] ?? whole;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, names: string[]): string {
  for (const name of names) {
    const m = block.match(
      new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i")
    );
    if (m) return decode(m[1]);
  }
  return "";
}

function link(block: string): string {
  const plain = block.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i);
  if (plain && plain[1].trim()) return decode(plain[1]);
  const atom = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return atom ? decode(atom[1]) : "";
}

function isArt(text: string): boolean {
  if (BLOCK_TERMS.some((t) => text.includes(t))) return false;
  return ART_TERMS.some((t) => text.includes(t));
}

function clip(text: string, max = 130): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

async function readFeed(feed: Feed, signal: AbortSignal): Promise<Article[]> {
  const res = await fetch(feed.url, {
    signal,
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; ARTREND/0.1; +https://artrend.example)",
      accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    next: { revalidate: 86400, tags: ["news"] },
  });
  if (!res.ok) throw new Error(`${feed.source}: ${res.status}`);

  const xml = await res.text();
  const blocks = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi) ?? [];

  const out: Article[] = [];
  for (const block of blocks) {
    const title = tag(block, ["title"]);
    const url = link(block);
    if (!title || !url) continue;

    const summary = tag(block, ["description", "summary", "content:encoded"]);
    if (feed.filter && !isArt(`${title} ${summary}`)) continue;

    const dateRaw = tag(block, ["pubDate", "published", "updated", "dc:date"]);
    const parsed = dateRaw ? new Date(dateRaw) : null;

    out.push({
      title,
      url,
      source: feed.source,
      summary: clip(summary),
      published:
        parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
      scope: feed.scope,
      country: null,
    });
  }
  return out;
}

/**
 * 한 매체가 목록을 독점하지 않게 매체당 상한을 두고 고르게 뽑는다.
 * 발행량이 많은 매체 하나가 화면을 전부 차지하면 여러 소스를 붙인 의미가 없다.
 */
function diversify(articles: Article[], limit: number, perSource = 3): Article[] {
  const used = new Map<string, number>();
  const picked: Article[] = [];

  for (const a of articles) {
    const n = used.get(a.source) ?? 0;
    if (n >= perSource) continue;
    used.set(a.source, n + 1);
    picked.push(a);
    if (picked.length >= limit) return picked;
  }

  for (const a of articles) {
    if (picked.length >= limit) break;
    if (!picked.includes(a)) picked.push(a);
  }
  return picked;
}

export async function collectNews(scope: Scope, limit = 14): Promise<Article[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const targets = FEEDS.filter((f) => f.scope === scope);
    const settled = await Promise.allSettled(
      targets.map((f) => readFeed(f, controller.signal))
    );

    const seen = new Set<string>();
    const merged: Article[] = [];
    for (const r of settled) {
      if (r.status !== "fulfilled") continue;
      for (const a of r.value) {
        const key = a.title.toLowerCase().replace(/\s+/g, "");
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(a);
      }
    }

    // RSS가 없는 나라(일본·프랑스)는 Google 뉴스 검색 RSS로 우회해 원문을
    // 가져오고, 한국어로 번역해 합친다. 실패해도 나머지 뉴스는 그대로 나간다.
    if (scope === "intl") {
      try {
        const { collectForeignLanguageNews } = await import("./googlenews");
        const { translateToKorean } = await import("./translate");

        const foreign = await collectForeignLanguageNews();
        if (foreign.length > 0) {
          const translations = await translateToKorean(
            foreign.map((f) => ({ id: f.url, text: f.title }))
          );
          for (const f of foreign) {
            const key = f.title.toLowerCase().replace(/\s+/g, "");
            if (seen.has(key)) continue;
            seen.add(key);
            const ko = translations[f.url];
            merged.push({
              title: ko ?? f.title, // 번역 실패 시 원문 그대로 노출(빈 화면보다 낫다)
              summary: ko ? f.title : "", // 번역됐으면 원문을 보조 텍스트로
              url: f.url,
              source: f.source,
              published: f.published,
              scope: "intl",
              country: f.countryCode,
            });
          }
        }
      } catch {
        // 외신 우회 실패는 무시 — 기존 RSS 뉴스는 그대로 나간다.
      }
    }

    merged.sort((a, b) => {
      if (!a.published) return 1;
      if (!b.published) return -1;
      return b.published.localeCompare(a.published);
    });

    const final = diversify(merged, limit, 3);

    // 국가가 아직 안 정해진 기사만 태깅한다(일본·프랑스는 이미 정해져 있다).
    // 실패해도 뉴스 자체는 그대로 반환한다.
    const needsCountry = final.filter((a) => scope === "intl" && !a.country);
    if (needsCountry.length > 0) {
      try {
        const { classifyArticleCountries } = await import("./geo");
        const codes = await classifyArticleCountries(
          needsCountry.map((a) => ({
            id: a.url,
            text: a.summary ? `${a.title} — ${a.summary}` : a.title,
          }))
        );
        for (const a of needsCountry) {
          a.country = codes[a.url] ?? null;
        }
      } catch {
        // 국가 태깅 실패는 무시 — 뉴스는 그대로 나간다.
      }
    }

    return final;
  } finally {
    clearTimeout(timer);
  }
}

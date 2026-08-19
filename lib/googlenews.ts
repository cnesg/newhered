/**
 * 원본 사이트에 RSS가 없어도, Google 뉴스의 언어별 검색 RSS로 우회한다.
 * 각 나라 언어로 검색하면 그 나라 실제 매체 기사(원문)를 모아서 준다.
 * <source> 태그에 실제 발행처 이름이 들어있어 출처 표시가 가능하다.
 */

export type GoogleNewsQuery = {
  label: string; // 화면에 보일 이름, 예: "일본"
  query: string; // 검색어 (해당 언어로)
  hl: string; // 언어 (ja, fr ...)
  gl: string; // 국가 (JP, FR ...)
  countryCode: string; // COUNTRY_LABELS 키와 맞춘다
};

export const GOOGLE_NEWS_QUERIES: GoogleNewsQuery[] = [
  { label: "일본", query: "美術展 OR アート OR 現代美術", hl: "ja", gl: "JP", countryCode: "JP" },
  { label: "파리", query: "exposition art contemporain OR galerie Paris", hl: "fr", gl: "FR", countryCode: "FR" },
];

export type RawForeignArticle = {
  title: string;
  url: string;
  source: string;
  published: string | null;
  lang: string;
  countryCode: string;
};

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
}

function sourceName(block: string): string {
  const m = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
  return m ? m[1].trim() : "";
}

async function fetchOne(q: GoogleNewsQuery, signal: AbortSignal): Promise<RawForeignArticle[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    q.query
  )}&hl=${q.hl}&gl=${q.gl}&ceid=${q.gl}:${q.hl}`;

  const res = await fetch(url, {
    signal,
    headers: { "user-agent": "Mozilla/5.0 (compatible; ARTREND/0.1)" },
    next: { revalidate: 86400, tags: ["news"] },
  } as RequestInit);
  if (!res.ok) return [];

  const xml = await res.text();
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  return blocks
    .map((b) => {
      const title = tag(b, "title");
      const link = tag(b, "link");
      const pubDate = tag(b, "pubDate");
      const src = sourceName(b);
      if (!title || !link) return null;
      const parsed = pubDate ? new Date(pubDate) : null;
      return {
        title,
        url: link,
        source: src || q.label,
        published: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
        lang: q.hl,
        countryCode: q.countryCode,
      } as RawForeignArticle;
    })
    .filter(Boolean) as RawForeignArticle[];
}

export async function collectForeignLanguageNews(limit = 8): Promise<RawForeignArticle[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const settled = await Promise.allSettled(
      GOOGLE_NEWS_QUERIES.map((q) => fetchOne(q, controller.signal))
    );
    const out: RawForeignArticle[] = [];
    for (const r of settled) {
      if (r.status === "fulfilled") out.push(...r.value.slice(0, limit));
    }
    return out;
  } finally {
    clearTimeout(timer);
  }
}

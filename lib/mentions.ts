import { collectNews } from "./rss";
import { collectVideos } from "./youtube";
import { extractArtistMentions, type MentionSource } from "./extract";
import { supabaseService } from "./supabase";
import type { Scope } from "./data";

/**
 * 오늘 수집된 뉴스+영상에서 작가 언급을 뽑아 Supabase에 쌓는다.
 * news → axis: discourse (담론), video → axis: attention (관심)
 * /api/refresh가 매일 오전 7시에 이 함수를 호출한다.
 */
export async function runMentionExtraction(): Promise<{
  itemsScanned: number;
  mentionsFound: number;
  artistsWritten: number;
}> {
  const scopes: Scope[] = ["kr", "intl"];
  const items: MentionSource[] = [];

  for (const scope of scopes) {
    const [news, videoResult] = await Promise.all([
      collectNews(scope).catch(() => []),
      collectVideos(scope).catch(() => ({ videos: [], shorts: [], configured: false })),
    ]);

    for (const a of news) {
      items.push({
        id: `news:${a.url}`,
        text: a.summary ? `${a.title} — ${a.summary}` : a.title,
        kind: "news",
        source: a.source,
        url: a.url,
        date: a.published,
      });
    }

    for (const v of [...videoResult.videos, ...videoResult.shorts]) {
      items.push({
        id: `video:${v.id}`,
        text: v.title,
        kind: "video",
        source: v.channel,
        url: v.url,
        date: v.published,
      });
    }
  }

  if (items.length === 0) {
    return { itemsScanned: 0, mentionsFound: 0, artistsWritten: 0 };
  }

  const mentions = await extractArtistMentions(items);
  if (mentions.length === 0) {
    return { itemsScanned: items.length, mentionsFound: 0, artistsWritten: 0 };
  }

  const db = supabaseService();
  if (!db) {
    return { itemsScanned: items.length, mentionsFound: mentions.length, artistsWritten: 0 };
  }

  const itemsById = new Map(items.map((it) => [it.id, it]));
  const artistIdCache = new Map<string, string>();
  let written = 0;

  for (const m of mentions) {
    const source = itemsById.get(m.itemId);
    if (!source) continue;

    const nameKo = m.nameKo!.trim();
    let artistId: string | undefined = artistIdCache.get(nameKo);

    if (!artistId) {
      const { data: existing } = await db
        .from("artists")
        .select("id")
        .eq("name_ko", nameKo)
        .maybeSingle();

      if (existing) {
        artistId = existing.id as string;
      } else {
        // 신규 작가일 때만 fame 판단을 반영한다. 이미 명성이 확립된 경우
        // ESTABLISHED로 즉시 고정(tier_locked)해, "우리가 오늘 처음 봤다"는
        // 이유만으로 거장이 ROOKIE로 분류되는 걸 막는다.
        const isKnown = m.fame === "established";
        const { data: created, error } = await db
          .from("artists")
          .insert({
            name_ko: nameKo,
            name_en: m.nameEn,
            tier: isKnown ? "established" : "unrated",
            tier_locked: isKnown,
          })
          .select("id")
          .single();
        if (error || !created) continue;
        artistId = created.id as string;
      }
      artistIdCache.set(nameKo, artistId);
    }

    const axis = source.kind === "news" ? "discourse" : "attention";
    const occurredOn = (source.date ?? new Date().toISOString()).slice(0, 10);

    const { error: signalErr } = await db.from("signals").insert({
      artist_id: artistId,
      axis,
      occurred_on: occurredOn,
      source: `${source.kind}:${source.source}`,
      value: 1,
      weight: 1,
      url: source.url,
    });

    if (!signalErr) written += 1;
  }

  return { itemsScanned: items.length, mentionsFound: mentions.length, artistsWritten: written };
}

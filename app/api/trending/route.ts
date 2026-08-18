import { NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * 최근 7일 언급량 기준 트렌딩 작가 목록.
 * discourse(뉴스) + attention(영상) signals를 합산하고,
 * 그 전 7일과 비교해 증가율을 계산한다.
 *
 * 데이터가 아직 쌓이지 않았다면 빈 배열을 돌려준다 — 정상이다.
 */
export async function GET() {
  const db = supabaseAnon();
  if (!db) {
    return NextResponse.json(
      { error: "Supabase가 설정되지 않았습니다", trending: [] },
      { status: 200 }
    );
  }

  const now = new Date();
  const day = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const thisWeekStart = day(7);
  const lastWeekStart = day(14);

  const { data: rows, error } = await db
    .from("signals")
    .select("artist_id, axis, value, weight, occurred_on")
    .in("axis", ["discourse", "attention"])
    .gte("occurred_on", lastWeekStart);

  if (error) {
    return NextResponse.json({ error: error.message, trending: [] }, { status: 200 });
  }

  const byArtist = new Map<string, { thisWeek: number; lastWeek: number }>();
  for (const r of rows ?? []) {
    const w = (r.value ?? 1) * (r.weight ?? 1);
    const bucket = byArtist.get(r.artist_id) ?? { thisWeek: 0, lastWeek: 0 };
    if (r.occurred_on >= thisWeekStart) bucket.thisWeek += w;
    else bucket.lastWeek += w;
    byArtist.set(r.artist_id, bucket);
  }

  const ids = [...byArtist.keys()];
  if (ids.length === 0) {
    return NextResponse.json({ trending: [], windowStart: thisWeekStart });
  }

  const { data: artists } = await db
    .from("artists")
    .select("id,name_ko,name_en,nationality")
    .in("id", ids);

  const nameOf = new Map((artists ?? []).map((a) => [a.id, a]));

  const trending = ids
    .map((id) => {
      const { thisWeek, lastWeek } = byArtist.get(id)!;
      const growth = lastWeek === 0 ? (thisWeek > 0 ? 1 : 0) : (thisWeek - lastWeek) / lastWeek;
      return {
        artistId: id,
        nameKo: nameOf.get(id)?.name_ko ?? null,
        nameEn: nameOf.get(id)?.name_en ?? null,
        nationality: nameOf.get(id)?.nationality ?? null,
        mentionsThisWeek: thisWeek,
        mentionsLastWeek: lastWeek,
        growth,
      };
    })
    .sort((a, b) => b.mentionsThisWeek - a.mentionsThisWeek);

  return NextResponse.json(
    { trending, windowStart: thisWeekStart, checkedAt: now.toISOString() },
    { headers: { "cache-control": "no-store" } }
  );
}

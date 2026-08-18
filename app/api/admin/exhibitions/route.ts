import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * 관리자용 전시 입력. Supabase Table Editor에서 UUID를 직접 다루지 않아도 되게
 * 이름만 입력하면 서버가 작가 존재 여부를 확인하고 필요하면 새로 만든다.
 *
 * 인증은 정교하지 않다 — ADMIN_SECRET 문자열 하나만 맞으면 통과.
 * 공개 URL이니 이 값은 남에게 알려주지 않는다.
 */
export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET이 서버에 설정되지 않았습니다" },
      { status: 501 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || body.adminKey !== adminSecret) {
    return NextResponse.json({ error: "관리자 키가 틀렸습니다" }, { status: 401 });
  }

  const {
    artistNameKo,
    artistNameEn,
    nationality,
    exhibitionTitle,
    venueId,
    startsOn,
    endsOn,
    exhibitType,
  } = body;

  if (!artistNameKo?.trim() || !exhibitionTitle?.trim() || !venueId) {
    return NextResponse.json(
      { error: "작가명, 전시명, 장소는 필수입니다" },
      { status: 400 }
    );
  }

  const db = supabaseService();
  if (!db) {
    return NextResponse.json(
      { error: "Supabase 서버 연결이 설정되지 않았습니다" },
      { status: 501 }
    );
  }

  // 1) 작가 찾기 또는 새로 만들기
  const nameKo = artistNameKo.trim();
  const nameEn = artistNameEn?.trim() || null;

  let artistId: string;
  const { data: existing, error: findErr } = await db
    .from("artists")
    .select("id")
    .eq("name_ko", nameKo)
    .maybeSingle();

  if (findErr) {
    return NextResponse.json({ error: findErr.message }, { status: 500 });
  }

  if (existing) {
    artistId = existing.id;
  } else {
    const { data: created, error: createErr } = await db
      .from("artists")
      .insert({
        name_ko: nameKo,
        name_en: nameEn,
        nationality: nationality || null,
      })
      .select("id")
      .single();
    if (createErr || !created) {
      return NextResponse.json(
        { error: createErr?.message ?? "작가 생성 실패" },
        { status: 500 }
      );
    }
    artistId = created.id;
  }

  // 2) 전시 만들기
  const { data: exhibition, error: exErr } = await db
    .from("exhibitions")
    .insert({
      title: exhibitionTitle.trim(),
      venue_id: venueId,
      starts_on: startsOn || null,
      ends_on: endsOn || null,
      exhibit_type: exhibitType || "solo",
      source: "manual",
    })
    .select("id")
    .single();

  if (exErr || !exhibition) {
    return NextResponse.json(
      { error: exErr?.message ?? "전시 생성 실패" },
      { status: 500 }
    );
  }

  // 3) 작가 ↔ 전시 연결
  const { error: linkErr } = await db
    .from("exhibition_artists")
    .insert({ exhibition_id: exhibition.id, artist_id: artistId });

  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, artistId, exhibitionId: exhibition.id });
}

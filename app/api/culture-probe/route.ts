import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 진단 전용 엔드포인트. 실제 배치 코드를 짜기 전에
 * 이 API가 실제로 어떤 필드명으로 응답하는지 눈으로 확인하기 위한 것이다.
 * 확인이 끝나면 지워도 된다 — 화면 어디에도 연결되지 않는다.
 */
export async function GET() {
  const key = process.env.CULTURE_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "CULTURE_API_KEY가 설정되지 않았습니다" },
      { status: 200 }
    );
  }

  // 최근 30일 ~ 앞으로 60일 사이 등록된 공연/전시 10건만 살펴본다
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 30);
  const to = new Date(today);
  to.setDate(to.getDate() + 60);
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
      d.getDate()
    ).padStart(2, "0")}`;

  // 알려진 두 가지 엔드포인트 형태를 모두 시도해 실제로 살아있는 쪽을 찾는다.
  const candidates = [
    `https://apis.data.go.kr/B553457/nopenapi/rest/publicperformancedisplays/period?serviceKey=${key}&from=${fmt(
      from
    )}&to=${fmt(to)}&cPage=1&rows=10&realmCode=D`,
    `https://www.culture.go.kr/openapi/rest/publicperformancedisplays/period?serviceKey=${key}&from=${fmt(
      from
    )}&to=${fmt(to)}&cPage=1&rows=10&realmCode=D`,
  ];

  const results = [];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const text = await res.text();
      results.push({
        url: url.replace(key, "***"),
        status: res.status,
        contentType: res.headers.get("content-type"),
        bodyPreview: text.slice(0, 2000),
      });
    } catch (e) {
      results.push({
        url: url.replace(key, "***"),
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json(
    { checkedAt: new Date().toISOString(), results },
    { headers: { "cache-control": "no-store" } }
  );
}

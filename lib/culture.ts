/**
 * 문화포털(한국문화정보원) 전시·공연 정보 API.
 * 확정된 엔드포인트: https://apis.data.go.kr/B553457/cultureinfo/period2
 * (Swagger 문서 id=15138937, 실제 실행으로 확인함 — 2026-08-18)
 *
 * serviceTp: A=공연/전시, B=행사/축제, C=교육/체험
 * realmName 필드로 "전시"만 다시 걸러낸다 — serviceTp=A는 공연도 함께 온다.
 */

export type CultureEvent = {
  seq: string;
  title: string;
  place: string | null;
  startDate: string | null; // YYYYMMDD
  endDate: string | null;
  realmName: string | null; // 전시, 연극, 무용 등 장르
  area: string | null;
  sigungu: string | null;
  thumbnail: string | null;
  gpsX: string | null;
  gpsY: string | null;
  serviceName: string | null; // 제공기관
};

function toDate(yyyymmdd: string | null): string | null {
  if (!yyyymmdd || yyyymmdd.length !== 8) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/** 전시로 인정할 realmName 값. 실제 응답을 보고 필요시 추가한다. */
const EXHIBITION_REALMS = ["전시", "미술", "특별전"];

export async function fetchExhibitions(
  fromDate: Date,
  toDate_: Date
): Promise<CultureEvent[]> {
  const key = process.env.CULTURE_API_KEY;
  if (!key) return [];

  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
      d.getDate()
    ).padStart(2, "0")}`;

  const all: CultureEvent[] = [];
  let page = 1;
  const perPage = 100;

  // 최대 10페이지(1000건)까지만 순회한다 — 하루 배치가 무한히 돌지 않게.
  while (page <= 10) {
    const url =
      `https://apis.data.go.kr/B553457/cultureinfo/period2` +
      `?serviceKey=${key}&PageNo=${page}&numOfrows=${perPage}` +
      `&from=${fmt(fromDate)}&to=${fmt(toDate_)}&serviceTp=A`;

    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) break;

    const json = await res.json().catch(() => null);
    const items = json?.body?.items?.item;
    if (!items) break;

    const list = Array.isArray(items) ? items : [items];
    for (const it of list) {
      all.push({
        seq: String(it.seq ?? ""),
        title: it.title ?? "",
        place: it.place ?? null,
        startDate: toDate(it.startDate ?? null),
        endDate: toDate(it.enddate ?? null),
        realmName: it.realmName ?? null,
        area: it.area ?? null,
        sigungu: it.sigungu ?? null,
        thumbnail: it.thumbnail ?? null,
        gpsX: it.gpsX ?? null,
        gpsY: it.gpsY ?? null,
        serviceName: it.serviceName ?? null,
      });
    }

    if (list.length < perPage) break; // 마지막 페이지
    page += 1;
  }

  return all;
}

/** serviceTp=A로 받은 목록에서 전시만 남긴다. */
export function onlyExhibitions(events: CultureEvent[]): CultureEvent[] {
  return events.filter(
    (e) => e.realmName && EXHIBITION_REALMS.some((r) => e.realmName!.includes(r))
  );
}

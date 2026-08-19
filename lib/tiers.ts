import { supabaseAnon } from "./supabase";
import type { Artist, AxisKey, TierKey } from "./data";

/**
 * 순수 언급량 기반 3단계 분류.
 * 전시 이력(제도점수) 없이 signals(뉴스+영상 언급)만으로 나눈다.
 *
 * 기준은 초기 추정값이다 — 실제 데이터가 쌓이면 조정이 필요하다.
 *   ROOKIE      : 첫 언급이 14일 이내 (레이더에 새로 잡힌 이름)
 *   ESTABLISHED : 최근 8주 중 3주 이상 언급됨 (꾸준함)
 *   RISING      : 나머지 — 이번 주 언급이 있는 모두
 * 최근 14일간 언급이 전혀 없는 작가는 목록에서 제외한다(트렌딩이 아니게 되므로).
 */

const ROOKIE_WINDOW_DAYS = 14;
const CONSISTENCY_WEEKS_LOOKBACK = 8;
const CONSISTENCY_WEEKS_REQUIRED = 3;

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7; // 월요일=0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export async function computeTiers(): Promise<{
  established: Artist[];
  rising: Artist[];
  rookie: Artist[];
  hasData: boolean;
}> {
  const db = supabaseAnon();
  const empty = { established: [], rising: [], rookie: [], hasData: false };
  if (!db) return empty;

  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - CONSISTENCY_WEEKS_LOOKBACK * 7);

  const { data: rows, error } = await db
    .from("signals")
    .select("artist_id, axis, value, weight, occurred_on")
    .in("axis", ["discourse", "attention"])
    .gte("occurred_on", since.toISOString().slice(0, 10));

  if (error || !rows || rows.length === 0) return empty;

  const day = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const thisWeekStart = day(7);
  const lastWeekStart = day(14);
  const rookieCutoff = day(ROOKIE_WINDOW_DAYS);
  const activeCutoff = day(14);

  type Bucket = {
    thisWeek: number;
    lastWeek: number;
    discourse: number;
    attention: number;
    firstSeen: string;
    lastSeen: string;
    weeks: Set<string>;
  };
  const byArtist = new Map<string, Bucket>();

  for (const r of rows) {
    const w = (r.value ?? 1) * (r.weight ?? 1);
    const b =
      byArtist.get(r.artist_id) ??
      ({
        thisWeek: 0,
        lastWeek: 0,
        discourse: 0,
        attention: 0,
        firstSeen: r.occurred_on,
        lastSeen: r.occurred_on,
        weeks: new Set<string>(),
      } as Bucket);

    if (r.occurred_on >= thisWeekStart) b.thisWeek += w;
    else if (r.occurred_on >= lastWeekStart) b.lastWeek += w;

    if (r.axis === "discourse") b.discourse += w;
    if (r.axis === "attention") b.attention += w;

    if (r.occurred_on < b.firstSeen) b.firstSeen = r.occurred_on;
    if (r.occurred_on > b.lastSeen) b.lastSeen = r.occurred_on;
    b.weeks.add(isoWeekKey(r.occurred_on));

    byArtist.set(r.artist_id, b);
  }

  // 최근 14일간 활동 없는 작가는 제외
  const activeIds = [...byArtist.entries()]
    .filter(([, b]) => b.lastSeen >= activeCutoff)
    .map(([id]) => id);

  if (activeIds.length === 0) return empty;

  const { data: artists } = await db
    .from("artists")
    .select("id,name_ko,name_en,nationality")
    .in("id", activeIds);

  const nameOf = new Map((artists ?? []).map((a) => [a.id, a]));

  // 시각화용 0~100 스케일. 원값이 작아(대부분 한 자리 수) 배율을 적용한다.
  // 초기 추정값이며, 실제 분포를 보고 조정이 필요하다.
  const toBar = (v: number) => Math.min(100, Math.round(v * 15));

  const toArtist = (id: string, tier: TierKey): Artist => {
    const b = byArtist.get(id)!;
    const info = nameOf.get(id);
    const scores: Record<AxisKey, number> = {
      market: 0,
      institution: 0,
      discourse: toBar(b.discourse),
      attention: toBar(b.attention),
    };
    return {
      id,
      name: info?.name_ko ?? info?.name_en ?? "이름 미상",
      sub: `이번 주 ${b.thisWeek}회 언급`,
      tier,
      scores,
    };
  };

  const established: Artist[] = [];
  const rising: Artist[] = [];
  const rookie: Artist[] = [];

  for (const id of activeIds) {
    const b = byArtist.get(id)!;
    if (b.firstSeen >= rookieCutoff) {
      rookie.push(toArtist(id, "rookie"));
    } else if (b.weeks.size >= CONSISTENCY_WEEKS_REQUIRED) {
      established.push(toArtist(id, "established"));
    } else {
      rising.push(toArtist(id, "rising"));
    }
  }

  established.sort((a, b) => b.scores.discourse + b.scores.attention - (a.scores.discourse + a.scores.attention));
  rising.sort((a, b) => b.scores.discourse + b.scores.attention - (a.scores.discourse + a.scores.attention));
  rookie.sort((a, b) => b.scores.discourse + b.scores.attention - (a.scores.discourse + a.scores.attention));

  return {
    established: established.slice(0, 8),
    rising: rising.slice(0, 8),
    rookie: rookie.slice(0, 8),
    hasData: true,
  };
}

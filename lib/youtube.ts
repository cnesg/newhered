import type { Scope } from "./data";

export type Video = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  published: string | null;
  url: string;
  seconds: number | null;
  kind: "long" | "short";
};

/**
 * 이 길이 이하를 숏츠로 본다.
 * YouTube API는 숏츠 여부를 직접 알려주지 않아 길이로 추정한다.
 * 숏츠 상한이 3분이라 그보다 짧은 일반 영상이 섞일 수 있다.
 */
export const SHORT_MAX_SECONDS = 100;

/**
 * 채널을 지정하면 업로드 목록에서 가져온다(호출당 1 유닛).
 * 채널이 없거나 실패하면 키워드 검색으로 넘어간다(호출당 100 유닛).
 */
type ChannelSource = { id: string; name: string; scope: Scope };

/**
 * channelId(UC로 시작)를 쓴다. 업로드 재생목록 ID는 UC를 UU로 바꾼 값이라
 * 별도 조회 없이 바로 얻을 수 있다. 채널당 1 유닛만 든다.
 *
 * 채널을 추가하려면 유튜브 채널 페이지에서 채널 ID를 찾아 아래에 한 줄 넣는다.
 */
export const CHANNELS: ChannelSource[] = [
  // 국내 — 대중 해설
  { id: "UCZr3cu75jx6Sz-6KRQ50ySA", name: "널 위한 문화예술", scope: "kr" },
  { id: "UCMwv4_GnA-3bcA893rPUSow", name: "미미상인", scope: "kr" },
  { id: "UCujNXKViY2P-YPpCHGTj3yA", name: "할미아트", scope: "kr" },
  // 국내 — 미술관
  { id: "UCzjCoCi2g2_kWhQusUOYF5w", name: "국립현대미술관", scope: "kr" },
  { id: "UC4CIotqM68CV_GpdfGLoQ8A", name: "서울시립미술관", scope: "kr" },
  { id: "UCyXVnJijxHsBrzN9AAZ-Yxw", name: "리움미술관", scope: "kr" },
  // 국내 — 페어·비엔날레
  { id: "UCWlaQnXZH-HFFDwm4iYiBKw", name: "Kiaf SEOUL", scope: "kr" },
  { id: "UCEFfw-62uplv0uv7ElJvOgw", name: "ART BUSAN", scope: "kr" },
  { id: "UCHzBoXEehNQRTrX5kRAtAhA", name: "광주비엔날레", scope: "kr" },
  // 국내 — 시장
  { id: "UC6IGHgvHFr0yOuEvzw-rqnw", name: "케이옥션", scope: "kr" },
  { id: "UCzVwaQ3T0kDT-2EFBrvf03Q", name: "서울옥션", scope: "kr" },

  // 해외 — 미술관
  { id: "UC9CswYtb5rL31CHwyVoyJvQ", name: "MoMA", scope: "intl" },
  { id: "UC2isDei-lrNSrgGYE4Np3PA", name: "Tate", scope: "intl" },
  { id: "UCrPOgNsUldOtQsTf9Kjlm_A", name: "The National Gallery", scope: "intl" },
  // 해외 — 작가 인터뷰·해설
  { id: "UCY2mhw-XNZSxrUynsI5K8Zw", name: "Louisiana Channel", scope: "intl" },
  { id: "UCePDFpCr78_qmVtpoB1Axaw", name: "Great Art Explained", scope: "intl" },
  { id: "UCmQThz1OLYt8mb2PU540LOA", name: "The Art Assignment", scope: "intl" },
  // 해외 — 페어·시장
  { id: "UCBtGVupR621ytCdSG-z7jqQ", name: "Art Basel", scope: "intl" },
  { id: "UCuq2_UpzU5wdK22jTuW8www", name: "Frieze", scope: "intl" },
  { id: "UCelkSnSbxvIfjjD01uPHHbg", name: "Sotheby's", scope: "intl" },
  { id: "UCSbY5GF1eSKtT6d32qC7Krw", name: "Christie's", scope: "intl" },
];

export const QUERIES: Record<Scope, string> = {
  kr: "미술 전시 리뷰",
  intl: "contemporary art exhibition",
};

const API = "https://www.googleapis.com/youtube/v3";
const DAY = 86400;

/** PT1M30S -> 90 */
function parseDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const [, h, min, sec] = m;
  return Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(sec ?? 0);
}

function cacheOpts(): RequestInit {
  return { next: { revalidate: DAY, tags: ["videos"] } } as RequestInit;
}

function pickThumb(t: Record<string, { url: string }> | undefined): string {
  if (!t) return "";
  return t.medium?.url ?? t.high?.url ?? t.default?.url ?? "";
}

/** channelId를 업로드 재생목록 ID로 바꾼다. 조회가 필요 없다. */
function uploadsOf(channelId: string): string {
  return "UU" + channelId.slice(2);
}

async function fromPlaylist(
  playlistId: string,
  key: string,
  max: number,
  signal: AbortSignal
): Promise<Video[]> {
  const url = `${API}/playlistItems?part=snippet&maxResults=${max}&playlistId=${playlistId}&key=${key}`;
  const res = await fetch(url, { signal, ...cacheOpts() });
  if (!res.ok) return [];
  const json = await res.json();

  return (json.items ?? [])
    .map((item: any) => {
      const s = item.snippet ?? {};
      const id = s.resourceId?.videoId;
      if (!id || s.title === "Private video" || s.title === "Deleted video") {
        return null;
      }
      return {
        id,
        title: s.title ?? "",
        channel: s.channelTitle ?? "",
        thumbnail: pickThumb(s.thumbnails),
        published: s.publishedAt ?? null,
        url: `https://www.youtube.com/watch?v=${id}`,
        seconds: null,
        kind: "long",
      } as Video;
    })
    .filter(Boolean) as Video[];
}

async function fromSearch(
  query: string,
  key: string,
  max: number,
  signal: AbortSignal
): Promise<Video[]> {
  const url =
    `${API}/search?part=snippet&type=video&order=date&maxResults=${max}` +
    `&q=${encodeURIComponent(query)}&key=${key}`;
  const res = await fetch(url, { signal, ...cacheOpts() });
  if (!res.ok) return [];
  const json = await res.json();

  return (json.items ?? [])
    .map((item: any) => {
      const id = item.id?.videoId;
      const s = item.snippet ?? {};
      if (!id) return null;
      return {
        id,
        title: s.title ?? "",
        channel: s.channelTitle ?? "",
        thumbnail: pickThumb(s.thumbnails),
        published: s.publishedAt ?? null,
        url: `https://www.youtube.com/watch?v=${id}`,
        seconds: null,
        kind: "long",
      } as Video;
    })
    .filter(Boolean) as Video[];
}

/** 최대 50개씩 묶어 길이를 조회하고 숏츠 여부를 채운다. 호출당 1 유닛. */
async function classify(
  videos: Video[],
  key: string,
  signal: AbortSignal
): Promise<Video[]> {
  if (!videos.length) return videos;

  const durations = new Map<string, number | null>();

  for (let i = 0; i < videos.length; i += 50) {
    const ids = videos.slice(i, i + 50).map((v) => v.id).join(",");
    const url = `${API}/videos?part=contentDetails&id=${ids}&key=${key}`;
    try {
      const res = await fetch(url, { signal, ...cacheOpts() });
      if (!res.ok) continue;
      const json = await res.json();
      for (const item of json.items ?? []) {
        durations.set(item.id, parseDuration(item.contentDetails?.duration));
      }
    } catch {
      // 이 묶음만 건너뛴다. 길이를 모르면 일반 영상으로 둔다.
    }
  }

  return videos.map((v) => {
    const seconds = durations.get(v.id) ?? null;
    return {
      ...v,
      seconds,
      kind:
        seconds !== null && seconds <= SHORT_MAX_SECONDS
          ? ("short" as const)
          : ("long" as const),
    };
  });
}

/**
 * 한 채널이 목록을 독점하지 않게 채널당 상한을 두고 고르게 뽑는다.
 * 최신순만 쓰면 업로드가 잦은 채널 하나가 화면을 전부 차지한다.
 */
function diversify(videos: Video[], limit: number, perChannel = 2): Video[] {
  const used = new Map<string, number>();
  const picked: Video[] = [];

  for (const v of videos) {
    const n = used.get(v.channel) ?? 0;
    if (n >= perChannel) continue;
    used.set(v.channel, n + 1);
    picked.push(v);
    if (picked.length >= limit) return picked;
  }

  // 상한 때문에 자리가 남으면 남은 것으로 채운다
  for (const v of videos) {
    if (picked.length >= limit) break;
    if (!picked.includes(v)) picked.push(v);
  }
  return picked;
}

export async function collectVideos(
  scope: Scope,
  limit = 6,
  shortLimit = 10
): Promise<{ videos: Video[]; shorts: Video[]; configured: boolean }> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return { videos: [], shorts: [], configured: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const channels = CHANNELS.filter((c) => c.scope === scope);
    const perChannel = Math.max(3, Math.ceil(30 / Math.max(1, channels.length)));

    const results = await Promise.allSettled(
      channels.map((c) =>
        fromPlaylist(uploadsOf(c.id), key, perChannel, controller.signal)
      )
    );

    const collected: Video[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") collected.push(...r.value);
    }

    if (collected.length < limit + shortLimit) {
      try {
        collected.push(
          ...(await fromSearch(
            QUERIES[scope],
            key,
            15,
            controller.signal
          ))
        );
      } catch {
        // 검색 실패는 무시한다
      }
    }

    const seen = new Set<string>();
    const unique = collected.filter((v) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });

    unique.sort((a, b) => {
      if (!a.published) return 1;
      if (!b.published) return -1;
      return b.published.localeCompare(a.published);
    });

    const tagged = await classify(unique, key, controller.signal);

    return {
      videos: diversify(tagged.filter((v) => v.kind === "long"), limit, 2),
      shorts: diversify(tagged.filter((v) => v.kind === "short"), shortLimit, 3),
      configured: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

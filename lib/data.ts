export type Scope = "kr" | "intl";
export type AxisKey = "market" | "institution" | "discourse" | "attention";
export type TierKey = "established" | "rising" | "rookie";

export const AXES: { key: AxisKey; label: string }[] = [
  { key: "market", label: "시장" },
  { key: "institution", label: "제도" },
  { key: "discourse", label: "담론" },
  { key: "attention", label: "관심" },
];

export const TIERS: { key: TierKey; label: string; desc: string }[] = [
  {
    key: "established",
    label: "ESTABLISHED",
    desc: "시장·제도 지표가 이미 안정된 구간",
  },
  {
    key: "rising",
    label: "RISING",
    desc: "최근 24개월 제도 지표가 가파르게 오른 구간",
  },
  {
    key: "rookie",
    label: "ROOKIE",
    desc: "첫 개인전·졸업전시·신진 페어 최초 등장",
  },
];

export type Artist = {
  id: string;
  name: string;
  sub: string;
  tier: TierKey;
  scores: Record<AxisKey, number>;
};

export type Keyword = { term: string; delta: string };
export type Abroad = { name: string; city: string; venue: string };
export type Video = { title: string; channel: string; views: string };
export type News = { title: string; source: string; time: string };

type Dataset = {
  regions: string[];
  keywords: Keyword[];
  artists: Artist[];
  abroad: Abroad[];
  abroadTitle: string;
  abroadNote: string;
  videos: Video[];
  news: News[];
};

export const DATA: Record<Scope, Dataset> = {
  kr: {
    regions: ["전체", "서울", "부산", "대구·광주", "제주"],
    keywords: [
      { term: "단색화 이후", delta: "+18" },
      { term: "텍스타일 회화", delta: "+42" },
      { term: "에코페미니즘", delta: "+27" },
      { term: "1980s 재발굴", delta: "+11" },
      { term: "AI 이미지 비평", delta: "+64" },
      { term: "퀴어 큐레이션", delta: "+23" },
    ],
    artists: [
      { id: "k1", name: "작가 A", sub: "회화 · 1962 · 국제갤러리", tier: "established", scores: { market: 94, institution: 88, discourse: 51, attention: 40 } },
      { id: "k2", name: "작가 B", sub: "조각 · 1955 · 갤러리현대", tier: "established", scores: { market: 87, institution: 79, discourse: 44, attention: 33 } },
      { id: "k3", name: "작가 C", sub: "회화 · 1971 · 학고재", tier: "established", scores: { market: 76, institution: 72, discourse: 58, attention: 29 } },
      { id: "k4", name: "작가 E", sub: "설치 · 1988 · 아트선재", tier: "rising", scores: { market: 31, institution: 86, discourse: 74, attention: 55 } },
      { id: "k5", name: "작가 F", sub: "영상 · 1990 · 두산갤러리", tier: "rising", scores: { market: 22, institution: 78, discourse: 81, attention: 47 } },
      { id: "k6", name: "작가 G", sub: "섬유 · 1985 · 금호미술관", tier: "rising", scores: { market: 38, institution: 71, discourse: 62, attention: 69 } },
      { id: "k7", name: "작가 I", sub: "첫 개인전 · P21", tier: "rookie", scores: { market: 8, institution: 44, discourse: 36, attention: 62 } },
      { id: "k8", name: "작가 J", sub: "졸업전시 · 한예종", tier: "rookie", scores: { market: 5, institution: 29, discourse: 21, attention: 58 } },
      { id: "k9", name: "작가 K", sub: "신진 페어 · 더프리뷰", tier: "rookie", scores: { market: 14, institution: 33, discourse: 40, attention: 45 } },
    ],
    abroadTitle: "K-artist abroad",
    abroadNote: "국적 KR × 전시지 해외",
    abroad: [
      { name: "작가 M", city: "Paris", venue: "그룹전 · 6월 개막" },
      { name: "작가 N", city: "London", venue: "개인전 · 기관" },
      { name: "작가 O", city: "New York", venue: "갤러리 개인전" },
      { name: "작가 P", city: "Venice", venue: "비엔날레 병행전" },
    ],
    videos: [
      { title: "이번 달 꼭 봐야 할 전시 5선", channel: "널 위한 문화예술", views: "12.4만" },
      { title: "작가 E 스튜디오 방문 인터뷰", channel: "미미상인", views: "3.1만" },
    ],
    news: [
      { title: "미술진흥법 시행 이후 화랑·경매사 유통 체계 개편 본격화", source: "아트조선", time: "2시간 전" },
      { title: "상반기 국내 경매 낙찰총액, 전년 대비 소폭 반등", source: "한국경제 아르떼", time: "5시간 전" },
      { title: "신진 작가 지원 레지던시 하반기 공모 일정 공개", source: "아트인사이트", time: "어제" },
      { title: "서울 신생 공간 3곳, 공동 기획전으로 첫 연대", source: "월간미술", time: "어제" },
    ],
  },
  intl: {
    regions: ["전체", "New York", "London", "Paris·Berlin", "Hong Kong·Shanghai", "Tokyo"],
    keywords: [
      { term: "post-internet 회귀", delta: "+35" },
      { term: "figurative painting", delta: "+19" },
      { term: "indigenous futurism", delta: "+52" },
      { term: "ceramics revival", delta: "+31" },
      { term: "estate 재평가", delta: "+14" },
      { term: "climate curating", delta: "+40" },
    ],
    artists: [
      { id: "i1", name: "Artist A", sub: "Painting · 1958 · blue-chip", tier: "established", scores: { market: 97, institution: 91, discourse: 60, attention: 48 } },
      { id: "i2", name: "Artist B", sub: "Sculpture · 1964 · mega gallery", tier: "established", scores: { market: 89, institution: 84, discourse: 55, attention: 37 } },
      { id: "i3", name: "Artist C", sub: "Photo · 1970 · estate", tier: "established", scores: { market: 80, institution: 76, discourse: 49, attention: 26 } },
      { id: "i4", name: "Artist E", sub: "Installation · 1987 · biennale", tier: "rising", scores: { market: 34, institution: 90, discourse: 78, attention: 58 } },
      { id: "i5", name: "Artist F", sub: "Textile · 1992 · Turner shortlist", tier: "rising", scores: { market: 27, institution: 82, discourse: 85, attention: 63 } },
      { id: "i6", name: "Artist G", sub: "Video · 1989 · museum solo", tier: "rising", scores: { market: 41, institution: 74, discourse: 66, attention: 51 } },
      { id: "i7", name: "Artist I", sub: "First solo · NADA", tier: "rookie", scores: { market: 11, institution: 47, discourse: 39, attention: 66 } },
      { id: "i8", name: "Artist J", sub: "MFA show · RCA", tier: "rookie", scores: { market: 6, institution: 31, discourse: 25, attention: 54 } },
      { id: "i9", name: "Artist K", sub: "Liste debut", tier: "rookie", scores: { market: 16, institution: 36, discourse: 43, attention: 42 } },
    ],
    abroadTitle: "Seoul now",
    abroadNote: "국적 해외 × 전시지 KR",
    abroad: [
      { name: "Artist M", city: "Seoul", venue: "해외 갤러리 서울점" },
      { name: "Artist N", city: "Seoul", venue: "미술관 개인전" },
      { name: "Artist O", city: "Busan", venue: "비엔날레 커미션" },
      { name: "Artist P", city: "Seoul", venue: "페어 솔로 부스" },
    ],
    videos: [
      { title: "Fair report: what sold on preview day", channel: "Art media", views: "88K" },
      { title: "Studio visit with Artist F", channel: "Art media", views: "24K" },
    ],
    news: [
      { title: "Annual market report points to a softer top end, steadier mid-market", source: "The Art Newspaper", time: "3h ago" },
      { title: "Major museum announces survey of overlooked textile practices", source: "Artforum", time: "6h ago" },
      { title: "Emerging-focused fair expands its solo-booth section", source: "Ocula", time: "Yesterday" },
      { title: "Prize shortlist skews younger than any previous edition", source: "Frieze", time: "Yesterday" },
    ],
  },
};

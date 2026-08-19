import type { Scope } from "./data";

export type Feed = {
  source: string;
  url: string;
  scope: Scope;
  /**
   * true면 미술 관련 항목만 걸러낸다. 종합 문화면 피드에 쓴다.
   * 미술 전문 매체는 false로 두어 전부 통과시킨다.
   */
  filter: boolean;
};

export const FEEDS: Feed[] = [
  // 국내 — 미술 전문
  { source: "한국미술신문", url: "https://www.kmisul.com/rss/allArticle.xml", scope: "kr", filter: false },

  // 국내 — 종합·경제지 문화면 (미술 기사만 추출)
  { source: "뉴시스", url: "https://www.newsis.com/RSS/culture.xml", scope: "kr", filter: true },
  { source: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/culture_news.xml", scope: "kr", filter: true },
  { source: "한국경제", url: "https://www.hankyung.com/feed/life", scope: "kr", filter: true },
  { source: "프레시안", url: "https://www.pressian.com/api/v3/site/rss/section/66", scope: "kr", filter: true },

  // 해외 — 시장·업계
  { source: "The Art Newspaper", url: "https://www.theartnewspaper.com/rss.xml", scope: "intl", filter: false },
  { source: "Artnet Market", url: "https://news.artnet.com/market/feed", scope: "intl", filter: false },
  { source: "Artnet News", url: "https://news.artnet.com/feed", scope: "intl", filter: false },
  { source: "ARTnews", url: "https://www.artnews.com/feed/", scope: "intl", filter: false },
  { source: "Artforum", url: "https://www.artforum.com/feed/", scope: "intl", filter: false },
  { source: "Artdaily", url: "https://www.artdaily.cc/rss.asp", scope: "intl", filter: false },

  // 해외 — 비평·담론
  { source: "Hyperallergic", url: "https://hyperallergic.com/feed/", scope: "intl", filter: false },
  { source: "Art in America", url: "https://www.artnews.com/c/art-in-america/feed/", scope: "intl", filter: false },

  // 해외 — 시각문화·신진
  { source: "Colossal", url: "https://www.thisiscolossal.com/feed/", scope: "intl", filter: false },
  { source: "Juxtapoz", url: "https://www.juxtapoz.com/news/?format=feed&type=rss", scope: "intl", filter: false },
  { source: "designboom", url: "https://www.designboom.com/art/feed/", scope: "intl", filter: false },

  // 해외 — 권위지 (전문 평론·담론)
  { source: "Frieze", url: "https://feeds.feedburner.com/frieze", scope: "intl", filter: false },
  { source: "Elephant", url: "https://elephant.art/feed/", scope: "intl", filter: false },
  { source: "ArtAsiaPacific", url: "https://artasiapacific.com/feed/", scope: "intl", filter: false },
  { source: "Artsy", url: "https://www.artsy.net/rss/news", scope: "intl", filter: false },

  // 해외 — 현지어 매체 (해당 국가 자체 언론)
  { source: "Artribune", url: "https://www.artribune.com/feed/", scope: "intl", filter: false },
];

/** 이 중 하나라도 있으면 미술 기사로 본다. */
export const ART_TERMS = [
  "미술", "미술관", "갤러리", "화랑", "전시회", "개인전", "기획전",
  "비엔날레", "아트페어", "프리즈", "키아프", "아트바젤",
  "경매", "옥션", "낙찰", "출품작",
  "회화", "조각가", "설치미술", "作品展", "작품전", "도예", "공예",
  "컬렉터", "큐레이터", "작가전", "레지던시",
  "리움", "국립현대미술관", "서울시립미술관", "아트선재", "예술경영지원센터",
];

/** 위 단어가 있어도 이 맥락이면 제외한다. */
export const BLOCK_TERMS = [
  "부동산 경매", "법원 경매", "차량 경매", "중고차 경매",
  "아이돌", "드라마", "웹툰", "뮤지컬", "앨범", "가요", "예능",
  "웹소설", "게임 출시",
];

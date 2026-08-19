/**
 * 해외 뉴스 기사를 국가별로 자동 태깅한다.
 * 국내(kr) 스코프는 이미 전부 국내라 태깅이 필요 없다 — 해외(intl)에만 적용.
 * 완벽한 지오코딩이 아니라 텍스트 맥락으로 판단하는 것이라, 본문에 국가가
 * 드러나지 않으면 "기타/글로벌"로 남는다.
 */

export const COUNTRY_LABELS: Record<string, string> = {
  US: "미국",
  GB: "영국",
  FR: "프랑스",
  DE: "독일",
  IT: "이탈리아",
  ES: "스페인",
  CH: "스위스",
  NL: "네덜란드",
  JP: "일본",
  CN: "중국",
  HK: "홍콩",
  TW: "대만",
  CA: "캐나다",
  AU: "호주",
  SG: "싱가포르",
  AE: "아랍에미리트",
  KR: "한국",
  XX: "기타/글로벌",
};

const MODEL = "claude-haiku-4-5-20251001";

export async function classifyArticleCountries(
  articles: { id: string; text: string }[]
): Promise<Record<string, string>> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || articles.length === 0) return {};

  const lines = articles.map((a, i) => `[${i}] ${a.text}`).join("\n");
  const codes = Object.keys(COUNTRY_LABELS).filter((c) => c !== "XX").join(", ");

  const prompt = `아래는 해외 미술 뉴스 제목·요약 목록이다. 각 기사가 주로 다루는
나라를 판단해 ISO 국가코드로 답하라. 사용 가능한 코드: ${codes}, 그리고 특정 국가로
단정할 수 없으면 "XX".

기준: 다뤄지는 미술관·갤러리·경매·작가의 활동 무대가 있는 나라. 여러 나라가 섞여
있으면 가장 중심이 되는 곳 하나만 고른다. 애매하면 "XX".

반드시 JSON만 출력한다. 다른 설명 없이.
{"countries": [{"itemIndex": 0, "code": "US"}, ...]}

--- 목록 ---
${lines}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(20000),
      // RSS 캐시와 같은 주기로 캐시한다 — 이게 없으면 페이지를 열 때마다
      // Claude API가 호출된다. 기사 목록이 같으면(하루 동안 그렇다) 같은
      // 요청으로 취급되어 캐시가 재사용된다.
      next: { revalidate: 86400, tags: ["news"] },
    } as RequestInit);
    if (!res.ok) return {};

    const json = await res.json();
    const text: string = json?.content?.find((c: any) => c.type === "text")?.text ?? "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      countries?: { itemIndex: number; code: string }[];
    };

    const out: Record<string, string> = {};
    for (const c of parsed.countries ?? []) {
      const item = articles[c.itemIndex];
      if (!item) continue;
      out[item.id] = COUNTRY_LABELS[c.code] ? c.code : "XX";
    }
    return out;
  } catch {
    return {};
  }
}

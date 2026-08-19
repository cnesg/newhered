/**
 * 일본어·프랑스어 등 원문 기사 제목을 한국어로 번역한다.
 * Gemini API를 쓴다 — Vercel에 어떤 이름으로 키를 저장했는지 확실하지 않아
 * 흔히 쓰이는 이름 몇 개를 다 확인한다.
 */

function geminiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_KEY ||
    null
  );
}

export type Translatable = { id: string; text: string };

export async function translateToKorean(
  items: Translatable[]
): Promise<Record<string, string>> {
  const key = geminiKey();
  if (!key || items.length === 0) return {};

  const capped = items.slice(0, 40);
  const lines = capped.map((it, i) => `[${i}] ${it.text}`).join("\n");

  const prompt = `아래 미술 뉴스 제목들을 자연스러운 한국어로 번역하라. 고유명사(작가명·
기관명)는 한국에서 통용되는 표기가 있으면 그것을 쓰고, 없으면 원문 발음을 한글로
음역한다. 번호를 반드시 유지한다.

반드시 JSON만 출력한다. 다른 설명 없이.
{"translations": [{"itemIndex": 0, "ko": "번역된 제목"}, ...]}

--- 목록 ---
${lines}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
        signal: AbortSignal.timeout(20000),
        next: { revalidate: 86400, tags: ["news"] },
      } as RequestInit
    );
    if (!res.ok) return {};

    const json = await res.json();
    const text: string =
      json?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text ?? "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      translations?: { itemIndex: number; ko: string }[];
    };

    const out: Record<string, string> = {};
    for (const t of parsed.translations ?? []) {
      const item = capped[t.itemIndex];
      if (item && t.ko) out[item.id] = t.ko;
    }
    return out;
  } catch {
    return {};
  }
}

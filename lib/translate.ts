// artrend/lib/translate.ts

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
  
  if (!key) {
    console.error("[번역 에러] Vercel 환경변수에서 API 키를 찾을 수 없습니다.");
    return {};
  }
  if (items.length === 0) return {};

  // 뉴스 개수를 40개에서 20개로 줄이는 것을 권장합니다 (Vercel 10초 타임아웃 방지)
  const capped = items.slice(0, 20); 
  const lines = capped.map((it, i) => `[${i}] ${it.text}`).join("\n");

  const prompt = `아래 미술 뉴스 제목들을 자연스러운 한국어로 번역하라. 고유명사(작가명·
기관명)는 한국에서 통용되는 표기가 있으면 그것을 쓰고, 없으면 원문 발음을 한글로
음역한다. 번호를 반드시 유지한다.

--- 목록 ---
${lines}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          // 💡 Gemini API의 JSON 응답 모드 강제 적용 (정규식 제거 필요 없음)
          generationConfig: { 
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                translations: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      itemIndex: { type: "INTEGER" },
                      ko: { type: "STRING" }
                    }
                  }
                }
              }
            }
          }
        }),
        // Vercel 타임아웃에 맞춰 안전하게 9초로 설정
        signal: AbortSignal.timeout(9000), 
        cache: "no-store",
        
        //있다고쳐
        //next: { revalidate: 86400, tags: ["news"] },
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[번역 API HTTP 에러] ${res.status}:`, errorText);
      return {};
    }

    const json = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    
    // JSON 모드를 썼으므로 바로 파싱
    const parsed = JSON.parse(text) as {
      translations?: { itemIndex: number; ko: string }[];
    };

    const out: Record<string, string> = {};
    for (const t of parsed.translations ?? []) {
      const item = capped[t.itemIndex];
      if (item && t.ko) out[item.id] = t.ko;
    }
    return out;

  } catch (error) {
    console.error("[번역 처리 중 예외 발생]:", error);
    return {};
  }
}

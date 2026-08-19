function geminiKey(): string | null {
  return (
    process.env.GOOGLE_API_KEY ||
    null
  );
}

export type Translatable = { id: string; text: string };

export async function translateToKorean(
  items: Translatable[]
): Promise<Record<string, string>> {
  const key = geminiKey();
  
  if (!key) {
    console.error("[번역 에러] API 키가 없습니다.");
    return {};
  }
  if (items.length === 0) return {};

  const capped = items.slice(0, 10); // 타임아웃 방지를 위해 일단 10개로 확 줄임
  const lines = capped.map((it, i) => `[${i}] ${it.text}`).join("\n");

  const prompt = `아래 미술 뉴스 제목들을 자연스러운 한국어로 번역하라. 번호를 반드시 유지한다.
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
        signal: AbortSignal.timeout(9000), 
        cache: "no-store", // 💡 기존 캐시 설정을 지우고 무조건 새로 불러오게 강제!
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[API 에러] 상태코드 ${res.status}:`, errorText);
      return {};
    }

    const json = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(text);

    const out: Record<string, string> = {};
    for (const t of parsed.translations ?? []) {
      const item = capped[t.itemIndex];
      if (item && t.ko) out[item.id] = t.ko;
    }
    return out;

  } catch (error) {
    console.error("[번역 코드 실행 중 에러]:", error);
    return {};
  }
}

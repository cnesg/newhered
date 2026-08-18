/**
 * 뉴스·영상 텍스트에서 "미술 작가로 언급된 사람 이름"만 뽑아낸다.
 * 정규식이나 사전 목록으로는 신뢰도가 낮아 Claude에게 시킨다.
 * 큐레이터·갤러리스트·컬렉터는 제외하고 실제로 작업하는 작가만 남긴다.
 */

export type MentionSource = {
  id: string;
  text: string; // 제목 + 요약(있으면)
  kind: "news" | "video";
  source: string; // 매체명/채널명
  url: string;
  date: string | null; // ISO
};

export type ExtractedMention = {
  itemId: string;
  nameKo: string | null;
  nameEn: string | null;
};

const MODEL = "claude-haiku-4-5-20251001";

function buildPrompt(items: MentionSource[]): string {
  const lines = items
    .map((it, i) => `[${i}] (${it.kind}/${it.source}) ${it.text}`)
    .join("\n");

  return `아래는 오늘 수집된 미술 관련 뉴스 제목·요약과 유튜브 영상 제목 목록이다.
각 항목에서 "현재 작업 활동을 하는 미술 작가(화가, 조각가, 설치·미디어 작가 등)"의
이름이 언급되었으면 뽑아라.

제외할 것: 큐레이터, 갤러리 대표/딜러, 컬렉터, 평론가, 미술관장 — 이들이 작가를
겸하지 않는 한 포함하지 않는다. 확실하지 않으면 포함하지 않는다.

각 항목의 번호(인덱스)를 반드시 유지해서, 어느 항목에서 나온 이름인지 알 수 있게 해라.
같은 항목에 여러 작가가 언급되면 모두 포함한다. 언급된 작가가 없는 항목은 결과에서 뺀다.

이름은 본문에 쓰인 그대로의 한국어 이름(nameKo)을 우선하고, 알 수 있다면 영문 표기도
nameEn에 같이 써라. 모르면 null로 둔다.

반드시 아래 JSON 형식으로만 답하라. 다른 설명이나 코드블록 표시 없이 JSON만 출력한다.

{"mentions": [{"itemIndex": 0, "nameKo": "김민정", "nameEn": "Kim Minjung"}, ...]}

--- 목록 ---
${lines}`;
}

export async function extractArtistMentions(
  items: MentionSource[]
): Promise<ExtractedMention[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || items.length === 0) return [];

  // 토큰·비용을 위해 하루 배치당 상한을 둔다.
  const capped = items.slice(0, 150);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: buildPrompt(capped) }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}`);
  }

  const json = await res.json();
  const text: string = json?.content?.find((c: any) => c.type === "text")?.text ?? "";
  const cleaned = text.replace(/```json|```/g, "").trim();

  let parsed: { mentions?: { itemIndex: number; nameKo: string | null; nameEn: string | null }[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }

  const out: ExtractedMention[] = [];
  for (const m of parsed.mentions ?? []) {
    const item = capped[m.itemIndex];
    if (!item || !m.nameKo?.trim()) continue;
    out.push({ itemId: item.id, nameKo: m.nameKo.trim(), nameEn: m.nameEn?.trim() || null });
  }
  return out;
}

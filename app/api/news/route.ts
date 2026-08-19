// artrend/app/api/news/route.ts

export const dynamic = 'force-dynamic'; // 💡 이 줄을 무조건 추가하세요!

import { NextResponse } from "next/server";
import { collectNews } from "@/lib/rss";
import type { Scope } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * 기사 자체는 하루 한 번(07:00 KST)만 새로 가져온다.
 * 이 라우트는 매번 실행되지만 캐시된 피드를 읽으므로 비용이 거의 없다.
 */
export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get("scope");
  const scope: Scope = param === "intl" ? "intl" : "kr";

  try {
    const articles = await collectNews(scope);
    return NextResponse.json(
      { scope, count: articles.length, articles, fetchedAt: new Date().toISOString() },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { scope, count: 0, articles: [], error: "feed_unavailable" },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  }
}

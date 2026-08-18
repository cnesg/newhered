import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * 매일 07:00 KST(= 22:00 UTC)에 Vercel Cron이 호출한다.
 * 피드 캐시를 비워서 다음 방문자가 새 기사를 받게 한다.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  revalidateTag("news");
  revalidateTag("videos");

  return NextResponse.json({
    refreshed: true,
    at: new Date().toISOString(),
  });
}

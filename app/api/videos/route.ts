import { NextResponse } from "next/server";
import { collectVideos } from "@/lib/youtube";
import type { Scope } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get("scope");
  const scope: Scope = param === "intl" ? "intl" : "kr";

  try {
    const { videos, shorts, configured } = await collectVideos(scope);
    return NextResponse.json(
      { scope, configured, count: videos.length + shorts.length, videos, shorts },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { scope, configured: true, count: 0, videos: [], shorts: [] },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  }
}

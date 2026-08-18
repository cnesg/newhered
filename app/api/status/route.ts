import { NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * 연결 상태를 눈으로 확인하기 위한 진단 엔드포인트.
 * 아직 화면 어디에도 연결되지 않는다 — 배포 후 브라우저에서 직접 열어보는 용도.
 */
export async function GET() {
  const checks: Record<string, boolean | string | number> = {
    youtube: Boolean(process.env.YOUTUBE_API_KEY),
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_anon_key: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabase_service_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    culture_api_key: Boolean(process.env.CULTURE_API_KEY),
  };

  const client = supabaseAnon();
  if (client) {
    const { error, count } = await client
      .from("artists")
      .select("*", { count: "exact", head: true });
    checks.supabase_connection = error ? `error: ${error.message}` : "ok";
    checks.artists_table_rows = error ? -1 : (count ?? 0);
  } else {
    checks.supabase_connection = "not configured";
  }

  return NextResponse.json(checks, { headers: { "cache-control": "no-store" } });
}

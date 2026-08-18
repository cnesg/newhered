import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 브라우저·일반 요청에서 쓰는 클라이언트. anon 키라 RLS의 "public read" 정책만 통과한다.
 * 즉 이 클라이언트로는 절대 쓰기가 안 된다 — 안전하게 어디서든 써도 된다.
 */
export function supabaseAnon(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * 크론·배치 전용. service_role 키는 RLS를 완전히 우회하므로
 * 절대 클라이언트 번들에 들어가면 안 된다 — 서버 라우트에서만 import한다.
 */
export function supabaseService(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

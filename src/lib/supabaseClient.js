import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
}

/**
 * Supabase Client
 * - implicit flow 사용 (Navigator Lock 미사용으로 멀티탭 충돌 방지)
 * - 단순화된 localStorage 키
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    storageKey: "honsul-auth-token",
    // implicit flow는 Navigator Lock 사용 안 함 → INSERT 충돌 없음
    flowType: "implicit",
  },
});

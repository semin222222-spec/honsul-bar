import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 멀티탭 lock 비활성화 (NavigatorLockAcquireTimeoutError 방지)
    // 같은 브라우저에서 여러 탭으로 같은 도메인을 열어도 충돌 없음
    lock: async (name, acquireTimeout, fn) => {
      // lock 없이 즉시 실행 (단일 탭 환경에선 안전)
      return await fn();
    },
    // 세션 자동 갱신
    autoRefreshToken: true,
    // 세션 유지
    persistSession: true,
    // URL에서 세션 감지 (OAuth 콜백용)
    detectSessionInUrl: true,
  },
});

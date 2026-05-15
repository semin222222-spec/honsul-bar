import { createClient } from "@supabase/supabase-js";
import { installRealtimeRecovery } from "@/shared/realtime/realtimeHealth";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: async (name, acquireTimeout, fn) => {
      return await fn();
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  // 🆕 Realtime 백그라운드 끊김 방지
  realtime: {
    // ⭐ Web Worker로 heartbeat 전송 (브라우저 throttle 회피)
    // → 탭이 백그라운드여도 연결 유지됨
    worker: true,

    // heartbeat 간격 (기본 25초 → 15초로 단축)
    // → 끊김을 더 빨리 감지 + 더 자주 keep-alive
    heartbeatIntervalMs: 15000,

    // 끊김 감지 시 콜백 (디버깅용)
    heartbeatCallback: (status) => {
      if (
        status === "timeout" ||
        status === "disconnected" ||
        status === "error"
      ) {
        console.warn(`[Realtime] Heartbeat ${status} - 재연결 시도 중...`);
      }
    },
  },
});

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.__honsulRealtimeRecovery?.stop?.();
  window.__honsulRealtimeRecovery = installRealtimeRecovery(supabase, {
    checkIntervalMs: 30000,
  });
}

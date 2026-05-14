import { createClient } from "@supabase/supabase-js";

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
      if (status === "timeout" || status === "disconnected" || status === "error") {
        console.warn(`[Realtime] Heartbeat ${status} - 재연결 시도 중...`);
      }
    },
  },
});

// ─────────────────────────────────────────
// 🆕 자동 재연결 로직 (탭 다시 보이면 강제 재연결)
// ─────────────────────────────────────────
if (typeof window !== "undefined" && typeof document !== "undefined") {
  let lastVisibilityChangeTime = Date.now();
  let reconnectTimeout = null;

  const tryReconnect = () => {
    try {
      const channels = supabase.getChannels();
      const closedChannels = channels.filter(
        (ch) => ch.state === "closed" || ch.state === "errored"
      );

      if (closedChannels.length > 0) {
        console.log(`[Realtime] ${closedChannels.length}개 채널 재연결 시도`);
        // 끊긴 채널들 강제 재연결
        closedChannels.forEach((ch) => {
          try {
            ch.subscribe();
          } catch (err) {
            console.warn("[Realtime] 채널 재구독 실패:", err);
          }
        });
      }

      // WebSocket 자체가 끊겨있으면 강제 connect
      if (supabase.realtime && !supabase.realtime.isConnected()) {
        console.log("[Realtime] WebSocket 재연결");
        supabase.realtime.connect();
      }
    } catch (err) {
      console.warn("[Realtime] 재연결 중 오류:", err);
    }
  };

  // 1. 탭이 다시 보일 때 (가장 흔한 케이스)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const elapsed = Date.now() - lastVisibilityChangeTime;
      console.log(`[Realtime] 탭 활성화 (백그라운드 ${Math.round(elapsed / 1000)}초)`);

      // 너무 빠른 연속 호출 방지 (debounce)
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(() => {
        tryReconnect();
      }, 500);

      lastVisibilityChangeTime = Date.now();
    } else {
      lastVisibilityChangeTime = Date.now();
    }
  });

  // 2. 네트워크 다시 연결됐을 때
  window.addEventListener("online", () => {
    console.log("[Realtime] 네트워크 복구됨 - 재연결");
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(tryReconnect, 500);
  });

  // 3. 페이지 포커스 (탭 클릭 등)
  window.addEventListener("focus", () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(tryReconnect, 500);
  });

  // 4. 주기적 체크 (1분마다) - 안전망
  setInterval(() => {
    if (document.visibilityState === "visible") {
      try {
        if (supabase.realtime && !supabase.realtime.isConnected()) {
          console.log("[Realtime] 주기적 체크 - 연결 끊김 감지, 재연결");
          tryReconnect();
        }
      } catch (err) {
        // 무시
      }
    }
  }, 60000); // 60초마다
}

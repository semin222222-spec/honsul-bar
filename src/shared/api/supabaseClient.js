import { createClient } from "@supabase/supabase-js";
import { installRealtimeRecovery } from "@/shared/realtime/realtimeHealth";
import {
  recoverSharedRealtimeChannels,
  setSharedRealtimeClient,
} from "@/shared/realtime/sharedChannel";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
}

// ============================================================
// 두 개의 Supabase client를 분리하는 이유
// ------------------------------------------------------------
// supabase-js의 모든 REST 요청은 내부적으로 `_getAccessToken()`을 거치고,
// 이 함수는 기본적으로 `auth.getSession()`을 호출하며 GoTrueClient의 lock을
// 잡는다. 그런데 GoTrueClient는 visibilitychange 이벤트에 자기 리스너를 달고
// 탭이 visible로 돌아오면 자동으로 `_recoverAndRefresh()`를 시도하면서 lock을
// 잡는다. 이 refresh의 네트워크 호출이 Chrome stale HTTP/2 stream으로 가서
// hang되면 lock이 영원히 해제되지 않고, 그 사이 우리 REST 호출은 같은 lock의
// `pendingInLock`에서 무한 대기에 빠진다 (auth-js _acquireLock의 if-branch에
// timeout이 없음). 결과: tab 재활성 후 좌석 등 REST 데이터 미로드, 새로고침만
// 동작.
//
// 표준 우회 패턴: 데이터 client에 `accessToken` 옵션을 명시하면
// supabase-js가 `auth.getSession()`을 거치지 않고 그 함수만 await한다.
// 우리가 토큰을 *동기적으로 캐시*해두고 그걸 반환하면 lock 경로를 완전히
// 우회할 수 있다. 캐시는 인증 client의 onAuthStateChange로 갱신한다.
// ============================================================

// === 1) 인증 전용 client ===
// 로그인/세션/onAuthStateChange만 담당. REST 쿼리에는 쓰지 않는다.
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // lock override는 일부러 안 한다 (기본 Web Lock API 사용 — 크로스탭 안전성)
  },
});

// === 2) 동기 토큰 캐시 ===
// onAuthStateChange 콜백으로 갱신. 데이터 client의 accessToken 함수가 이걸
// 읽으므로, lock 경로를 거치지 않고 즉시 반환된다.
let cachedAccessToken = null;

// 초기 로드 시 한 번 세션을 읽어둔다 (이 호출은 모듈 로드 시점이라 lock 경합 없음)
supabaseAuth.auth
  .getSession()
  .then(({ data }) => {
    cachedAccessToken = data.session?.access_token ?? null;
  })
  .catch((err) => {
    console.warn("[supabaseClient] 초기 세션 로드 실패:", err);
  });

supabaseAuth.auth.onAuthStateChange((event, session) => {
  cachedAccessToken = session?.access_token ?? null;
});

// === 3) 데이터 전용 client ===
// REST/Realtime 호출에 사용. accessToken 옵션으로 auth.getSession() lock을 우회.
// supabase-js가 settings.accessToken을 받으면 내부 auth 모듈을 Proxy로 차단해서
// 이 client에서 .auth.* 호출은 throw됨 — 의도된 분리.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => cachedAccessToken ?? supabaseAnonKey,
  realtime: {
    // Web Worker로 heartbeat 전송 (백그라운드 throttle 회피)
    worker: true,
    heartbeatIntervalMs: 15000,
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

setSharedRealtimeClient(supabase);

// Realtime recovery는 데이터 client에만 설치 (인증 client는 realtime 안 씀)
if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.__honsulRealtimeRecovery?.stop?.();
  window.__honsulRealtimeRecovery = installRealtimeRecovery(supabase, {
    checkIntervalMs: 30000,
    recoverSharedChannels: recoverSharedRealtimeChannels,
  });
}

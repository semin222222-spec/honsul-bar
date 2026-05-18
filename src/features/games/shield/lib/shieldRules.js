/**
 * 5초 쉴드 초성 게임 규칙 (시간/인원/판정/lifecycle)
 *
 * 클라이언트 타이머는 UI용. 실제 시간 판정은 항상 current_turn_started_at 서버 시간 기준.
 */

const ENV_TURN_SECONDS = Number(import.meta?.env?.VITE_SHIELD_TURN_SECONDS);

// 한 차례에 주어지는 시간(초). 기본 5초.
export const TURN_SECONDS =
  Number.isFinite(ENV_TURN_SECONDS) && ENV_TURN_SECONDS > 0
    ? ENV_TURN_SECONDS
    : 5;

// "위험" UI 임계값 — 남은 초가 이 값 이하면 빨강 펄스
export const DANGER_THRESHOLD = 2;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

// 결과(우승) 화면이 30초 후 자동으로 방을 정리
export const RESULT_AUTO_DISMISS_MS = 30_000;

// 하트비트 주기
export const HEARTBEAT_MS = 30_000;

// 다른 플레이어 last_seen_at이 이 값보다 오래되면 좀비 → 자동 leave
export const ZOMBIE_THRESHOLD_MS = 90_000;

// 좀비 검사 주기
export const ZOMBIE_CHECK_MS = 30_000;

/**
 * 서버 시간 기준 남은 초 계산.
 *
 * @param {string} startedAt ISO timestamp
 * @param {number} [now] Date.now() (테스트용)
 * @returns {number} 0 이상의 남은 초 (소수 포함)
 */
export function calcSecondsLeft(startedAt, now = Date.now()) {
  if (!startedAt) return TURN_SECONDS;
  const startMs =
    typeof startedAt === "string" ? new Date(startedAt).getTime() : startedAt;
  const elapsed = Math.max(0, (now - startMs) / 1000);
  return Math.max(0, TURN_SECONDS - elapsed);
}

/**
 * 현재 차례 다음으로 alive인 player를 찾는다 (배열 순서 = 시계방향).
 * 못 찾으면 null.
 */
export function getNextAlivePlayer(players, currentSessionId) {
  if (!Array.isArray(players) || players.length === 0) return null;
  const currentIdx = players.findIndex(
    (p) => p.session_id === currentSessionId,
  );
  const start = currentIdx >= 0 ? currentIdx : -1;
  for (let step = 1; step <= players.length; step += 1) {
    const nextIdx = (start + step) % players.length;
    const cand = players[nextIdx];
    if (cand && cand.status === "alive") return cand;
  }
  return null;
}

export function countAlive(players) {
  if (!Array.isArray(players)) return 0;
  return players.filter((p) => p?.status === "alive").length;
}

/**
 * 라이어 게임 규칙 / lifecycle 상수
 *
 * 클라이언트 타이머는 UI용. 실제 시간 판정은 항상 speech_started_at 서버 시간 기준.
 */

const ENV_SPEECH_SECONDS = Number(
  import.meta?.env?.VITE_LIAR_SPEECH_SECONDS,
);
const ENV_TOTAL_LAPS = Number(import.meta?.env?.VITE_LIAR_TOTAL_LAPS);

// 1인당 한 차례 설명 시간(초). 기본 15초.
export const SPEECH_SECONDS =
  Number.isFinite(ENV_SPEECH_SECONDS) && ENV_SPEECH_SECONDS > 0
    ? ENV_SPEECH_SECONDS
    : 15;

// 각자 설명할 횟수 (= 바퀴 수). 기본 3바퀴.
export const TOTAL_LAPS =
  Number.isFinite(ENV_TOTAL_LAPS) && ENV_TOTAL_LAPS > 0 ? ENV_TOTAL_LAPS : 3;

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

// 결과 화면 자동 만료 (ms)
export const RESULT_AUTO_DISMISS_MS = 30_000;

// 하트비트 주기
export const HEARTBEAT_MS = 30_000;

// 좀비 임계값
export const ZOMBIE_THRESHOLD_MS = 90_000;
export const ZOMBIE_CHECK_MS = 30_000;

/**
 * 서버 시간 기준 남은 초 계산. 소수 포함.
 */
export function calcSpeechSecondsLeft(startedAt, now = Date.now()) {
  if (!startedAt) return SPEECH_SECONDS;
  const startMs =
    typeof startedAt === "string" ? new Date(startedAt).getTime() : startedAt;
  const elapsed = Math.max(0, (now - startMs) / 1000);
  return Math.max(0, SPEECH_SECONDS - elapsed);
}

/**
 * 현재 바퀴 계산 — 모든 player의 최소 speech_count + 1.
 * 모든 사람이 같은 바퀴를 끝낸 후에야 다음 바퀴로 진입한다고 가정.
 *
 * 단, 한 바퀴 내에서 일부만 끝낸 경우(예: 4명 중 2명만 1번)에는 여전히 그 바퀴.
 *
 * @param {Array} players
 * @param {number} totalLaps
 * @returns {number} 1..totalLaps
 */
export function getCurrentLap(players, totalLaps = TOTAL_LAPS) {
  if (!Array.isArray(players) || players.length === 0) return 1;
  const minCount = players.reduce(
    (m, p) => Math.min(m, p?.speech_count || 0),
    Infinity,
  );
  if (!Number.isFinite(minCount)) return 1;
  return Math.min(totalLaps, minCount + 1);
}

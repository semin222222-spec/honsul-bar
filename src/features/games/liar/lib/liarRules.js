/**
 * 라이어 게임 규칙 / lifecycle 상수
 *
 * 클라이언트 타이머는 UI용. 실제 시간 판정은 항상 speech_started_at 서버 시간 기준.
 */

const ENV_SPEECH_SECONDS = Number(
  import.meta?.env?.VITE_LIAR_SPEECH_SECONDS,
);

// 1인당 설명 시간(초). 기본 15초.
export const SPEECH_SECONDS =
  Number.isFinite(ENV_SPEECH_SECONDS) && ENV_SPEECH_SECONDS > 0
    ? ENV_SPEECH_SECONDS
    : 15;

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
 * 투표 결과 계산.
 *
 * @param {Array} players players 배열 (voted_for 포함)
 * @param {string} liarSessionId
 * @returns {{ accused_session_id: string|null, accused_seat_label: string|null,
 *             citizen_win: boolean, is_tie: boolean,
 *             vote_count: Object<string, number> }}
 */
export function computeVoteResult(players, liarSessionId) {
  const voteCount = {};
  for (const p of players || []) {
    const target = p?.voted_for;
    if (!target) continue;
    voteCount[target] = (voteCount[target] || 0) + 1;
  }

  const sorted = Object.entries(voteCount).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    return {
      accused_session_id: null,
      accused_seat_label: null,
      citizen_win: false,
      is_tie: true,
      vote_count: voteCount,
    };
  }

  const top = sorted[0][1];
  const topVoted = sorted.filter(([, n]) => n === top);
  const isTie = topVoted.length > 1;
  const accusedId = isTie ? null : topVoted[0][0];
  const accusedSeat = accusedId
    ? (players.find((p) => p.session_id === accusedId)?.seat_label || null)
    : null;
  const citizenWin = !isTie && accusedId === liarSessionId;

  return {
    accused_session_id: accusedId,
    accused_seat_label: accusedSeat,
    citizen_win: citizenWin,
    is_tie: isTie,
    vote_count: voteCount,
  };
}

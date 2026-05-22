/**
 * 콜 마이 네임 규칙 / lifecycle 상수 + 순수 함수
 *
 * - 자유 플레이(시간 제한 없음)라 드립/라이어 같은 페이즈 타이머가 없다.
 * - 정답 판정은 서버 RPC(call_my_name_attempt)가 최종이다. 클라이언트의
 *   normalizeGuess 는 입력 검증/표시용일 뿐, 점수 판정엔 쓰지 않는다.
 */

// 인원 (작업지시 강제: 2~8명)
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

// 라이프 (작업지시 강제: 3개)
export const INITIAL_LIVES = 3;

// 정답 입력 최대 길이
export const GUESS_MAX_LEN = 30;

// 결과(finished) 화면 자동 만료(ms) — 라이어/드립과 동일
export const RESULT_AUTO_DISMISS_MS = 30_000;

// 하트비트 / 좀비 정리 (라이어/드립과 동일)
export const HEARTBEAT_MS = 30_000;
export const ZOMBIE_THRESHOLD_MS = 90_000;
export const ZOMBIE_CHECK_MS = 30_000;

/**
 * 정답 비교용 정규화: 소문자 + 공백/특수문자 제거.
 * 서버 RPC 의 regexp_replace('[[:space:][:punct:]]') 와 동일한 의도.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeGuess(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

/**
 * 입력값 유효성 (제출 전 1차 검증). 빈 값/길이만 본다 — 정오답은 서버가 판정.
 *
 * @param {string} text
 * @returns {{ ok: boolean, value: string, error?: string }}
 */
export function validateGuess(text) {
  const value = String(text ?? "").trim();
  if (!value) return { ok: false, value, error: "정답을 입력해주세요" };
  if (value.length > GUESS_MAX_LEN)
    return { ok: false, value, error: `${GUESS_MAX_LEN}자 이내로 입력해주세요` };
  return { ok: true, value };
}

/**
 * player가 게임을 끝냈는지(더 이상 추리하지 않는 상태).
 * @param {{ status?: string }} player
 * @returns {boolean}
 */
export function isResolved(player) {
  const s = player?.status;
  return s === "solved" || s === "penalty";
}

/**
 * 전원이 해결(solved/penalty)됐는가 — 게임 종료 조건.
 * @param {Array} players
 * @returns {boolean}
 */
export function allResolved(players = []) {
  if (!Array.isArray(players) || players.length === 0) return false;
  return players.every(isResolved);
}

/**
 * 콜 마이 네임 규칙 / lifecycle 상수 + 순수 함수
 *
 * - 타임어택: 게임 시작(started_at) 기준으로 시간이 흐르고, 본인 화면에 힌트가 단계 공개된다.
 *   3분 카테고리 → 5분 글자 수 → 10분 초성 → 12분 시간 종료.
 * - 시간 판정은 항상 서버 시각(started_at) 기준 calcElapsedMs로 한다 (드립/라이어 타이머와 동일 철학).
 *   클라이언트 시계는 표시용일 뿐.
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

// ── 타임어택 / 힌트 임계값 ─────────────────────────────
// 테스트 편의를 위해 .env 로 초 단위 override 가능 (없으면 기본값).
function envMs(key, fallbackMs) {
  const sec = Number(import.meta?.env?.[key]);
  return Number.isFinite(sec) && sec > 0 ? sec * 1000 : fallbackMs;
}

// 3분: 카테고리 공개 / 5분: 글자 수 공개 / 10분: 초성 공개 / 12분: 시간 종료
export const HINT_CATEGORY_MS = envMs("VITE_CMN_HINT_CATEGORY_SEC", 3 * 60_000);
export const HINT_LENGTH_MS = envMs("VITE_CMN_HINT_LENGTH_SEC", 5 * 60_000);
export const HINT_CHOSEONG_MS = envMs("VITE_CMN_HINT_CHOSEONG_SEC", 10 * 60_000);
export const GAME_DURATION_MS = envMs("VITE_CMN_DURATION_SEC", 12 * 60_000);

// 힌트 단계 메타 (UI 잠금 카드 렌더용)
export const HINT_STAGES = [
  { key: "category", at: HINT_CATEGORY_MS, label: "카테고리" },
  { key: "length", at: HINT_LENGTH_MS, label: "글자 수" },
  { key: "choseong", at: HINT_CHOSEONG_MS, label: "초성" },
];

const CHOSEONG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

/**
 * 한글 문자열의 초성을 추출한다. (예: "유재석" → "ㅇㅈㅅ")
 * 한글 음절이 아니면(영문/숫자 등) 공백을 제외하고 그대로 둔다.
 *
 * @param {string} text
 * @returns {string}
 */
export function toChoseong(text) {
  let out = "";
  for (const ch of String(text ?? "")) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      out += CHOSEONG[Math.floor((code - 0xac00) / 588)];
    } else if (ch.trim() !== "") {
      out += ch;
    }
  }
  return out;
}

/**
 * 정답 글자 수 (서로게이트/공백 안전).
 * @param {string} answer
 * @returns {number}
 */
export function answerLength(answer) {
  return [...String(answer ?? "").trim()].filter((c) => c.trim() !== "").length;
}

/**
 * 서버 시작 시각 기준 경과 ms. started_at 없으면 0.
 * @param {string|number|null} startedAt
 * @param {number} now
 * @returns {number}
 */
export function calcElapsedMs(startedAt, now = Date.now()) {
  if (!startedAt) return 0;
  const start =
    typeof startedAt === "string" ? new Date(startedAt).getTime() : startedAt;
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, now - start);
}

/**
 * 경과 ms 기준으로 어떤 힌트가 열렸는지.
 * @param {number} elapsedMs
 * @returns {{ category: boolean, length: boolean, choseong: boolean }}
 */
export function getHintStage(elapsedMs) {
  return {
    category: elapsedMs >= HINT_CATEGORY_MS,
    length: elapsedMs >= HINT_LENGTH_MS,
    choseong: elapsedMs >= HINT_CHOSEONG_MS,
  };
}

/**
 * 타임어택 시간 종료 여부.
 * @param {number} elapsedMs
 * @returns {boolean}
 */
export function isTimeUp(elapsedMs) {
  return elapsedMs >= GAME_DURATION_MS;
}

/**
 * ms → "MM:SS" 시계 표기.
 * @param {number} ms
 * @returns {string}
 */
export function formatClock(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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

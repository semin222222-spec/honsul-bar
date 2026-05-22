/**
 * 익명 폭로전 규칙 / lifecycle 상수 + 순수 함수
 *
 * 다수결 패자 룰: 다수파=진실(안전), 소수파=거짓말(라이프 -1), 동률이면 아무도 -1 X.
 *
 * 클라이언트 타이머는 UI용일 뿐, 실제 시간 판정은 항상
 * 서버 시각(`phase_started_at`) 기준 `calcSecondsLeft`로 한다. (드립/라이어와 동일)
 *
 * ★ 익명성: 개별 투표(fold/pass)는 잠긴 테이블에만 있고 클라가 못 읽는다.
 *   본인의 안전/-1 여부는 "내가 던진 표 + 서버가 공개한 outcome"으로만 계산한다.
 *   집계(라이프 차감)는 서버 RPC(exposed_tally_round)가 수행한다 — 여기 함수는 그 규칙의
 *   클라이언트 표현/검증용 순수 버전이다(테스트로 SQL 로직과 일치를 보증).
 */

const ENV_INPUT_SECONDS = Number(import.meta?.env?.VITE_EXPOSED_INPUT_SECONDS);
const ENV_VOTE_SECONDS = Number(import.meta?.env?.VITE_EXPOSED_VOTE_SECONDS);

// 질문 입력 페이즈 시간(초). 기본 60초.
export const INPUT_SECONDS =
  Number.isFinite(ENV_INPUT_SECONDS) && ENV_INPUT_SECONDS > 0
    ? ENV_INPUT_SECONDS
    : 60;

// 투표 페이즈 시간(초). 기본 15초.
export const VOTE_SECONDS =
  Number.isFinite(ENV_VOTE_SECONDS) && ENV_VOTE_SECONDS > 0
    ? ENV_VOTE_SECONDS
    : 15;

export const QUESTION_MAX_LEN = 80;

export const MIN_PLAYERS = 2; // 반드시 2명부터
export const MAX_PLAYERS = 8;
export const START_LIVES = 5; // 각자 손가락 5개

export const SPICE_LEVELS = ["mild", "medium"]; // hot(19금) 없음

// 결과(finished) 화면 자동 만료(ms)
export const RESULT_AUTO_DISMISS_MS = 30_000;

// 결과 → 벌칙(EXPOSED) 자동 전환까지(ms) (탭으로 건너뛰기 가능)
export const PENALTY_REVEAL_MS = 4_000;

// 하트비트 / 좀비 정리 (드립/라이어와 동일)
export const HEARTBEAT_MS = 30_000;
export const ZOMBIE_THRESHOLD_MS = 90_000;
export const ZOMBIE_CHECK_MS = 30_000;

/**
 * 서버 시각 기준 남은 초. 소수 포함.
 *
 * @param {string|number|null} phaseStartedAt
 * @param {number} totalSeconds
 * @param {number} now
 * @returns {number}
 */
export function calcSecondsLeft(phaseStartedAt, totalSeconds, now = Date.now()) {
  if (!phaseStartedAt) return totalSeconds;
  const startMs =
    typeof phaseStartedAt === "string"
      ? new Date(phaseStartedAt).getTime()
      : phaseStartedAt;
  if (!Number.isFinite(startMs)) return totalSeconds;
  const elapsed = Math.max(0, (now - startMs) / 1000);
  return Math.max(0, totalSeconds - elapsed);
}

/**
 * 질문 텍스트 정규화 + 유효성. 80자 이내, 공백만이면 무효.
 *
 * @param {string} text
 * @returns {{ ok: boolean, value: string, error?: string }}
 */
export function validateQuestion(text) {
  const value = String(text ?? "").trim();
  if (!value) return { ok: false, value, error: "질문을 입력해주세요" };
  if (value.length > QUESTION_MAX_LEN)
    return { ok: false, value, error: `${QUESTION_MAX_LEN}자 이내로 적어주세요` };
  return { ok: true, value };
}

/**
 * 입력 페이즈 종료 조건: 모든 참가자가 질문을 제출했는가.
 *
 * @param {{ players: Array, submittedSessions: Array }} args
 * @returns {boolean}
 */
export function inputComplete({ players = [], submittedSessions = [] }) {
  if (players.length === 0) return false;
  const done = new Set(submittedSessions);
  return players.every((p) => done.has(p.session_id));
}

/**
 * 투표 페이즈 종료 조건: 살아있는 참가자가 모두 투표했는가.
 *  (탈락(penalty) 플레이어는 투표 대상에서 제외)
 *
 * @param {{ players: Array, votedSessions: Array }} args
 * @returns {boolean}
 */
export function voteComplete({ players = [], votedSessions = [] }) {
  const alive = players.filter((p) => p.status !== "penalty");
  if (alive.length === 0) return false;
  const voted = new Set(votedSessions);
  return alive.every((p) => voted.has(p.session_id));
}

/**
 * 한 라운드 투표 집계(클라이언트 표현용 / SQL 규칙의 순수 버전).
 *  - fold > pass → 다수파 fold(진실), 소수파 pass → outcome 'fold_majority', minority 'pass'
 *  - pass > fold → outcome 'pass_majority', minority 'fold'
 *  - 동률         → outcome 'tie', minority null (아무도 -1 X)
 *
 * @param {Array<{vote:'fold'|'pass'}>} votes
 * @returns {{ foldCount:number, passCount:number, outcome:string, minority:('fold'|'pass'|null), minorityCount:number }}
 */
export function tallyVotes(votes = []) {
  let foldCount = 0;
  let passCount = 0;
  for (const v of votes) {
    if (v?.vote === "fold") foldCount += 1;
    else if (v?.vote === "pass") passCount += 1;
  }
  if (foldCount > passCount)
    return {
      foldCount,
      passCount,
      outcome: "fold_majority",
      minority: "pass",
      minorityCount: passCount,
    };
  if (passCount > foldCount)
    return {
      foldCount,
      passCount,
      outcome: "pass_majority",
      minority: "fold",
      minorityCount: foldCount,
    };
  return {
    foldCount,
    passCount,
    outcome: "tie",
    minority: null,
    minorityCount: 0,
  };
}

/**
 * 내 결과: 내가 던진 표 + outcome 으로만 계산. (남의 표/라이프를 보지 않는다)
 *  - 동률            → 'draw'  (무승부, 안전)
 *  - 내 표 == 다수파 → 'safe'
 *  - 내 표 == 소수파 → 'lost'  (-1)
 *  - 내 표 모름      → 'unknown' (재접속 등)
 *
 * @param {('fold'|'pass'|null|undefined)} myVote
 * @param {string} outcome
 * @returns {('safe'|'lost'|'draw'|'unknown')}
 */
export function mySafety(myVote, outcome) {
  if (outcome === "tie") return "draw";
  if (myVote !== "fold" && myVote !== "pass") return "unknown";
  const majority = outcome === "fold_majority" ? "fold" : "pass";
  return myVote === majority ? "safe" : "lost";
}

/**
 * 라이프 0(탈락) 플레이어가 있는가.
 * @param {Array} players
 * @returns {boolean}
 */
export function anyEliminated(players = []) {
  return players.some(
    (p) => p.status === "penalty" || Number(p.lives_remaining) <= 0,
  );
}

/**
 * 탈락한 자리 라벨 목록.
 * @param {Array} players
 * @returns {string[]}
 */
export function eliminatedSeats(players = []) {
  return players
    .filter((p) => p.status === "penalty" || Number(p.lives_remaining) <= 0)
    .map((p) => p.seat_label);
}

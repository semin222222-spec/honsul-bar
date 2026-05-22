/**
 * 드립 배틀 규칙 / lifecycle 상수 + 순수 함수
 *
 * 클라이언트 타이머는 UI용일 뿐, 실제 시간 판정은 항상
 * 서버 시각(`phase_started_at`) 기준 `calcSecondsLeft`로 한다. (라이어/캐치마인드와 동일)
 *
 * 결과 집계(`computeRoundResult`)는 투표 종료 시 한 번 계산해
 * `last_round_result`에 저장 → 모든 클라이언트가 동일한 결과를 본다.
 */

const ENV_INPUT_SECONDS = Number(import.meta?.env?.VITE_DRIP_INPUT_SECONDS);
const ENV_VOTE_SECONDS = Number(import.meta?.env?.VITE_DRIP_VOTE_SECONDS);

// 답변 입력 페이즈 시간(초). 기본 30초.
export const INPUT_SECONDS =
  Number.isFinite(ENV_INPUT_SECONDS) && ENV_INPUT_SECONDS > 0
    ? ENV_INPUT_SECONDS
    : 30;

// 투표 페이즈 시간(초). 기본 20초.
export const VOTE_SECONDS =
  Number.isFinite(ENV_VOTE_SECONDS) && ENV_VOTE_SECONDS > 0
    ? ENV_VOTE_SECONDS
    : 20;

export const ANSWER_MAX_LEN = 50;

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;
export const TOTAL_ROUNDS = 3;

// 1등 발표 → 꼴등 벌칙 자동 전환까지의 시간(ms). (탭으로 건너뛰기 가능)
export const BEST_REVEAL_MS = 5_000;

// 결과(finished) 화면 자동 만료(ms)
export const RESULT_AUTO_DISMISS_MS = 30_000;

// 하트비트 / 좀비 정리 (라이어와 동일)
export const HEARTBEAT_MS = 30_000;
export const ZOMBIE_THRESHOLD_MS = 90_000;
export const ZOMBIE_CHECK_MS = 30_000;

/**
 * 서버 시각 기준 남은 초. 소수 포함.
 *
 * @param {string|number|null} phaseStartedAt
 * @param {number} totalSeconds 해당 페이즈 총 시간
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
 * 답변 텍스트 정규화 + 유효성. 50자 이내, 공백만이면 무효.
 *
 * @param {string} text
 * @returns {{ ok: boolean, value: string, error?: string }}
 */
export function validateAnswer(text) {
  const value = String(text ?? "").trim();
  if (!value) return { ok: false, value, error: "답변을 입력해주세요" };
  if (value.length > ANSWER_MAX_LEN)
    return { ok: false, value, error: `${ANSWER_MAX_LEN}자 이내로 적어주세요` };
  return { ok: true, value };
}

/**
 * 입력 페이즈 종료 조건: 모든 참가자가 이번 라운드 답변을 제출했는가.
 *
 * @param {{ players: Array, answers: Array }} args
 * @returns {boolean}
 */
export function inputComplete({ players = [], answers = [] }) {
  if (players.length === 0) return false;
  const authors = new Set(answers.map((a) => a.session_id));
  return players.every((p) => authors.has(p.session_id));
}

/**
 * 투표 페이즈 종료 조건.
 *  - 답변이 2개 미만이면 투표 의미가 없으므로 즉시 종료.
 *  - 그 외에는 모든 참가자가 투표했는가.
 *
 * @param {{ players: Array, answers: Array, votes: Array }} args
 * @returns {boolean}
 */
export function votingComplete({ players = [], answers = [], votes = [] }) {
  if (answers.length < 2) return true;
  if (players.length === 0) return false;
  const voters = new Set(votes.map((v) => v.voter_session_id));
  return players.every((p) => voters.has(p.session_id));
}

/**
 * 한 라운드 결과 집계.
 *  - 정렬: 득표 내림차순, 동점이면 먼저 제출한 답변이 상위.
 *  - best = 1위, worst = 꼴등 (답변 2개 이상일 때만).
 *  - best ≠ worst 보장 (답변 2개 이상이면 서로 다른 항목).
 *
 * @param {Array<{id,session_id,seat_label,answer_text,created_at}>} answers
 * @param {Array<{target_answer_id}>} votes
 * @returns {{ ranking: Array, best: object|null, worst: object|null }}
 */
export function computeRoundResult(answers = [], votes = []) {
  const voteCount = new Map();
  for (const v of votes) {
    const id = v?.target_answer_id;
    if (id) voteCount.set(id, (voteCount.get(id) || 0) + 1);
  }

  const tsOf = (a) => {
    const t = a?.created_at ? new Date(a.created_at).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  };

  const ranking = answers
    .map((a) => ({
      answer_id: a.id,
      session_id: a.session_id,
      seat_label: a.seat_label,
      answer_text: a.answer_text,
      votes: voteCount.get(a.id) || 0,
      _ts: tsOf(a),
    }))
    .sort((x, y) => y.votes - x.votes || x._ts - y._ts)
    // eslint-disable-next-line no-unused-vars
    .map(({ _ts, ...rest }, i) => ({ ...rest, rank: i + 1 }));

  return {
    ranking,
    best: ranking[0] || null,
    worst: ranking.length >= 2 ? ranking[ranking.length - 1] : null,
  };
}

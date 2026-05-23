/**
 * 익명 폭로전 규칙 / lifecycle 상수 + 순수 함수 (v2 — 지목 방식)
 *
 * 흐름: waiting → phase_vote(질문+지목) → phase_result(최다 득표자=벌칙) → 다음 질문...
 * 라이프/매운맛/사연 작성 없음. 매 라운드 최다 득표자 1명(동률이면 복수)이 벌칙.
 *
 * 클라이언트 타이머는 UI용. 실제 시간 판정은 서버 시각(`phase_started_at`) 기준
 * `calcSecondsLeft`로 한다. (드립/라이어와 동일)
 *
 * ★ 익명성: 개별 표(누가 누구를 찍었는지)는 잠긴 votes 테이블에만 있고 클라가 못 읽는다.
 *   집계(자리별 득표수)는 서버 RPC(exposed_tally_round)가 수행하고, 결과엔 '득표수'만 공개한다.
 */

const ENV_VOTE_SECONDS = Number(import.meta?.env?.VITE_EXPOSED_VOTE_SECONDS);

// 투표(지목) 페이즈 시간(초). 기본 20초.
export const VOTE_SECONDS =
  Number.isFinite(ENV_VOTE_SECONDS) && ENV_VOTE_SECONDS > 0
    ? ENV_VOTE_SECONDS
    : 20;

export const MIN_PLAYERS = 2; // 반드시 2명부터
export const MAX_PLAYERS = 8;

// 결과(finished) 화면 자동 만료(ms)
export const RESULT_AUTO_DISMISS_MS = 30_000;

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
 * 투표 페이즈 종료 조건: 모든 참가자가 지목을 마쳤는가.
 *
 * @param {{ players: Array, votedSessions: Array }} args
 * @returns {boolean}
 */
export function voteComplete({ players = [], votedSessions = [] }) {
  if (players.length === 0) return false;
  const voted = new Set(votedSessions);
  return players.every((p) => voted.has(p.session_id));
}

/**
 * 지목 집계(클라이언트 표현용 / SQL 규칙의 순수 버전).
 *  votes: [{ target_seat_label }]
 *  - 자리별 득표수 내림차순
 *  - topVotes = 최다 득표수, topSeats = 그 자리들(동률 가능, 0표뿐이면 빈 배열)
 *
 * @param {Array<{target_seat_label:string}>} votes
 * @returns {{ counts: Array<{seat_label:string, votes:number}>, topSeats: string[], topVotes:number, total:number }}
 */
export function tallyNominations(votes = []) {
  const map = new Map();
  let total = 0;
  for (const v of votes) {
    const seat = v?.target_seat_label;
    if (!seat) continue;
    map.set(seat, (map.get(seat) || 0) + 1);
    total += 1;
  }
  const counts = [...map.entries()]
    .map(([seat_label, votes]) => ({ seat_label, votes }))
    .sort((a, b) => b.votes - a.votes);
  const topVotes = counts.length ? counts[0].votes : 0;
  const topSeats =
    topVotes > 0
      ? counts.filter((c) => c.votes === topVotes).map((c) => c.seat_label)
      : [];
  return { counts, topSeats, topVotes, total };
}

/**
 * 결과 막대 그래프용: 전체 참가자(0표 포함)를 득표수 내림차순으로.
 *  서버 last_round_result.counts(득표 있는 자리만)와 room.players를 병합한다.
 *
 * @param {Array<{seat_label:string}>} players
 * @param {Array<{seat_label:string, votes:number}>} counts
 * @returns {Array<{seat_label:string, votes:number}>}
 */
export function buildResultRows(players = [], counts = []) {
  const bySeat = new Map(counts.map((c) => [c.seat_label, c.votes || 0]));
  return players
    .map((p) => ({ seat_label: p.seat_label, votes: bySeat.get(p.seat_label) || 0 }))
    .sort((a, b) => b.votes - a.votes);
}

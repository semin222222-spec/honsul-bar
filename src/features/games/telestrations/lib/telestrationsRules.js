/**
 * 텔레스트레이션 게임 규칙 / lifecycle 상수
 *
 * 클라이언트 타이머는 UI용. 실제 시간 판정은 항상 step_started_at 서버 시간 기준.
 */

const ENV_DRAWING_SECONDS = Number(
  import.meta?.env?.VITE_TELESTRATIONS_DRAWING_SECONDS,
);
const ENV_GUESS_SECONDS = Number(
  import.meta?.env?.VITE_TELESTRATIONS_GUESS_SECONDS,
);

// 한 단계 시간 (초). 그리기는 60초, 추측은 20초가 기본.
export const DRAWING_SECONDS =
  Number.isFinite(ENV_DRAWING_SECONDS) && ENV_DRAWING_SECONDS > 0
    ? ENV_DRAWING_SECONDS
    : 60;

export const GUESS_SECONDS =
  Number.isFinite(ENV_GUESS_SECONDS) && ENV_GUESS_SECONDS > 0
    ? ENV_GUESS_SECONDS
    : 20;

// 인원 제한
export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 8;

// 결과 화면 자동 종료 (ms). 60초 후 방 삭제.
export const RESULT_AUTO_DISMISS_MS = 60_000;

// 단어 공개 화면 자동 진행 (ms). 5초 후 첫 그림 단계로.
export const WORD_REVEAL_AUTO_NEXT_MS = 5_000;

// 하트비트 주기
export const HEARTBEAT_MS = 30_000;

// 좀비 player 임계값
export const ZOMBIE_THRESHOLD_MS = 90_000;
export const ZOMBIE_CHECK_MS = 30_000;

// 캔버스 사이즈 (모바일 우선)
export const CANVAS_SIZE = 320;

// 그리기 도구 색상 팔레트
export const DRAWING_COLORS = [
  "#1a1a1a", // 검정
  "#E24B4A", // 빨강
  "#E2964B", // 주황
  "#D4A537", // 노랑
  "#6AB06A", // 초록
  "#4A7FE2", // 파랑
  "#B084FF", // 보라
  "#FF8FA3", // 분홍
];

// 빈 그림 (시간 초과 시 자동 제출용)
export const EMPTY_DRAWING_DATA = "[]";
export const EMPTY_GUESS_WORD = "???";

/**
 * 짝수 step = 모두 그림 그리기 단계
 */
export function isDrawingStep(step) {
  return step % 2 === 0;
}

/**
 * 홀수 step = 모두 단어 추측 단계
 */
export function isGuessStep(step) {
  return step % 2 === 1;
}

/**
 * 해당 단계의 시간 제한(초)
 */
export function getStepDurationSec(step) {
  return isDrawingStep(step) ? DRAWING_SECONDS : GUESS_SECONDS;
}

/**
 * 인원수만큼 step 진행 (5명이면 step 0~4, 총 5단계)
 */
export function getTotalSteps(playerCount) {
  return playerCount;
}

/**
 * 서버 시간 기준 남은 초. UI 타이머 표시용.
 */
export function calcStepSecondsLeft(startedAt, step, now = Date.now()) {
  const limit = getStepDurationSec(step);
  if (!startedAt) return limit;
  const startMs =
    typeof startedAt === "string" ? new Date(startedAt).getTime() : startedAt;
  const elapsed = Math.max(0, (now - startMs) / 1000);
  return Math.max(0, limit - elapsed);
}

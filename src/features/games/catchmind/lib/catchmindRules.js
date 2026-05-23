/**
 * 캐치마인드 게임 규칙 (시간/힌트/점수/판정)
 *
 * 모든 룰은 여기에 모아두고 훅·UI에서 재사용한다.
 */

// 라운드 시간 (초). DEV 모드에서 환경변수로 짧게 줄일 수 있다.
const ENV_ROUND_SECONDS = Number(
  import.meta?.env?.VITE_CATCHMIND_ROUND_SECONDS,
);
export const ROUND_SECONDS =
  Number.isFinite(ENV_ROUND_SECONDS) && ENV_ROUND_SECONDS > 0
    ? ENV_ROUND_SECONDS
    : 60;

export const COUNTDOWN_SECONDS = 3; // "3 → 2 → 1 → 시작!"
export const TRANSITION_SECONDS = 4; // 라운드 종료 후 결과 표시

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const PASS_PENALTY = -30;
export const DRAWER_BONUS_PER_CORRECT = 20;

// ─── 시간별 자동 힌트 공개 ───────────────────────────────
// 라운드 "경과 비율" 기준이라 ROUND_SECONDS가 바뀌어도 그대로 동작한다.
//   60초 라운드 기준:  ~15초(25%) 글자 수 공개,  ~30초(50%) 첫 글자 공개.
//   그 전(0~15초)에는 글자 수조차 숨긴다.
export const HINT_LENGTH_RATIO = 0.25; // 경과 25% → 글자 수
export const HINT_FIRST_RATIO = 0.5; //  경과 50% → 첫 글자

const HINT_MASK = "❓"; // 글자 수까지 숨기는 단계에서 쓰는 고정 마스크

/**
 * 현재 힌트 단계.
 * @returns {"hidden"|"length"|"first"}
 *   hidden : 글자 수도 안 보임
 *   length : 글자 수만 (밑줄 개수)
 *   first  : 첫 글자 + 나머지 밑줄
 */
export function getHintStage(secondsLeft) {
  const elapsed = ROUND_SECONDS - secondsLeft;
  if (elapsed >= ROUND_SECONDS * HINT_FIRST_RATIO) return "first";
  if (elapsed >= ROUND_SECONDS * HINT_LENGTH_RATIO) return "length";
  return "hidden";
}

/**
 * 힌트 표시용 문자열.
 *   hidden → "❓ ❓ ❓" (글자 수 노출 안 함, 고정 3칸)
 *   length → "_ _ _"   (글자 수만 노출)
 *   first  → "데 _ _"  (첫 글자 + 나머지 밑줄)
 */
export function formatHintString(word, secondsLeft) {
  if (!word) return "";
  const stage = getHintStage(secondsLeft);
  if (stage === "hidden") return `${HINT_MASK} ${HINT_MASK} ${HINT_MASK}`;
  const revealFirst = stage === "first";
  return word
    .split("")
    .map((ch, i) => (revealFirst && i === 0 ? ch : "_"))
    .join(" ");
}

/**
 * 힌트 단계에 대한 안내 라벨 (UI 보조 표시용).
 */
export function getHintCaption(secondsLeft) {
  switch (getHintStage(secondsLeft)) {
    case "first":
      return "첫 글자 공개!";
    case "length":
      return "글자 수 공개";
    default:
      return "곧 힌트가 공개돼요";
  }
}

function normalize(s) {
  if (typeof s !== "string") return "";
  return s.replace(/\s+/g, "").toLowerCase();
}

export function isCorrectAnswer(guess, answer) {
  return !!guess && !!answer && normalize(guess) === normalize(answer);
}

export function isCloseAnswer(guess, answer) {
  const g = normalize(guess);
  const a = normalize(answer);
  if (!g || !a) return false;
  if (g === a) return false;
  if (g.length !== a.length) return false;
  let diff = 0;
  for (let i = 0; i < g.length; i++) {
    if (g[i] !== a[i]) diff++;
    if (diff > 1) return false;
  }
  return diff === 1;
}

/**
 * 정답자 점수 계산.
 *   (남은시간 / ROUND_SECONDS) × 150 + 50  → 빠를수록 200점, 느릴수록 50점
 *
 * @param {number} secondsLeft 정답을 맞춘 순간 남은 초 (0~ROUND_SECONDS)
 * @returns {number} 정수 점수
 */
export function calcCorrectScore(secondsLeft) {
  const clamped = Math.max(0, Math.min(ROUND_SECONDS, secondsLeft));
  return Math.round((clamped / ROUND_SECONDS) * 150) + 50;
}

/**
 * 출제자 보너스 점수: 정답자 1명당 +20점.
 */
export function calcDrawerBonus(correctCount) {
  return correctCount * DRAWER_BONUS_PER_CORRECT;
}

/**
 * 서버 기준 (current_round_started_at) 으로 남은 초 계산.
 * 클라이언트 타이머는 UI용일 뿐. 동기화 판정은 항상 이걸로.
 */
export function calcSecondsLeft(roundStartedAt, now = Date.now()) {
  if (!roundStartedAt) return ROUND_SECONDS;
  const startMs =
    typeof roundStartedAt === "string"
      ? new Date(roundStartedAt).getTime()
      : roundStartedAt;
  const elapsed = Math.max(0, (now - startMs) / 1000);
  return Math.max(0, ROUND_SECONDS - elapsed);
}

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
    : 50;

export const COUNTDOWN_SECONDS = 3; // "3 → 2 → 1 → 시작!"
export const TRANSITION_SECONDS = 4; // 라운드 종료 후 결과 표시

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const PASS_PENALTY = -30;
export const DRAWER_BONUS_PER_CORRECT = 20;

// 힌트 공개 시점 (남은 초 기준) — 50초 라운드 기준 비례 분배
export const HINT_REVEAL_THRESHOLDS = [
  { secondsLeft: 25, slot: "first" },
  { secondsLeft: 15, slot: "last" },
  { secondsLeft: 6, slot: "middle" },
];

/**
 * 50% 룰을 적용하여 현재 공개된 글자 인덱스 배열을 반환.
 *
 * @param {string} word
 * @param {number} secondsLeft 남은 초
 * @returns {number[]} 공개된 글자 인덱스 (정렬 안 됨)
 */
export function getHintReveals(word, secondsLeft) {
  if (!word) return [];
  const maxReveals = Math.floor(word.length / 2);
  if (maxReveals <= 0) return [];

  const revealed = [];
  if (secondsLeft <= 25 && maxReveals >= 1) revealed.push(0);
  if (secondsLeft <= 15 && maxReveals >= 2)
    revealed.push(word.length - 1);
  if (secondsLeft <= 6 && maxReveals >= 3)
    revealed.push(Math.floor(word.length / 2));

  // 중복 제거 (length가 1인 단어 같은 경계)
  return Array.from(new Set(revealed));
}

/**
 * 힌트 표시용 문자열. 공개된 글자는 실제 글자, 나머지는 "_".
 * 예: "헤어드라이기" / 40초 남음 → "헤 _ _ _ _ _"
 */
export function formatHintString(word, secondsLeft) {
  if (!word) return "";
  const reveals = new Set(getHintReveals(word, secondsLeft));
  return word
    .split("")
    .map((ch, i) => (reveals.has(i) ? ch : "_"))
    .join(" ");
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

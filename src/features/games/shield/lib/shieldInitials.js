/**
 * 5초 쉴드 초성 게임 — 랜덤 초성 2글자 생성기
 *
 * 80% 일반자음 × 2 / 20% 일반 + 어려운자음. 너무 어려운 쌍(된소리 × 된소리)은 재추첨.
 */

const CONSONANTS = [
  "ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ",
  "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ",
  "ㅋ", "ㅌ", "ㅍ", "ㅎ",
  "ㄲ", "ㄸ", "ㅃ", "ㅆ", "ㅉ",
];

const HARD_PAIRS = new Set([
  "ㄸㅃ", "ㅃㄸ",
  "ㅉㄸ", "ㄸㅉ",
  "ㅃㅉ", "ㅉㅃ",
]);

const COMMON = ["ㄱ", "ㄴ", "ㄷ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅎ"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomInitials() {
  // 무한 루프 가드: 최대 8회 재시도 후 강제 반환
  for (let i = 0; i < 8; i += 1) {
    let first;
    let second;
    if (Math.random() < 0.8) {
      first = pick(COMMON);
      second = pick(COMMON);
    } else {
      first = pick(CONSONANTS);
      second = pick(CONSONANTS);
    }
    if (!HARD_PAIRS.has(`${first}${second}`)) {
      return `${first}${second}`;
    }
  }
  return `${pick(COMMON)}${pick(COMMON)}`;
}

/**
 * 드립 배틀 질문 풀 (빈칸 채우기 문장)
 *
 * - 빈칸은 밑줄 2개 이상(`___`)으로 표기한다.
 * - 투표/결과 화면에서 `splitOnBlank`로 앞/뒤를 나눠
 *   "앞 + [답변] + 뒤" 완성 문장으로 렌더한다.
 * - 라운드마다 `pickRandomQuestion(used)`로 중복 없이 1개 뽑는다.
 *
 * 혼술바 분위기(술자리 유머)에 맞춘 한국식 드립 문장.
 */

export const BLANK = "___";

export const DRIP_QUESTIONS = [
  "술 취한 내 친구가 갑자기 ___ 하기 시작했다.",
  "사장님이 가게 마감 후 몰래 ___ 하고 있었다.",
  "이 가게 단골손님의 비밀: ___",
  "이 자리에서 일어난 최악의 사건: ___",
  "___ 때문에 술이 확 깼다.",
  "내 전 애인은 헤어질 때 ___ 라고 말했다.",
  "오늘 첫 잔 마시자마자 ___ 가 떠올랐다.",
  "옆 테이블이 시킨 ___ 때문에 군침이 돌았다.",
  "이 술집 화장실에서 ___ 를 목격했다.",
  "내일 아침 분명 ___ 를 후회할 거다.",
  "내가 술만 마시면 꼭 하는 행동: ___",
  "사장님한테 서비스 받는 비결: ___",
  "방금 단톡방에 잘못 보낸 메시지: ___",
  "오늘 집에 못 가는 진짜 이유: ___",
  "10년 뒤 이 멤버들이 다시 모이면 ___ 하고 있을 거다.",
];

/**
 * 빈칸(밑줄 2개 이상) 기준으로 문장을 앞/뒤로 나눈다.
 * 빈칸이 없으면 전체를 before로, after는 빈 문자열로 둔다.
 *
 * @param {string} text
 * @returns {{ before: string, after: string }}
 */
export function splitOnBlank(text) {
  const parts = String(text ?? "").split(/_{2,}/);
  return { before: parts[0] ?? "", after: parts.slice(1).join(" ") };
}

/**
 * 이미 사용한 질문을 제외하고 랜덤으로 1개 뽑는다.
 * 모두 소진했으면 전체 풀에서 다시 뽑는다.
 *
 * @param {string[]} usedQuestions
 * @returns {string}
 */
export function pickRandomQuestion(usedQuestions = []) {
  const used = new Set(usedQuestions);
  const pool = DRIP_QUESTIONS.filter((q) => !used.has(q));
  const from = pool.length > 0 ? pool : DRIP_QUESTIONS;
  return from[Math.floor(Math.random() * from.length)];
}

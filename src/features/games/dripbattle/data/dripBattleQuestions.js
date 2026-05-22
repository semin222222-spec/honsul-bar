/**
 * 드립 배틀 질문 풀 (빈칸 채우기 문장)
 *
 * - 빈칸은 밑줄 2개 이상(`___`)으로 표기한다.
 * - 투표/결과 화면에서 `splitOnBlank`로 앞/뒤를 나눠
 *   "앞 + [답변] + 뒤" 완성 문장으로 렌더한다.
 * - 라운드마다 `pickRandomQuestion(used)`로 중복 없이 1개 뽑는다.
 *
 * 혼술바 분위기(술자리 유머)에 맞춘 한국식 드립 문장.
 * 답변이 길고 자유롭게 나오도록 빈칸 위치/문맥을 열어 둔다.
 */

export const BLANK = "___";

export const DRIP_QUESTIONS = [
  "술 취한 친구가 갑자기 ___ 하기 시작했다.",
  "나는 술만 마시면 꼭 ___ 하더라.",
  "어제 필름 끊기고 일어나 보니 카톡으로 ___ 를 보냈더라.",
  "사장님이 마감하고 몰래 ___ 하는 걸 봐버렸다.",
  "이 술집 단골이 되려면 적어도 ___ 정도는 해야 한다.",
  "지금 전 애인한테 딱 한 마디 보낼 수 있다면: ___",
  "오늘 술값은 방금 ___ 한 사람이 낸다.",
  "내 인생 최대 흑역사: 술 먹고 ___",
  "이 한 잔 딱 마시면 갑자기 ___ 하고 싶어진다.",
  "방금 옆 테이블에서 ___ 하는 소리가 들렸다.",
  "내가 이 가게 사장이라면 메뉴에 ___ 를 넣겠다.",
  "술 깨려고 ___ 했는데 오히려 더 취해버렸다.",
  "내일 출근하면 부장님 얼굴 보고 ___ 라고 말할 거다.",
  "우리 중에 분명 집 가서 ___ 할 사람이 한 명 있다.",
  "술자리 국룰: ___ 하는 사람은 무조건 원샷.",
  "내가 술 취하면 발동되는 숨은 능력: ___",
  "택시 기사님께 진심을 담아 ___ 라고 외쳤다.",
  "10년 뒤 이 멤버들은 분명 ___ 하고 있을 거다.",
  "사실 내 진짜 정체는 ___ 다.",
  "이 안주가 세상에서 사라진다면 나는 ___ 할 거다.",
  "첫사랑을 길에서 딱 마주치면 나는 ___ 할 거다.",
  "내 통장 잔고를 지금 확인하면 바로 ___ 하고 싶어진다.",
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

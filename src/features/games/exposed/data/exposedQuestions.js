/**
 * 익명 폭로전 — 시스템 지목 질문 풀
 *
 * 각 질문은 "~할 것 같은 사람은?" 형식. 참가자는 질문을 보고 **다른 참가자 1명을 지목**한다.
 * 라운드 시작 시 호스트가 여기서 랜덤으로 1개를 골라 화면 중앙에 띄운다.
 *
 * 톤: 술자리에서 서로 가볍게 지목하기 좋은 흥미 위주. 성적/외모/신체 비하·차별 없음.
 */

export const NOMINATION_QUESTIONS = [
  "첫인상과 다르게 술버릇이 가장 반전일 것 같은 사람은?",
  "이성에게 플러팅을 가장 자연스럽게 잘할 것 같은 사람은?",
  "만취하면 집에 안 가고 끝까지 버틸 것 같은 사람은?",
  "내일 아침 일어났을 때 이불킥을 가장 크게 할 것 같은 사람은?",
  "여기서 가장 비밀이 많아 보이는 사람은?",
  "처음 만났지만 은근히 나랑 개그 코드가 잘 맞을 것 같은 사람은?",
  "연락 씹기 1위일 것 같은 사람은?",
  "술 마시면 갑자기 진지해질 것 같은 사람은?",
  "전 애인 얘기를 가장 오래 할 것 같은 사람은?",
  "오늘 이 자리에서 가장 먼저 취할 것 같은 사람은?",
  "알고 보면 가장 인기 많을 것 같은 사람은?",
  "노래방 가면 마이크 안 놓을 것 같은 사람은?",
  "여기서 반전 매력이 가장 많을 것 같은 사람은?",
  "지금 비밀 연애 중일 것 같은 사람은?",
  "술자리 분위기 메이커일 것 같은 사람은?",
  "오늘 가장 사고 칠 것 같은 사람은?",
];

/**
 * 이미 보여준 질문을 제외하고 랜덤으로 1개 뽑는다.
 * 모두 소진했으면 전체 풀에서 다시 뽑는다.
 *
 * @param {string[]} usedQuestions
 * @returns {string}
 */
export function pickRandomQuestion(usedQuestions = []) {
  const used = new Set(usedQuestions);
  const remaining = NOMINATION_QUESTIONS.filter((q) => !used.has(q));
  const from = remaining.length > 0 ? remaining : NOMINATION_QUESTIONS;
  return from[Math.floor(Math.random() * from.length)];
}

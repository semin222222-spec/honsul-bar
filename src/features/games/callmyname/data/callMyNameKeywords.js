/**
 * 콜 마이 네임 정체 키워드 풀
 *
 * - 카테고리: 인물 / 동물 / 사물 / 음식 / 장소 (각 10개 = 50개)
 * - 게임 시작 시 방장이 `pickIdentities(count)`로 참가자 수만큼 **서로 다른** 정체를 뽑아
 *   각 player의 identity_keyword / identity_category 에 배정한다 (라이어 단어 추첨과 동일 방식).
 * - 키워드는 그 자체가 정답이다. 정답 매칭은 서버 RPC(call_my_name_attempt)가
 *   "공백/특수문자 제거 + 소문자" 정규화 후 정확 일치로 판정한다.
 *
 * 혼술바 분위기(누구나 아는 쉬운 단어)에 맞춰 술자리에서 바로 추리 가능한 것들로 구성.
 */

export const KEYWORDS_BY_CATEGORY = {
  인물: [
    "원빈",
    "유재석",
    "백설공주",
    "일론머스크",
    "김연아",
    "손흥민",
    "세종대왕",
    "아이언맨",
    "산타클로스",
    "이순신",
  ],
  동물: [
    "모기",
    "펭귄",
    "코끼리",
    "고양이",
    "사자",
    "기린",
    "돌고래",
    "햄스터",
    "공작새",
    "나무늘보",
  ],
  사물: [
    "아이폰",
    "텔레비전",
    "자전거",
    "칫솔",
    "우산",
    "선풍기",
    "냉장고",
    "안경",
    "베개",
    "지갑",
  ],
  음식: [
    "김치",
    "라면",
    "치킨",
    "떡볶이",
    "김밥",
    "삼겹살",
    "탕수육",
    "아이스크림",
    "피자",
    "초밥",
  ],
  장소: [
    "학교",
    "한강",
    "디즈니랜드",
    "지하철",
    "편의점",
    "찜질방",
    "노래방",
    "공항",
    "수영장",
    "도서관",
  ],
};

export const CATEGORIES = Object.keys(KEYWORDS_BY_CATEGORY);

// 카테고리 정보를 붙인 전체 평면 목록: [{ keyword, category }]
export const ALL_IDENTITIES = CATEGORIES.flatMap((category) =>
  KEYWORDS_BY_CATEGORY[category].map((keyword) => ({ keyword, category })),
);

/**
 * Fisher-Yates 셔플 (원본 불변).
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 참가자 수만큼 서로 다른 정체를 랜덤으로 뽑는다.
 *  - 카테고리를 섞어 다양하게 배정.
 *  - count 가 풀 크기를 넘으면(이론상 없음) 풀 전체를 반환.
 *
 * @param {number} count 참가자 수
 * @returns {{ keyword: string, category: string }[]}
 */
export function pickIdentities(count) {
  const n = Math.max(0, Math.floor(count) || 0);
  return shuffle(ALL_IDENTITIES).slice(0, n);
}

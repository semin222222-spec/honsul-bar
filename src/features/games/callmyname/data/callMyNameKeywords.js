/**
 * 콜 마이 네임 정체 키워드 풀 (타임어택 + 시간별 힌트)
 *
 * 각 항목: { answer(정답), category(카테고리), hint(초성) }
 *   예: { answer: "유재석", category: "인물", hint: "ㅇㅈㅅ" }
 *
 * - 게임 시작 시 방장이 `pickIdentities(count)`로 참가자 수만큼 서로 다른 정체를 뽑아
 *   각 player의 identity_keyword / identity_category / identity_hint 에 배정한다.
 * - `hint`(초성)는 본인 화면에서 10분 경과 시 공개되는 최종 힌트다.
 *   값은 `toChoseong(answer)`(callMyNameRules)로 자동 생성되며, 여기엔 검수용으로 명시한다.
 *   (callMyName.test.js 가 hint === toChoseong(answer) 를 전수 검증)
 * - 정답 매칭은 서버 RPC(call_my_name_attempt)가 "공백/특수문자 제거 + 소문자" 정규화 후 정확 일치로 판정.
 */

export const IDENTITY_POOL = [
  // ── 인물 ──
  { answer: "유재석", category: "인물", hint: "ㅇㅈㅅ" },
  { answer: "원빈", category: "인물", hint: "ㅇㅂ" },
  { answer: "백설공주", category: "인물", hint: "ㅂㅅㄱㅈ" },
  { answer: "일론머스크", category: "인물", hint: "ㅇㄹㅁㅅㅋ" },
  { answer: "김연아", category: "인물", hint: "ㄱㅇㅇ" },
  { answer: "손흥민", category: "인물", hint: "ㅅㅎㅁ" },
  { answer: "세종대왕", category: "인물", hint: "ㅅㅈㄷㅇ" },
  { answer: "아이언맨", category: "인물", hint: "ㅇㅇㅇㅁ" },
  { answer: "산타클로스", category: "인물", hint: "ㅅㅌㅋㄹㅅ" },
  { answer: "이순신", category: "인물", hint: "ㅇㅅㅅ" },

  // ── 동물 ──
  { answer: "모기", category: "동물", hint: "ㅁㄱ" },
  { answer: "펭귄", category: "동물", hint: "ㅍㄱ" },
  { answer: "코끼리", category: "동물", hint: "ㅋㄲㄹ" },
  { answer: "고양이", category: "동물", hint: "ㄱㅇㅇ" },
  { answer: "사자", category: "동물", hint: "ㅅㅈ" },
  { answer: "기린", category: "동물", hint: "ㄱㄹ" },
  { answer: "돌고래", category: "동물", hint: "ㄷㄱㄹ" },
  { answer: "햄스터", category: "동물", hint: "ㅎㅅㅌ" },
  { answer: "공작새", category: "동물", hint: "ㄱㅈㅅ" },
  { answer: "나무늘보", category: "동물", hint: "ㄴㅁㄴㅂ" },

  // ── 사물 ──
  { answer: "아이폰", category: "사물", hint: "ㅇㅇㅍ" },
  { answer: "텔레비전", category: "사물", hint: "ㅌㄹㅂㅈ" },
  { answer: "자전거", category: "사물", hint: "ㅈㅈㄱ" },
  { answer: "칫솔", category: "사물", hint: "ㅊㅅ" },
  { answer: "우산", category: "사물", hint: "ㅇㅅ" },
  { answer: "선풍기", category: "사물", hint: "ㅅㅍㄱ" },
  { answer: "냉장고", category: "사물", hint: "ㄴㅈㄱ" },
  { answer: "안경", category: "사물", hint: "ㅇㄱ" },
  { answer: "베개", category: "사물", hint: "ㅂㄱ" },
  { answer: "지갑", category: "사물", hint: "ㅈㄱ" },

  // ── 음식 ──
  { answer: "김치", category: "음식", hint: "ㄱㅊ" },
  { answer: "라면", category: "음식", hint: "ㄹㅁ" },
  { answer: "치킨", category: "음식", hint: "ㅊㅋ" },
  { answer: "떡볶이", category: "음식", hint: "ㄸㅂㅇ" },
  { answer: "김밥", category: "음식", hint: "ㄱㅂ" },
  { answer: "삼겹살", category: "음식", hint: "ㅅㄱㅅ" },
  { answer: "탕수육", category: "음식", hint: "ㅌㅅㅇ" },
  { answer: "아이스크림", category: "음식", hint: "ㅇㅇㅅㅋㄹ" },
  { answer: "피자", category: "음식", hint: "ㅍㅈ" },
  { answer: "초밥", category: "음식", hint: "ㅊㅂ" },

  // ── 장소 ──
  { answer: "학교", category: "장소", hint: "ㅎㄱ" },
  { answer: "한강", category: "장소", hint: "ㅎㄱ" },
  { answer: "디즈니랜드", category: "장소", hint: "ㄷㅈㄴㄹㄷ" },
  { answer: "지하철", category: "장소", hint: "ㅈㅎㅊ" },
  { answer: "편의점", category: "장소", hint: "ㅍㅇㅈ" },
  { answer: "찜질방", category: "장소", hint: "ㅉㅈㅂ" },
  { answer: "노래방", category: "장소", hint: "ㄴㄹㅂ" },
  { answer: "공항", category: "장소", hint: "ㄱㅎ" },
  { answer: "수영장", category: "장소", hint: "ㅅㅇㅈ" },
  { answer: "도서관", category: "장소", hint: "ㄷㅅㄱ" },
];

export const CATEGORIES = [...new Set(IDENTITY_POOL.map((x) => x.category))];

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
 * @returns {{ answer: string, category: string, hint: string }[]}
 */
export function pickIdentities(count) {
  const n = Math.max(0, Math.floor(count) || 0);
  return shuffle(IDENTITY_POOL).slice(0, n);
}

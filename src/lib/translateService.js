/**
 * 자동 번역 서비스
 * - MyMemory API 사용 (무료, 키 불필요)
 * - 일일 한도: 10,000 글자 (이메일 등록시 50,000)
 * - 한국어 → 일본어 전용
 *
 * 사용: 사장님이 메뉴 추가/수정시 자동으로 일본어 번역
 */

const API_BASE = "https://api.mymemory.translated.net/get";

/**
 * 텍스트 한 개 번역
 * @param {string} text - 번역할 텍스트 (한국어)
 * @param {string} sourceLang - 원본 언어 (기본: ko)
 * @param {string} targetLang - 대상 언어 (기본: ja)
 * @returns {Promise<string>} 번역된 텍스트
 */
export async function translateText(text, sourceLang = "ko", targetLang = "ja") {
  if (!text || !text.trim()) return "";

  // 너무 긴 텍스트는 자르기 (MyMemory 한도)
  const trimmed = text.trim().slice(0, 500);

  try {
    const url = `${API_BASE}?q=${encodeURIComponent(trimmed)}&langpair=${sourceLang}|${targetLang}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error("번역 API 응답 실패:", response.status);
      return ""; // 실패시 빈 문자열 (원본 그대로 사용)
    }

    const data = await response.json();

    // MyMemory 응답 구조
    if (data.responseStatus === 200 && data.responseData) {
      const translated = data.responseData.translatedText;

      // 가끔 ALL CAPS로 응답하는 버그 있음 (예: "JINTONIC")
      // → 매치율이 0.85 이상이면 신뢰
      if (data.responseData.match >= 0.5) {
        return translated;
      }
    }

    // 매치율 낮으면 빈 문자열 반환 (수동 번역 유도)
    return "";
  } catch (error) {
    console.error("번역 실패:", error);
    return "";
  }
}

/**
 * 여러 텍스트 동시 번역 (병렬 처리)
 * @param {Array<string>} texts - 번역할 텍스트 배열
 * @returns {Promise<Array<string>>} 번역된 텍스트 배열
 */
export async function translateMultiple(texts, sourceLang = "ko", targetLang = "ja") {
  if (!texts || texts.length === 0) return [];

  // 순차 처리 (병렬은 너무 빨라서 rate limit 걸림)
  const results = [];
  for (const text of texts) {
    const translated = await translateText(text, sourceLang, targetLang);
    results.push(translated);
    // 살짝 지연 (rate limit 방지)
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return results;
}

/**
 * 메뉴 자동 번역 (이름 + 설명)
 * @param {object} menu - { name, description }
 * @returns {Promise<object>} { name_ja, description_ja }
 */
export async function autoTranslateMenu(menu) {
  const result = { name_ja: "", description_ja: "" };

  if (menu.name) {
    result.name_ja = await translateText(menu.name);
  }
  if (menu.description) {
    // 살짝 지연
    await new Promise((resolve) => setTimeout(resolve, 200));
    result.description_ja = await translateText(menu.description);
  }

  return result;
}

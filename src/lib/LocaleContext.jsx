import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { translations } from "./translations";

/**
 * LocaleContext
 * - 현재 언어 상태 관리 (ko / ja)
 * - localStorage에 저장 → 재방문시 유지
 * - t() 함수 제공: t("home.title") → "홈" 또는 "ホーム"
 */

const LocaleContext = createContext(null);

const SUPPORTED_LOCALES = ["ko", "ja"];
const DEFAULT_LOCALE = "ko";
const STORAGE_KEY = "honsul.locale";

export function LocaleProvider({ children }) {
  // 초기값: localStorage > 브라우저 언어 > 기본
  const [locale, setLocaleState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;

    // 브라우저 언어 자동 감지
    const browserLang = navigator.language?.split("-")[0];
    if (SUPPORTED_LOCALES.includes(browserLang)) return browserLang;

    return DEFAULT_LOCALE;
  });

  // 언어 변경 + localStorage 저장
  const setLocale = useCallback((newLocale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) return;
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch (e) {
      console.error("로케일 저장 실패:", e);
    }
  }, []);

  /**
   * 번역 함수
   * @param {string} key - "home.title" 같은 점 표기법
   * @param {object} replacements - 변수 치환용 (선택)
   * @returns {string|array} 번역된 텍스트
   *
   * 예시:
   *   t("home.title") → "홈" (ko) / "ホーム" (ja)
   *   t("home.greetings") → ["오늘 밤도...", ...] (배열)
   */
  const t = useCallback((key, replacements = {}) => {
    const langData = translations[locale] || translations[DEFAULT_LOCALE];

    // "home.title" → ["home", "title"] → 객체 탐색
    const parts = key.split(".");
    let value = langData;
    for (const part of parts) {
      if (value && typeof value === "object") {
        value = value[part];
      } else {
        value = undefined;
        break;
      }
    }

    // 값이 없으면 기본 언어에서 찾기
    if (value === undefined) {
      let fallback = translations[DEFAULT_LOCALE];
      for (const part of parts) {
        if (fallback && typeof fallback === "object") {
          fallback = fallback[part];
        } else {
          fallback = undefined;
          break;
        }
      }
      value = fallback;
    }

    // 그래도 없으면 키 자체 반환
    if (value === undefined) {
      console.warn(`[i18n] 번역 키 없음: ${key}`);
      return key;
    }

    // 문자열에 치환 적용 ({name} → "John")
    if (typeof value === "string" && Object.keys(replacements).length > 0) {
      return value.replace(/{(\w+)}/g, (match, name) =>
        replacements[name] !== undefined ? replacements[name] : match
      );
    }

    return value;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

// 훅
export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

// 편의 훅: t() 함수만 필요할 때
export function useT() {
  return useLocale().t;
}

// 다국어 텍스트 선택 헬퍼
// menuItem.name (한국어), menuItem.name_ja (일본어) 같은 경우
// pickLocaleField(menuItem, 'name', locale) → 'name' or 'name_ja'
export function pickLocaleField(obj, field, locale) {
  if (!obj) return "";
  if (locale === "ja") {
    const jaField = `${field}_ja`;
    if (obj[jaField]) return obj[jaField];
  }
  return obj[field] || "";
}

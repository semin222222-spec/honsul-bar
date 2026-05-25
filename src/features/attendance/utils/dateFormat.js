// ============================================================
// 근태 날짜 표시 유틸 (KST)
// work_date('YYYY-MM-DD') 와 instant 를 한국어 표시 문자열로 변환한다.
// ============================================================

import { KST, kstParts } from "./timeCalc";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 'YYYY-MM-DD' → 정오 KST 기준 Date (요일/표시 계산 안전하게) */
export function workDateToDate(workDateStr) {
  return new Date(`${workDateStr}T12:00:00+09:00`);
}

/** instant 또는 work_date 의 요일 인덱스(0=일) — KST 기준 */
function weekdayIndex(value) {
  const d = typeof value === "string" ? workDateToDate(value) : value;
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: KST,
    weekday: "short",
  }).format(d);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd] ?? 0;
}

/** 'YYYY-MM-DD' → '토' 같은 한 글자 요일 */
export function weekdayKo(workDateStr) {
  return WEEKDAYS[weekdayIndex(workDateStr)];
}

/** 주말(토/일)? — 일별 리스트 색상 구분용 */
export function isWeekend(workDateStr) {
  const idx = weekdayIndex(workDateStr);
  return idx === 0 || idx === 6;
}

/** 'YYYY-MM-DD' → '17' (일자만) */
export function dayNumber(workDateStr) {
  return Number(workDateStr.split("-")[2]);
}

/** 'YYYY-MM-DD' → '2026년 5월 17일 토요일' */
export function formatKoreanDate(workDateStr) {
  const [y, m, d] = workDateStr.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일 ${WEEKDAYS[weekdayIndex(workDateStr)]}요일`;
}

/** 'YYYY-MM-DD' → '2026-05-17 (토)' (날짜 선택 표시) */
export function formatDatePicker(workDateStr) {
  return `${workDateStr} (${weekdayKo(workDateStr)})`;
}

/** (year, month 1-12) → '2026년 5월' */
export function monthLabel(year, month) {
  return `${year}년 ${month}월`;
}

/** instant → '2026년 5월 22일 목요일' (진입 화면 현재 날짜) */
export function formatKoreanDateFromInstant(value) {
  return formatKoreanDate(
    (() => {
      const p = kstParts(value);
      return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
    })(),
  );
}

/** 한글 이름 정렬 비교자 */
export function compareKoreanName(a, b) {
  return String(a || "").localeCompare(String(b || ""), "ko");
}

/** 이름 → 아바타 이니셜(마지막 글자 = 보통 이름 끝 글자) */
export function avatarInitial(name) {
  const n = String(name || "").trim();
  return n ? n.slice(-1) : "?";
}

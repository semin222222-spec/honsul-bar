// ============================================================
// 근태 시간 계산 (KST 기준)
//
// 기존 앱은 네이티브 Date(단말기 = KST 전제)를 쓰지만, 근태는 급여 계산에
// 쓰이므로 단말기 타임존과 무관하게 항상 'Asia/Seoul'로 계산한다.
// 한국은 DST가 없어 UTC+9 고정 = 정확하다.
//
// 핵심 규칙
//   - work_date = 출근 시각(check_in)의 KST 달력 날짜. 새벽 퇴근해도 출근일 기준.
//   - 근무시간 = check_out - check_in (timestamptz 차이). 미마감이면 null.
//   - 수동 입력: 퇴근 시각이 출근보다 이르면 자동으로 다음날로 인식.
// ============================================================

export const KST = "Asia/Seoul";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n) {
  return String(n).padStart(2, "0");
}

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

/**
 * 어떤 instant 든 KST 벽시계 구성요소로 분해.
 * @returns {{year,month,day,hour,minute,second}}
 */
export function kstParts(value) {
  const d = toDate(value);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(d)
    .reduce((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

  // 일부 환경은 자정을 "24"로 반환 → 0으로 보정
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** instant → 'YYYY-MM-DD' (KST 출근일) */
export function workDateOf(value) {
  const p = kstParts(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** instant → 'HH:MM' (KST) */
export function kstTime(value) {
  const p = kstParts(value);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** instant → 'HH:MM:SS' (KST) — 진입 화면 현재 시각용 */
export function kstClock(value) {
  const p = kstParts(value);
  return `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
}

/** 오늘(KST) 'YYYY-MM-DD' */
export function todayKst() {
  return workDateOf(new Date());
}

/**
 * KST 벽시계(y, m, d, hh, mm) → 실제 instant(Date).
 * Date.UTC 는 인자를 UTC로 보므로, KST(=UTC+9) 벽시계의 instant 는 9시간 뺀 값.
 */
export function kstWallToInstant(year, month, day, hh, mm) {
  return new Date(Date.UTC(year, month - 1, day, hh, mm) - KST_OFFSET_MS);
}

/**
 * 수동 입력값 → 출근/퇴근 instant.
 * 퇴근(HH:MM)이 출근보다 이르거나 같으면 다음날로 본다 (야간 근무).
 * work_date 는 항상 출근일(전달된 workDateStr) 기준 유지.
 * @returns {{checkInAt:Date, checkOutAt:Date|null, overnight:boolean}}
 */
export function buildManualTimes(workDateStr, inHH, inMM, outHH, outMM) {
  const [y, m, d] = workDateStr.split("-").map(Number);
  const checkInAt = kstWallToInstant(y, m, d, inHH, inMM);

  const hasOut =
    Number.isFinite(outHH) && Number.isFinite(outMM);
  if (!hasOut) {
    return { checkInAt, checkOutAt: null, overnight: false };
  }

  const inMin = inHH * 60 + inMM;
  const outMin = outHH * 60 + outMM;
  const overnight = outMin <= inMin;
  const checkOutAt = kstWallToInstant(y, m, d + (overnight ? 1 : 0), outHH, outMM);
  return { checkInAt, checkOutAt, overnight };
}

/** 근무시간(ms). 미마감이면 null. */
export function workMs(checkInAt, checkOutAt) {
  if (!checkInAt || !checkOutAt) return null;
  return toDate(checkOutAt).getTime() - toDate(checkInAt).getTime();
}

/** ms → "Xh Ym" (시안의 day-hours/요약 표기) */
export function formatDurationShort(ms) {
  if (ms == null) return "—";
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${pad(m)}m`;
}

/** ms → "X시간 Y분" (경과/노트 표기) */
export function formatDurationKo(ms) {
  if (ms == null) return "—";
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}분`;
  return `${h}시간 ${m}분`;
}

/** 새벽 퇴근(출근일 != 퇴근일, KST 기준)? */
export function isOvernight(checkInAt, checkOutAt) {
  if (!checkInAt || !checkOutAt) return false;
  return workDateOf(checkInAt) !== workDateOf(checkOutAt);
}

/** 비정상 근무(0 이하 또는 24시간 초과)? — 경고 표시용 */
export function isAbnormal(checkInAt, checkOutAt) {
  const ms = workMs(checkInAt, checkOutAt);
  return ms != null && (ms <= 0 || ms > DAY_MS);
}

/**
 * 퇴근 시각 표시용. 새벽 퇴근이면 다음날 플래그.
 * @returns {{time:string|null, nextDay:boolean}}
 */
export function formatCheckOut(checkInAt, checkOutAt) {
  if (!checkOutAt) return { time: null, nextDay: false };
  return { time: kstTime(checkOutAt), nextDay: isOvernight(checkInAt, checkOutAt) };
}

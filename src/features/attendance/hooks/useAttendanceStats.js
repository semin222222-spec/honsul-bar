import { useState, useEffect, useCallback, useMemo } from "react";
import { attendanceRepository } from "@/repositories/attendance/attendanceRepository";
import { hasStoreScope } from "@/shared/lib/storeScope";
import {
  handleRealtimeSubscribeStatus,
  onRealtimeRecover,
} from "@/shared/realtime/realtimeHealth";
import { workMs, kstParts } from "../utils/timeCalc";

// (year, month 1-12) → { start, end } work_date 문자열 [start, end)
export function monthRange(year, month) {
  const pad = (n) => String(n).padStart(2, "0");
  const start = `${year}-${pad(month)}-01`;
  const ny = month === 12 ? year + 1 : year;
  const nm = month === 12 ? 1 : month + 1;
  const end = `${ny}-${pad(nm)}-01`;
  return { start, end };
}

// KST 기준 현재 연/월/일
export function currentKstMonth() {
  const p = kstParts(new Date());
  return { year: p.year, month: p.month, day: p.day };
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// ============================================================
// useMonthlyStoreStats — 관리자 목록 상단 통계 + 알바별 이번 달 시간
//   이번 달(KST) 매장 전체 기록을 한 번 받아 staffId 별 합산.
// ============================================================
export function useMonthlyStoreStats(storeId) {
  const active = hasStoreScope(storeId);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(active);
  const { year, month } = currentKstMonth();

  const fetchRecords = useCallback(async () => {
    if (!hasStoreScope(storeId)) return;
    const { start, end } = monthRange(year, month);
    try {
      const data = await attendanceRepository.listRecordsBetween({
        storeId,
        from: start,
        to: end,
      });
      setRecords(data);
    } catch (error) {
      console.error("[Attendance] monthly store stats error:", error);
    }
  }, [storeId, year, month]);

  useEffect(() => {
    if (!active) return; // loading 초기값 false

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      await fetchRecords();
      if (!cancelled) setLoading(false);
    }, 0);

    const off = attendanceRepository.subscribeAttendance({
      storeId,
      onChange: fetchRecords,
      onStatus: (status) =>
        handleRealtimeSubscribeStatus(status, {
          label: "AttendanceStats",
          onSubscribed: fetchRecords,
          onRecoverable: fetchRecords,
        }),
    });
    const offRecover = onRealtimeRecover(fetchRecords);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      off?.();
      offRecover?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, year, month]);

  // staffId → 이번 달 근무 ms(완료분 합)
  const hoursByStaff = useMemo(() => {
    const map = new Map();
    for (const rec of records) {
      const ms = workMs(rec.check_in_at, rec.check_out_at) || 0;
      map.set(rec.staff_id, (map.get(rec.staff_id) || 0) + ms);
    }
    return map;
  }, [records]);

  const totalMs = useMemo(
    () => records.reduce((sum, r) => sum + (workMs(r.check_in_at, r.check_out_at) || 0), 0),
    [records],
  );

  return { hoursByStaff, totalMs, loading, year, month, refetch: fetchRecords };
}

// ============================================================
// useStaffMonth — 알바 상세(일별/월별)
//   한 알바의 특정 월 기록 → 요약 + 일별 리스트(빈 날 포함)
// ============================================================
export function useStaffMonth(storeId, staffId, year, month) {
  const active = hasStoreScope(storeId) && !!staffId;
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(active);

  const fetchRecords = useCallback(async () => {
    if (!hasStoreScope(storeId) || !staffId) return;
    const { start, end } = monthRange(year, month);
    try {
      const data = await attendanceRepository.listRecordsBetween({
        storeId,
        from: start,
        to: end,
        staffId,
      });
      setRecords(data);
    } catch (error) {
      console.error("[Attendance] staff month error:", error);
    }
  }, [storeId, staffId, year, month]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      await fetchRecords();
      if (!cancelled) setLoading(false);
    }, 0);

    const off = attendanceRepository.subscribeAttendance({
      storeId,
      onChange: fetchRecords,
      onStatus: (status) =>
        handleRealtimeSubscribeStatus(status, {
          label: "AttendanceStaffMonth",
          onSubscribed: fetchRecords,
          onRecoverable: fetchRecords,
        }),
    });
    const offRecover = onRealtimeRecover(fetchRecords);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      off?.();
      offRecover?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, staffId, year, month]);

  // work_date → record
  const byDate = useMemo(() => {
    const map = new Map();
    for (const rec of records) map.set(rec.work_date, rec);
    return map;
  }, [records]);

  // 월별 요약
  const summary = useMemo(() => {
    const totalMs = records.reduce(
      (sum, r) => sum + (workMs(r.check_in_at, r.check_out_at) || 0),
      0,
    );
    const days = records.length; // 기록 있는 날(진행 중 포함)
    const avgMs = days > 0 ? Math.round(totalMs / days) : 0;
    return { totalMs, days, avgMs };
  }, [records]);

  // 일별 리스트 (내림차순). 빈 날도 포함해 수동 입력 진입 가능.
  const days = useMemo(() => {
    const pad = (n) => String(n).padStart(2, "0");
    const cur = currentKstMonth();
    const isCurrentMonth = cur.year === year && cur.month === month;
    const isFuture =
      year > cur.year || (year === cur.year && month > cur.month);
    if (isFuture) return [];

    const last = isCurrentMonth ? cur.day : daysInMonth(year, month);
    const list = [];
    for (let d = last; d >= 1; d--) {
      const workDate = `${year}-${pad(month)}-${pad(d)}`;
      list.push({
        workDate,
        record: byDate.get(workDate) || null,
        isToday: isCurrentMonth && d === cur.day,
      });
    }
    return list;
  }, [byDate, year, month]);

  return { records, byDate, summary, days, loading, refetch: fetchRecords };
}

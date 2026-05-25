import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { attendanceRepository } from "@/repositories/attendance/attendanceRepository";
import { hasStoreScope } from "@/shared/lib/storeScope";
import {
  handleRealtimeSubscribeStatus,
  onRealtimeRecover,
} from "@/shared/realtime/realtimeHealth";
import { todayKst, workDateOf } from "../utils/timeCalc";

function nextDayStr(dateStr) {
  const d = new Date(`${dateStr}T12:00:00+09:00`);
  d.setDate(d.getDate() + 1);
  return workDateOf(d);
}

// ============================================================
// useAttendance
//   - 활성 알바 목록
//   - 출근/퇴근, 알바 추가/비활성(soft delete)
//   - 현재 근무 중(미마감) 기록 → 직원 모드 상태 + 관리자 목록 '근무 중' 표시
//   - Realtime 구독으로 관리자 화면 실시간 반영
// ============================================================
export function useAttendance(storeId) {
  const active = hasStoreScope(storeId);
  const [staff, setStaff] = useState([]);
  const [openRecords, setOpenRecords] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [loading, setLoading] = useState(active);
  const [busy, setBusy] = useState(false);
  const offRef = useRef(null);

  const fetchAll = useCallback(async () => {
    if (!hasStoreScope(storeId)) return;
    const today = todayKst();
    try {
      const [s, o, t] = await Promise.all([
        attendanceRepository.listStaff(storeId),
        attendanceRepository.listOpenRecords(storeId),
        attendanceRepository.listRecordsBetween({
          storeId,
          from: today,
          to: nextDayStr(today),
        }),
      ]);
      setStaff(s);
      setOpenRecords(o);
      setTodayRecords(t);
    } catch (error) {
      console.error("[Attendance] fetch error:", error);
    }
  }, [storeId]);

  useEffect(() => {
    if (!active) return; // loading 초기값이 이미 false (useState(active))

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      await fetchAll();
      if (!cancelled) setLoading(false);
    }, 0);

    const off = attendanceRepository.subscribeAttendance({
      storeId,
      onChange: fetchAll,
      onStatus: (status) =>
        handleRealtimeSubscribeStatus(status, {
          label: "Attendance",
          onSubscribed: fetchAll,
          onRecoverable: fetchAll,
        }),
    });
    offRef.current = off;
    const offRecover = onRealtimeRecover(fetchAll);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      off?.();
      offRecover?.();
      offRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // staffId → 현재 열린 기록 (근무 중 판별 + 출근 시각)
  const openByStaff = useMemo(() => {
    const map = new Map();
    for (const rec of openRecords) {
      const prev = map.get(rec.staff_id);
      if (!prev || new Date(rec.check_in_at) > new Date(prev.check_in_at)) {
        map.set(rec.staff_id, rec);
      }
    }
    return map;
  }, [openRecords]);

  // staffId → 오늘(출근일) 기록 — 직원 모드 '오늘 기록' 로그
  const todayByStaff = useMemo(() => {
    const map = new Map();
    for (const rec of todayRecords) map.set(rec.staff_id, rec);
    return map;
  }, [todayRecords]);

  const addStaff = useCallback(
    async ({ name, hiredAt }) => {
      if (!hasStoreScope(storeId) || !name?.trim()) return false;
      setBusy(true);
      try {
        await attendanceRepository.addStaff({
          storeId,
          name: name.trim(),
          hiredAt,
        });
        await fetchAll();
        return true;
      } catch (error) {
        console.error("[Attendance] addStaff error:", error);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [storeId, fetchAll],
  );

  const renameStaff = useCallback(
    async (staffId, name) => {
      if (!hasStoreScope(storeId) || !name?.trim()) return false;
      setBusy(true);
      try {
        await attendanceRepository.updateStaff({
          storeId,
          staffId,
          name: name.trim(),
        });
        await fetchAll();
        return true;
      } catch (error) {
        console.error("[Attendance] renameStaff error:", error);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [storeId, fetchAll],
  );

  const removeStaff = useCallback(
    async (staffId) => {
      if (!hasStoreScope(storeId)) return false;
      setBusy(true);
      try {
        await attendanceRepository.deactivateStaff({ storeId, staffId });
        await fetchAll();
        return true;
      } catch (error) {
        console.error("[Attendance] removeStaff error:", error);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [storeId, fetchAll],
  );

  const punchIn = useCallback(
    async (staffId) => {
      if (!hasStoreScope(storeId)) return false;
      setBusy(true);
      try {
        await attendanceRepository.checkIn({ storeId, staffId });
        await fetchAll();
        return true;
      } catch (error) {
        console.error("[Attendance] checkIn error:", error);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [storeId, fetchAll],
  );

  const punchOut = useCallback(
    async (staffId) => {
      if (!hasStoreScope(storeId)) return false;
      setBusy(true);
      try {
        await attendanceRepository.checkOut({ storeId, staffId });
        await fetchAll();
        return true;
      } catch (error) {
        console.error("[Attendance] checkOut error:", error);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [storeId, fetchAll],
  );

  // 수동 입력/수정 (관리자) — { ok } 또는 { ok:false, error }
  const saveRecord = useCallback(
    async (payload) => {
      if (!hasStoreScope(storeId)) return { ok: false, error: "매장 정보 없음" };
      setBusy(true);
      try {
        await attendanceRepository.saveManual({ storeId, ...payload });
        await fetchAll();
        return { ok: true };
      } catch (error) {
        console.error("[Attendance] saveRecord error:", error);
        return { ok: false, error: error?.message || "저장 실패" };
      } finally {
        setBusy(false);
      }
    },
    [storeId, fetchAll],
  );

  const deleteRecord = useCallback(
    async (recordId) => {
      if (!hasStoreScope(storeId)) return false;
      setBusy(true);
      try {
        await attendanceRepository.deleteRecord({ storeId, recordId });
        await fetchAll();
        return true;
      } catch (error) {
        console.error("[Attendance] deleteRecord error:", error);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [storeId, fetchAll],
  );

  return {
    staff,
    openRecords,
    openByStaff,
    todayByStaff,
    workingCount: openByStaff.size,
    loading,
    busy,
    addStaff,
    renameStaff,
    removeStaff,
    punchIn,
    punchOut,
    saveRecord,
    deleteRecord,
    refetch: fetchAll,
  };
}

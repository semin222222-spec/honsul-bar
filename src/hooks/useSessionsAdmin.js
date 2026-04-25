import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useSessionsAdmin
 * - 관리자: 활성 세션 목록 + 강제 해제 + 정산
 * - 오늘 매출 계산 (closed 세션의 주문 합산)
 */
export function useSessionsAdmin() {
  const [sessions, setSessions] = useState([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("sessions")
      .select("*")
      .eq("status", "open")
      .order("opened_at", { ascending: false });

    if (err) {
      setError(err);
    } else {
      setError(null);
      setSessions(data || []);
    }
    setLoading(false);
  }, []);

  // 오늘 매출 계산 — 정산 완료된 세션의 주문 합산
  const fetchTodayRevenue = useCallback(async () => {
    // 오늘 00:00부터
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data, error: err } = await supabase
      .from("orders")
      .select("price, session:sessions!inner(status, closed_at)")
      .eq("session.status", "closed")
      .gte("session.closed_at", todayStart.toISOString());

    if (!err && data) {
      const total = data.reduce((sum, o) => sum + (o.price || 0), 0);
      setTodayRevenue(total);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchTodayRevenue();

    const channel = supabase
      .channel("sessions-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
        },
        () => {
          fetchSessions();
          fetchTodayRevenue();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => fetchTodayRevenue()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSessions, fetchTodayRevenue]);

  // 강제 해제 (주문 없는 경우)
  const closeSession = useCallback(async (sessionId) => {
    const { error: err } = await supabase
      .from("sessions")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (err) {
      console.error("세션 종료 실패:", err);
      return false;
    }
    return true;
  }, []);

  // 정산 (세션 닫고 주문 기록 유지)
  const settleSession = useCallback(async (sessionId) => {
    // 해당 세션의 pending 주문도 전부 served로 처리
    await supabase
      .from("orders")
      .update({ status: "served", served_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .eq("status", "pending");

    // 세션 종료
    const { error: err } = await supabase
      .from("sessions")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (err) {
      console.error("정산 실패:", err);
      return false;
    }
    return true;
  }, []);

  // 자리 이동 (세션의 seat_label 변경 + 관련 주문도)
  const moveSession = useCallback(async (sessionId, newSeatLabel) => {
    // 1) 새 좌석이 이미 점유됐는지 확인
    const { data: existing } = await supabase
      .from("sessions")
      .select("id")
      .eq("seat_label", newSeatLabel)
      .eq("status", "open")
      .maybeSingle();

    if (existing) {
      console.error("새 좌석이 이미 점유됨");
      return { ok: false, reason: "occupied" };
    }

    // 2) 세션 좌석 변경
    const { error: sessErr } = await supabase
      .from("sessions")
      .update({
        seat_label: newSeatLabel,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (sessErr) {
      console.error("자리 이동 실패:", sessErr);
      return { ok: false, reason: "error" };
    }

    // 3) 해당 세션의 모든 주문도 좌석 갱신
    await supabase
      .from("orders")
      .update({ seat_label: newSeatLabel })
      .eq("session_id", sessionId);

    return { ok: true };
  }, []);

  return {
    sessions,
    todayRevenue,
    loading,
    error,
    closeSession,
    settleSession,
    moveSession,
    refetch: fetchSessions,
  };
}

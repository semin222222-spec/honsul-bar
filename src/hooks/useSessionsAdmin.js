import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useSessionsAdmin
 * - 관리자: 활성 세션 목록 + 강제 해제 + 정산 + 자리이동 + 합석
 * - 오늘 매출 계산 (closed 세션의 주문 합산)
 *
 * 🆕 v2: realtime 갱신 시 setLoading(true) 안 함 → 화면 깜빡임 방지
 */
export function useSessionsAdmin() {
  const [sessions, setSessions] = useState([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const initialFetchedRef = useRef(false); // 🆕 첫 로딩 완료 여부

  // 🆕 silent: true면 setLoading 호출 안 함 (백그라운드 갱신용)
  const fetchSessions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

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

    if (!silent) setLoading(false);
    initialFetchedRef.current = true;
  }, []);

  // 오늘 매출 계산 — 정산 완료된 세션의 주문 합산
  const fetchTodayRevenue = useCallback(async () => {
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
    // 첫 로딩: 로딩 표시
    fetchSessions(false);
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
          // 🆕 realtime 갱신: silent (로딩 표시 안 함)
          fetchSessions(true);
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
    await supabase
      .from("orders")
      .update({ status: "served", served_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .eq("status", "pending");

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

    await supabase
      .from("orders")
      .update({ seat_label: newSeatLabel })
      .eq("session_id", sessionId);

    return { ok: true };
  }, []);

  // 합석
  const mergeSession = useCallback(async (fromSessionId, toSeatLabel) => {
    if (!fromSessionId || !toSeatLabel) {
      return { ok: false, reason: "invalid" };
    }

    const { data: fromSession, error: fromErr } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", fromSessionId)
      .eq("status", "open")
      .maybeSingle();

    if (fromErr || !fromSession) {
      console.error("합석할 세션을 찾을 수 없음:", fromErr);
      return { ok: false, reason: "from_not_found" };
    }

    if (fromSession.seat_label === toSeatLabel) {
      return { ok: false, reason: "same_seat" };
    }

    const { data: toSession, error: toErr } = await supabase
      .from("sessions")
      .select("*")
      .eq("seat_label", toSeatLabel)
      .eq("status", "open")
      .maybeSingle();

    if (toErr || !toSession) {
      console.error("합석 대상 좌석에 세션이 없음:", toErr);
      return { ok: false, reason: "to_not_found" };
    }

    const fromNickname = fromSession.nickname || "손님";
    const toNickname = toSession.nickname || "손님";
    let mergedNickname = `${toNickname} + ${fromNickname}`;

    if (mergedNickname.length > 20) {
      const plusCount = (toNickname.match(/\+/g) || []).length;
      mergedNickname = `${toNickname.split(" + ")[0]} 외 ${plusCount + 1}명`;
    }

    let mergedNicknameJa = null;
    if (toSession.nickname_ja || fromSession.nickname_ja) {
      const fromJa = fromSession.nickname_ja || fromSession.nickname || "ゲスト";
      const toJa = toSession.nickname_ja || toSession.nickname || "ゲスト";
      mergedNicknameJa = `${toJa} + ${fromJa}`;
      if (mergedNicknameJa.length > 25) {
        const plusCount = (toJa.match(/\+/g) || []).length;
        mergedNicknameJa = `${toJa.split(" + ")[0]} 外${plusCount + 1}名`;
      }
    }

    const { error: ordersErr } = await supabase
      .from("orders")
      .update({
        session_id: toSession.id,
        seat_label: toSeatLabel,
      })
      .eq("session_id", fromSessionId);

    if (ordersErr) {
      console.error("주문 이전 실패:", ordersErr);
      return { ok: false, reason: "orders_transfer_failed" };
    }

    const updatePayload = {
      nickname: mergedNickname,
      last_active_at: new Date().toISOString(),
    };
    if (mergedNicknameJa) {
      updatePayload.nickname_ja = mergedNicknameJa;
    }

    const { error: updateErr } = await supabase
      .from("sessions")
      .update(updatePayload)
      .eq("id", toSession.id);

    if (updateErr) {
      console.error("대상 세션 업데이트 실패:", updateErr);
    }

    const { error: closeErr } = await supabase
      .from("sessions")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", fromSessionId);

    if (closeErr) {
      console.error("합석 후 원래 세션 종료 실패:", closeErr);
      return { ok: false, reason: "close_failed" };
    }

    console.log(`[Merge] ${fromSession.seat_label}(${fromNickname}) → ${toSeatLabel}(${toNickname}) 합석 완료`);
    return {
      ok: true,
      mergedNickname,
      fromSeat: fromSession.seat_label,
      toSeat: toSeatLabel,
      fromNickname,
      toNickname,
    };
  }, []);

  return {
    sessions,
    todayRevenue,
    loading,
    error,
    closeSession,
    settleSession,
    moveSession,
    mergeSession,
    refetch: () => fetchSessions(false), // 수동 새로고침은 로딩 표시
  };
}

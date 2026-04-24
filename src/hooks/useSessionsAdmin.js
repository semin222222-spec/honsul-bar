import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useSessionsAdmin
 * - 관리자 페이지에서 활성 세션 목록 조회 + 강제 해제
 *
 * 반환:
 *   sessions      — 활성(open) 세션 배열
 *   loading
 *   error
 *   closeSession  — 특정 세션 강제 종료
 *   refetch       — 수동 새로고침
 */
export function useSessionsAdmin() {
  const [sessions, setSessions] = useState([]);
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

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel("sessions-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
        },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSessions]);

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

  return {
    sessions,
    loading,
    error,
    closeSession,
    refetch: fetchSessions,
  };
}

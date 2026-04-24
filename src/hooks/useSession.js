import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useSession
 * - 손님이 좌석을 선택하면 Supabase sessions 테이블에 세션을 생성
 * - 현재 열린 세션 ID는 localStorage에 저장 (재접속 복구용)
 * - 세션이 정산되면 자동으로 null이 되어 좌석 선택 화면으로 돌아감
 *
 * 반환:
 *   session        — 현재 활성 세션 { id, seat_label, ... } 또는 null
 *   createSession  — 새 세션 시작
 *   loading        — 초기 로딩 중
 */
export function useSession({ myId, myNickname, myAvatar }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [justSettled, setJustSettled] = useState(null); // 최근 정산된 세션 정보 (ThankYou 화면용)
  const activeChannelRef = useRef(null);

  // ───── 활동 시간 업데이트 (3분마다) ─────
  const touchSession = useCallback(async (sessionId) => {
    if (!sessionId) return;
    await supabase
      .from("sessions")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", sessionId);
  }, []);

  // ───── 세션 로드 (재접속 복구) ─────
  useEffect(() => {
    if (!myId) return;

    const loadSession = async () => {
      setLoading(true);

      // 1. localStorage에서 저장된 sessionId 확인
      const savedId = localStorage.getItem("honsul_session_id");

      if (savedId) {
        // 해당 세션이 아직 열려있는지 확인
        const { data, error } = await supabase
          .from("sessions")
          .select("*")
          .eq("id", savedId)
          .eq("status", "open")
          .maybeSingle();

        if (!error && data) {
          // 재접속 성공! 활동 시간만 갱신
          await touchSession(data.id);
          setSession(data);
          setLoading(false);
          return;
        } else {
          // 세션이 이미 닫혔거나 삭제됨 → localStorage 정리
          localStorage.removeItem("honsul_session_id");
        }
      }

      // 2. customer_id로 최근 열린 세션 찾기 (localStorage 날아갔을 경우 대비)
      const { data: byCustomer } = await supabase
        .from("sessions")
        .select("*")
        .eq("customer_id", myId)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (byCustomer) {
        localStorage.setItem("honsul_session_id", byCustomer.id);
        await touchSession(byCustomer.id);
        setSession(byCustomer);
      }

      setLoading(false);
    };

    loadSession();
  }, [myId, touchSession]);

  // ───── 내 세션 실시간 감지 (정산되면 바로 반영) ─────
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const updated = payload.new;
          if (updated.status === "closed") {
            // 사장님이 정산함 → ThankYouScreen 표시를 위해 justSettled에 저장
            localStorage.removeItem("honsul_session_id");
            setJustSettled(updated);
            setSession(null);
          } else {
            setSession(updated);
          }
        }
      )
      .subscribe();

    activeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      activeChannelRef.current = null;
    };
  }, [session?.id]);

  // ───── 주기적으로 활동 시간 갱신 (3분마다) ─────
  useEffect(() => {
    if (!session?.id) return;
    const interval = setInterval(() => {
      touchSession(session.id);
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session?.id, touchSession]);

  // ───── 새 세션 만들기 (좌석 선택 완료 시) ─────
  const createSession = useCallback(
    async (seatLabel) => {
      if (!myId || !seatLabel) return null;

      const { data, error } = await supabase
        .from("sessions")
        .insert({
          seat_label: seatLabel,
          customer_id: myId,
          nickname: myNickname,
          avatar: myAvatar,
          status: "open",
        })
        .select()
        .single();

      if (error) {
        console.error("세션 생성 실패:", error);
        return null;
      }

      localStorage.setItem("honsul_session_id", data.id);
      setSession(data);
      return data;
    },
    [myId, myNickname, myAvatar]
  );

  return {
    session,
    loading,
    createSession,
    justSettled,
    dismissThankYou: () => setJustSettled(null),
  };
}

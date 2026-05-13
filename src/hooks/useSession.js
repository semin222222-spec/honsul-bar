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
 *   createSession  — 새 세션 시작 (좌석 중복 차단)
 *   loading        — 초기 로딩 중
 */
export function useSession({ myId, myNickname, myAvatar }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [justSettled, setJustSettled] = useState(null);
  const [seatMoveNotice, setSeatMoveNotice] = useState(null);
  const activeChannelRef = useRef(null);
  const lastSeatRef = useRef(null);

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
        const { data, error } = await supabase
          .from("sessions")
          .select("*")
          .eq("id", savedId)
          .eq("status", "open")
          .maybeSingle();

        if (!error && data) {
          await touchSession(data.id);
          lastSeatRef.current = data.seat_label;
          setSession(data);
          setLoading(false);
          return;
        } else {
          localStorage.removeItem("honsul_session_id");
        }
      }

      // 2. customer_id로 최근 열린 세션 찾기
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
        lastSeatRef.current = byCustomer.seat_label;
        setSession(byCustomer);
      }

      setLoading(false);
    };

    loadSession();
  }, [myId, touchSession]);

  // ───── 내 세션 실시간 감지 ─────
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
            localStorage.removeItem("honsul_session_id");
            setJustSettled(updated);
            setSession(null);
          } else {
            const prevSeat = lastSeatRef.current;
            if (prevSeat && prevSeat !== updated.seat_label) {
              setSeatMoveNotice({ from: prevSeat, to: updated.seat_label });
              setTimeout(() => setSeatMoveNotice(null), 4000);
            }
            lastSeatRef.current = updated.seat_label;
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

  // ───── 주기적으로 활동 시간 갱신 ─────
  useEffect(() => {
    if (!session?.id) return;
    const interval = setInterval(() => {
      touchSession(session.id);
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session?.id, touchSession]);

  // ───── 🆕 새 세션 만들기 (좌석 중복 차단) ─────
  const createSession = useCallback(
    async (seatLabel) => {
      if (!myId || !seatLabel) {
        return { ok: false, reason: "invalid", message: "잘못된 요청입니다" };
      }

      // 🔍 1단계: 해당 좌석에 이미 활성 세션이 있는지 확인
      const { data: existingSession, error: checkError } = await supabase
        .from("sessions")
        .select("*")
        .eq("seat_label", seatLabel)
        .eq("status", "open")
        .maybeSingle();

      if (checkError) {
        console.error("좌석 중복 체크 실패:", checkError);
        return { ok: false, reason: "error", message: "좌석 확인 중 오류가 발생했어요" };
      }

      // 🔍 2단계: 이미 있다면 - 같은 사람인지 확인
      if (existingSession) {
        if (existingSession.customer_id === myId) {
          // ✅ 같은 사람이면 기존 세션 사용 (재접속)
          localStorage.setItem("honsul_session_id", existingSession.id);
          lastSeatRef.current = existingSession.seat_label;
          setSession(existingSession);
          return { ok: true, session: existingSession, reused: true };
        } else {
          // ❌ 다른 사람이 이미 사용 중!
          return {
            ok: false,
            reason: "seat_occupied",
            message: `'${seatLabel}' 자리는 이미 사용 중이에요.\n다른 자리를 선택하거나 사장님께 문의해주세요.`,
          };
        }
      }

      // 🔍 3단계: 없으면 새 세션 생성
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
        // 만약 다른 사람이 동시에 같은 좌석을 선택했다면 (race condition)
        if (error.code === "23505") {
          return {
            ok: false,
            reason: "race_condition",
            message: "방금 다른 분이 먼저 입장하셨어요. 다른 자리를 선택해주세요.",
          };
        }
        return { ok: false, reason: "create_failed", message: "입장에 실패했어요. 다시 시도해주세요." };
      }

      localStorage.setItem("honsul_session_id", data.id);
      lastSeatRef.current = data.seat_label;
      setSession(data);
      return { ok: true, session: data, reused: false };
    },
    [myId, myNickname, myAvatar]
  );

  return {
    session,
    loading,
    createSession,
    justSettled,
    dismissThankYou: () => setJustSettled(null),
    seatMoveNotice,
    dismissSeatMove: () => setSeatMoveNotice(null),
  };
}

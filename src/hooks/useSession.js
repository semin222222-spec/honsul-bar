import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useSession - 🚨 버그 수정 + 즉시 복구 (v4)
 *
 * [해결한 버그]
 * - 같은 좌석 재입장 안 됨
 * - 다른 좌석으로 주문 들어감 (b-3 → a-3)
 * - 같은 customer_id로 여러 세션 중복 생성
 * - 사파리 사설모드/완전종료 등 localStorage 날아간 케이스 → 즉시 복구 가능
 *
 * [핵심 수정]
 * 1. URL 좌석과 저장된 세션 좌석이 다르면 → localStorage 무시
 * 2. URL에 좌석 있으면 그 좌석으로만 세션 검색
 * 3. 좌석 이동 시 옛 세션 자동 close
 * 4. 정산 시 localStorage 확실히 정리
 * 5. 좌석에 옛 세션 있으면 → 1초 후부터 즉시 복구 모달 표시
 * 6. takeoverSession 함수 - 손님이 직접 옛 세션 인수
 */

// 활동 끊긴 지 이 시간 이상이면 "복구 가능" (1초 = 사실상 즉시)
const STALE_SESSION_SECONDS = 1;

export function useSession({ myId, myNickname, myAvatar }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [justSettled, setJustSettled] = useState(null);
  const [seatMoveNotice, setSeatMoveNotice] = useState(null);
  const activeChannelRef = useRef(null);
  const lastSeatRef = useRef(null);

  // ───── 활동 시간 업데이트 ─────
  const touchSession = useCallback(async (sessionId) => {
    if (!sessionId) return;
    await supabase
      .from("sessions")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", sessionId);
  }, []);

  // ───── URL에서 좌석 가져오기 ─────
  const getSeatFromUrl = () => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("seat");
  };

  // ───── 내 customer_id로 열린 모든 세션 중 현재 좌석 외 정리 ─────
  const cleanupStaleSessions = useCallback(async (customerId, currentSeatLabel) => {
    if (!customerId) return;
    const { data: openSessions } = await supabase
      .from("sessions")
      .select("id, seat_label")
      .eq("customer_id", customerId)
      .eq("status", "open");

    if (!openSessions || openSessions.length === 0) return;

    const stale = openSessions.filter((s) => s.seat_label !== currentSeatLabel);
    if (stale.length === 0) return;

    console.log(`[Session] 잔여 세션 ${stale.length}개 정리:`, stale.map((s) => s.seat_label));
    await supabase
      .from("sessions")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .in(
        "id",
        stale.map((s) => s.id)
      );
  }, []);

  // ───── 세션 로드 (재접속 복구) ─────
  useEffect(() => {
    if (!myId) return;

    const loadSession = async () => {
      setLoading(true);

      const seatFromUrl = getSeatFromUrl();
      const savedId = localStorage.getItem("honsul_session_id");

      // 1. localStorage 기반 복구 시도
      if (savedId) {
        const { data, error } = await supabase
          .from("sessions")
          .select("*")
          .eq("id", savedId)
          .eq("status", "open")
          .maybeSingle();

        if (!error && data) {
          if (seatFromUrl && seatFromUrl !== data.seat_label) {
            console.log(
              `[Session] URL(${seatFromUrl}) ≠ 저장(${data.seat_label}) → localStorage 폐기`
            );
            localStorage.removeItem("honsul_session_id");
            await cleanupStaleSessions(myId, seatFromUrl);
          } else {
            await touchSession(data.id);
            lastSeatRef.current = data.seat_label;
            setSession(data);
            setLoading(false);
            return;
          }
        } else {
          localStorage.removeItem("honsul_session_id");
        }
      }

      // 2. customer_id로 복구
      if (!seatFromUrl) {
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
      } else {
        const { data: bySeatAndCustomer } = await supabase
          .from("sessions")
          .select("*")
          .eq("customer_id", myId)
          .eq("seat_label", seatFromUrl)
          .eq("status", "open")
          .order("opened_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bySeatAndCustomer) {
          localStorage.setItem("honsul_session_id", bySeatAndCustomer.id);
          await touchSession(bySeatAndCustomer.id);
          lastSeatRef.current = bySeatAndCustomer.seat_label;
          setSession(bySeatAndCustomer);
          await cleanupStaleSessions(myId, seatFromUrl);
        } else {
          await cleanupStaleSessions(myId, seatFromUrl);
        }
      }

      setLoading(false);
    };

    loadSession();
  }, [myId, touchSession, cleanupStaleSessions]);

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
            lastSeatRef.current = null;
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

  // ───── 주기적 활동 시간 갱신 ─────
  useEffect(() => {
    if (!session?.id) return;
    const interval = setInterval(() => {
      touchSession(session.id);
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session?.id, touchSession]);

  // ───── takeoverSession: 손님이 직접 옛 세션 인수 ─────
  const takeoverSession = useCallback(
    async (oldSessionId, seatLabel) => {
      if (!myId || !oldSessionId || !seatLabel) {
        return { ok: false, reason: "invalid" };
      }

      const { data, error } = await supabase
        .from("sessions")
        .update({
          customer_id: myId,
          last_active_at: new Date().toISOString(),
        })
        .eq("id", oldSessionId)
        .eq("seat_label", seatLabel)
        .eq("status", "open")
        .select()
        .single();

      if (error || !data) {
        console.error("세션 인수 실패:", error);
        return { ok: false, reason: "takeover_failed", message: "재입장에 실패했어요. 다시 시도해주세요." };
      }

      localStorage.setItem("honsul_session_id", data.id);
      lastSeatRef.current = data.seat_label;
      setSession(data);

      await cleanupStaleSessions(myId, seatLabel);

      console.log(`[Session] 세션 인수 완료: ${seatLabel} (${oldSessionId})`);
      return { ok: true, session: data, recovered: true };
    },
    [myId, cleanupStaleSessions]
  );

  // ───── 새 세션 만들기 ─────
  const createSession = useCallback(
    async (seatLabel) => {
      if (!myId || !seatLabel) {
        return { ok: false, reason: "invalid", message: "잘못된 요청입니다" };
      }

      // 1. 해당 좌석에 활성 세션 있는지 확인
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

      // 2. 이미 있다면
      if (existingSession) {
        if (existingSession.customer_id === myId) {
          // 같은 사람 → 기존 세션 재사용
          localStorage.setItem("honsul_session_id", existingSession.id);
          lastSeatRef.current = existingSession.seat_label;
          setSession(existingSession);
          await cleanupStaleSessions(myId, seatLabel);
          return { ok: true, session: existingSession, reused: true };
        } else {
          // 다른 사람으로 보이지만... 사파리 사설모드/완전종료로 ID 바뀐 본인일 수 있음
          const lastActive = existingSession.last_active_at
            ? new Date(existingSession.last_active_at)
            : new Date(existingSession.opened_at);
          const secondsSinceActive = (Date.now() - lastActive.getTime()) / 1000;

          // 🚨 핵심: 1초만 지나도 복구 가능 (실수로 나갔다 바로 들어오는 케이스 대응)
          const isStale = secondsSinceActive >= STALE_SESSION_SECONDS;

          return {
            ok: false,
            reason: "seat_occupied",
            recoverable: isStale,
            existingSession: isStale ? {
              id: existingSession.id,
              seat_label: existingSession.seat_label,
              nickname: existingSession.nickname,
              opened_at: existingSession.opened_at,
              last_active_at: existingSession.last_active_at,
              secondsSinceActive: Math.floor(secondsSinceActive),
            } : null,
            message: isStale
              ? `'${seatLabel}' 자리에 조금 전까지 사용 중이던 세션이 있어요.`
              : `'${seatLabel}' 자리는 이미 사용 중이에요.\n다른 자리를 선택하거나 사장님께 문의해주세요.`,
          };
        }
      }

      // 3. 내가 다른 좌석에 열린 세션 모두 close
      const { data: myOldSessions } = await supabase
        .from("sessions")
        .select("id, seat_label")
        .eq("customer_id", myId)
        .eq("status", "open");

      if (myOldSessions && myOldSessions.length > 0) {
        await supabase
          .from("sessions")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .in(
            "id",
            myOldSessions.map((s) => s.id)
          );
        console.log(
          `[Session] 기존 세션 ${myOldSessions.length}개 종료 → ${seatLabel}로 이동`,
          myOldSessions.map((s) => s.seat_label)
        );
        localStorage.removeItem("honsul_session_id");
      }

      // 4. 새 세션 생성
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
    [myId, myNickname, myAvatar, cleanupStaleSessions]
  );

  return {
    session,
    loading,
    createSession,
    takeoverSession,
    justSettled,
    dismissThankYou: () => {
      localStorage.removeItem("honsul_session_id");
      setJustSettled(null);
    },
    seatMoveNotice,
    dismissSeatMove: () => setSeatMoveNotice(null),
  };
}

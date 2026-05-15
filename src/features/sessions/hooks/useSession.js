import { useState, useEffect, useCallback, useRef } from "react";
import { sessionRepository } from "@/repositories/sessions/sessionRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";

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

export function useSession({ myId, myNickname, myAvatar, storeId }) {
  const hasActiveScope = Boolean(myId && hasStoreScope(storeId));
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(hasActiveScope);
  const [justSettled, setJustSettled] = useState(null);
  const [seatMoveNotice, setSeatMoveNotice] = useState(null);
  const activeChannelRef = useRef(null);
  const lastSeatRef = useRef(null);

  const applySessionUpdate = useCallback((updated) => {
    if (!updated) return;

    if (updated.status === "closed") {
      localStorage.removeItem("honsul_session_id");
      lastSeatRef.current = null;
      setJustSettled(updated);
      setSession(null);
      return;
    }

    const prevSeat = lastSeatRef.current;
    if (prevSeat && prevSeat !== updated.seat_label) {
      setSeatMoveNotice({ from: prevSeat, to: updated.seat_label });
      setTimeout(() => setSeatMoveNotice(null), 4000);
    }
    lastSeatRef.current = updated.seat_label;
    setSession(updated);
  }, []);

  const syncSessionById = useCallback(
    async (sessionId) => {
      if (!sessionId || !hasStoreScope(storeId)) return;

      try {
        const data = await sessionRepository.getSessionById({
          storeId,
          sessionId,
        });
        applySessionUpdate(data);
      } catch (error) {
        console.error("[Session] sync failed:", error);
      }
    },
    [applySessionUpdate, storeId],
  );

  // ───── 활동 시간 업데이트 ─────
  const touchSession = useCallback(
    async (sessionId) => {
      if (!sessionId || !hasStoreScope(storeId)) return;
      await sessionRepository.touchSession({
        storeId,
        sessionId,
        touchedAt: new Date().toISOString(),
      });
    },
    [storeId],
  );

  // ───── URL에서 좌석 가져오기 ─────
  const getSeatFromUrl = () => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("seat");
  };

  // ───── 내 customer_id로 열린 모든 세션 중 현재 좌석 외 정리 ─────
  const cleanupStaleSessions = useCallback(
    async (customerId, currentSeatLabel) => {
      if (!customerId || !hasStoreScope(storeId)) return;
      const openSessions = await sessionRepository.listOpenSessionsByCustomer({
        storeId,
        customerId,
      });

      if (!openSessions || openSessions.length === 0) return;

      const stale = openSessions.filter(
        (s) => s.seat_label !== currentSeatLabel,
      );
      if (stale.length === 0) return;

      console.log(
        `[Session] 잔여 세션 ${stale.length}개 정리:`,
        stale.map((s) => s.seat_label),
      );
      await sessionRepository.closeSessionsByIds({
        storeId,
        sessionIds: stale.map((s) => s.id),
        closedAt: new Date().toISOString(),
      });
    },
    [storeId],
  );

  // ───── 세션 로드 (재접속 복구) ─────
  useEffect(() => {
    if (!hasActiveScope) return;

    const loadSession = async () => {
      setLoading(true);

      const seatFromUrl = getSeatFromUrl();
      const savedId = localStorage.getItem("honsul_session_id");

      // 1. localStorage 기반 복구 시도
      if (savedId) {
        try {
          const data = await sessionRepository.getOpenSessionById({
            storeId,
            sessionId: savedId,
          });
          if (data) {
            if (seatFromUrl && seatFromUrl !== data.seat_label) {
              console.log(
                `[Session] URL(${seatFromUrl}) ≠ 저장(${data.seat_label}) → localStorage 폐기`,
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
        } catch {
          localStorage.removeItem("honsul_session_id");
        }
      }

      // 2. customer_id로 복구
      if (!seatFromUrl) {
        const byCustomer =
          await sessionRepository.getLatestOpenSessionByCustomer({
            storeId,
            customerId: myId,
          });

        if (byCustomer) {
          localStorage.setItem("honsul_session_id", byCustomer.id);
          await touchSession(byCustomer.id);
          lastSeatRef.current = byCustomer.seat_label;
          setSession(byCustomer);
        }
      } else {
        const bySeatAndCustomer =
          await sessionRepository.getLatestOpenSessionBySeatAndCustomer({
            storeId,
            customerId: myId,
            seatLabel: seatFromUrl,
          });

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
  }, [myId, storeId, hasActiveScope, touchSession, cleanupStaleSessions]);

  // ───── 내 세션 실시간 감지 ─────
  useEffect(() => {
    if (!hasActiveScope || !session?.id) return;

    const unsubscribe = sessionRepository.subscribeToSession({
      storeId,
      sessionId: session.id,
      onUpdate: (payload) => {
        applySessionUpdate(payload.new);
      },
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Session",
          onSubscribed: () => syncSessionById(session.id),
          onRecoverable: () => syncSessionById(session.id),
        });
      },
    });

    activeChannelRef.current = unsubscribe;

    return () => {
      unsubscribe();
      activeChannelRef.current = null;
    };
  }, [
    session?.id,
    storeId,
    hasActiveScope,
    applySessionUpdate,
    syncSessionById,
  ]);

  // ───── 주기적 활동 시간 갱신 ─────
  useEffect(() => {
    if (!hasActiveScope || !session?.id) return;
    const interval = setInterval(
      () => {
        touchSession(session.id);
      },
      3 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [session?.id, hasActiveScope, touchSession]);

  // ───── takeoverSession: 손님이 직접 옛 세션 인수 ─────
  const takeoverSession = useCallback(
    async (oldSessionId, seatLabel) => {
      if (!myId || !oldSessionId || !seatLabel || !hasStoreScope(storeId)) {
        return { ok: false, reason: "invalid" };
      }

      let data;
      try {
        data = await sessionRepository.takeoverSession({
          storeId,
          sessionId: oldSessionId,
          seatLabel,
          customerId: myId,
          touchedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("세션 인수 실패:", error);
        return {
          ok: false,
          reason: "takeover_failed",
          message: "재입장에 실패했어요. 다시 시도해주세요.",
        };
      }

      localStorage.setItem("honsul_session_id", data.id);
      lastSeatRef.current = data.seat_label;
      setSession(data);

      await cleanupStaleSessions(myId, seatLabel);

      console.log(`[Session] 세션 인수 완료: ${seatLabel} (${oldSessionId})`);
      return { ok: true, session: data, recovered: true };
    },
    [myId, storeId, cleanupStaleSessions],
  );

  // ───── 새 세션 만들기 ─────
  const createSession = useCallback(
    async (seatLabel) => {
      if (!myId || !seatLabel || !hasStoreScope(storeId)) {
        return { ok: false, reason: "invalid", message: "잘못된 요청입니다" };
      }

      // 1. 해당 좌석에 활성 세션 있는지 확인
      let existingSession;
      try {
        existingSession = await sessionRepository.getOpenSessionBySeat({
          storeId,
          seatLabel,
        });
      } catch (checkError) {
        console.error("좌석 중복 체크 실패:", checkError);
        return {
          ok: false,
          reason: "error",
          message: "좌석 확인 중 오류가 발생했어요",
        };
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
            existingSession: isStale
              ? {
                  id: existingSession.id,
                  seat_label: existingSession.seat_label,
                  nickname: existingSession.nickname,
                  opened_at: existingSession.opened_at,
                  last_active_at: existingSession.last_active_at,
                  secondsSinceActive: Math.floor(secondsSinceActive),
                }
              : null,
            message: isStale
              ? `'${seatLabel}' 자리에 조금 전까지 사용 중이던 세션이 있어요.`
              : `'${seatLabel}' 자리는 이미 사용 중이에요.\n다른 자리를 선택하거나 사장님께 문의해주세요.`,
          };
        }
      }

      // 3. 내가 다른 좌석에 열린 세션 모두 close
      const myOldSessions = await sessionRepository.listOpenSessionsByCustomer({
        storeId,
        customerId: myId,
      });

      if (myOldSessions && myOldSessions.length > 0) {
        await sessionRepository.closeSessionsByIds({
          storeId,
          sessionIds: myOldSessions.map((s) => s.id),
          closedAt: new Date().toISOString(),
        });
        console.log(
          `[Session] 기존 세션 ${myOldSessions.length}개 종료 → ${seatLabel}로 이동`,
          myOldSessions.map((s) => s.seat_label),
        );
        localStorage.removeItem("honsul_session_id");
      }

      // 4. 새 세션 생성
      let data;
      try {
        data = await sessionRepository.createSession({
          storeId,
          seatLabel,
          customerId: myId,
          nickname: myNickname,
          avatar: myAvatar,
        });
      } catch (error) {
        console.error("세션 생성 실패:", error);
        if (error.code === "23505") {
          return {
            ok: false,
            reason: "race_condition",
            message:
              "방금 다른 분이 먼저 입장하셨어요. 다른 자리를 선택해주세요.",
          };
        }
        return {
          ok: false,
          reason: "create_failed",
          message: "입장에 실패했어요. 다시 시도해주세요.",
        };
      }

      localStorage.setItem("honsul_session_id", data.id);
      lastSeatRef.current = data.seat_label;
      setSession(data);
      return { ok: true, session: data, reused: false };
    },
    [myId, myNickname, myAvatar, storeId, cleanupStaleSessions],
  );

  return {
    session: hasActiveScope ? session : null,
    loading: hasActiveScope ? loading : false,
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

import { useState, useEffect, useCallback, useRef } from "react";
import { sessionRepository } from "@/repositories/sessions/sessionRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";

/**
 * useSessionsAdmin
 * - 관리자: 활성 세션 목록 + 강제 해제 + 정산 + 자리이동 + 합석
 * - 오늘 매출 계산 (closed 세션의 주문 합산)
 *
 * 🆕 v2: realtime 갱신 시 setLoading(true) 안 함 → 화면 깜빡임 방지
 */
export function useSessionsAdmin(storeId) {
  const hasActiveScope = hasStoreScope(storeId);
  const [sessions, setSessions] = useState([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [loading, setLoading] = useState(hasActiveScope);
  const [error, setError] = useState(null);
  const initialFetchedRef = useRef(false); // 🆕 첫 로딩 완료 여부

  // 🆕 silent: true면 setLoading 호출 안 함 (백그라운드 갱신용)
  const fetchSessions = useCallback(
    async (silent = false) => {
      if (!hasStoreScope(storeId)) {
        setSessions([]);
        setLoading(false);
        initialFetchedRef.current = true;
        return;
      }
      if (!silent) setLoading(true);

      try {
        const data = await sessionRepository.listOpenSessions(storeId);
        setError(null);
        setSessions(data);
      } catch (err) {
        setError(err);
      }

      if (!silent) setLoading(false);
      initialFetchedRef.current = true;
    },
    [storeId],
  );

  // 오늘 매출 계산 — 정산 완료된 세션의 주문 합산
  const fetchTodayRevenue = useCallback(async () => {
    if (!hasStoreScope(storeId)) {
      setTodayRevenue(0);
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
      const total = await sessionRepository.getTodayClosedSessionRevenue({
        storeId,
        todayStart: todayStart.toISOString(),
      });
      setTodayRevenue(total);
    } catch (err) {
      console.error("오늘 매출 계산 실패:", err);
    }
  }, [storeId]);

  useEffect(() => {
    if (!hasActiveScope) return;

    // 첫 로딩: 로딩 표시
    const fetchTimer = setTimeout(() => {
      fetchSessions(false);
      fetchTodayRevenue();
    }, 0);

    const unsubscribe = sessionRepository.subscribeToSessionsAdmin({
      storeId,
      onSessionsChange: () => {
        // 🆕 realtime 갱신: silent (로딩 표시 안 함)
        fetchSessions(true);
        fetchTodayRevenue();
      },
      onOrdersChange: () => fetchTodayRevenue(),
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Sessions Admin",
          onSubscribed: () => {
            fetchSessions(true);
            fetchTodayRevenue();
          },
          onRecoverable: () => {
            fetchSessions(true);
            fetchTodayRevenue();
          },
        });
      },
    });

    return () => {
      clearTimeout(fetchTimer);
      unsubscribe();
    };
  }, [storeId, hasActiveScope, fetchSessions, fetchTodayRevenue]);

  // 강제 해제 (주문 없는 경우)
  const closeSession = useCallback(
    async (sessionId) => {
      if (!hasStoreScope(storeId)) return false;

      try {
        await sessionRepository.closeSession({
          storeId,
          sessionId,
          closedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("세션 종료 실패:", error);
        return false;
      }
      return true;
    },
    [storeId],
  );

  // 정산 (세션 닫고 주문 기록 유지)
  const settleSession = useCallback(
    async (sessionId) => {
      if (!hasStoreScope(storeId)) return false;

      const now = new Date().toISOString();
      try {
        await sessionRepository.markPendingOrdersServed({
          storeId,
          sessionId,
          servedAt: now,
        });
        await sessionRepository.closeSession({
          storeId,
          sessionId,
          closedAt: now,
        });
      } catch (error) {
        console.error("정산 실패:", error);
        return false;
      }
      return true;
    },
    [storeId],
  );

  // 자리 이동 (세션의 seat_label 변경 + 관련 주문도)
  const moveSession = useCallback(
    async (sessionId, newSeatLabel) => {
      if (!hasStoreScope(storeId)) return { ok: false, reason: "no_store" };

      const existing = await sessionRepository.getOpenSessionBySeat({
        storeId,
        seatLabel: newSeatLabel,
      });

      if (existing) {
        console.error("새 좌석이 이미 점유됨");
        return { ok: false, reason: "occupied" };
      }

      try {
        await sessionRepository.moveSessionSeat({
          storeId,
          sessionId,
          newSeatLabel,
          touchedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("자리 이동 실패:", error);
        return { ok: false, reason: "error" };
      }

      await sessionRepository.updateOrderSeatLabel({
        storeId,
        sessionId,
        seatLabel: newSeatLabel,
      });

      return { ok: true };
    },
    [storeId],
  );

  // 합석
  const mergeSession = useCallback(
    async (fromSessionId, toSeatLabel) => {
      if (!hasStoreScope(storeId)) return { ok: false, reason: "no_store" };

      if (!fromSessionId || !toSeatLabel) {
        return { ok: false, reason: "invalid" };
      }

      let fromSession;
      try {
        fromSession = await sessionRepository.getOpenSessionById({
          storeId,
          sessionId: fromSessionId,
        });
      } catch (error) {
        console.error("합석할 세션을 찾을 수 없음:", error);
        return { ok: false, reason: "from_not_found" };
      }
      if (!fromSession) {
        console.error("합석할 세션을 찾을 수 없음");
        return { ok: false, reason: "from_not_found" };
      }

      if (fromSession.seat_label === toSeatLabel) {
        return { ok: false, reason: "same_seat" };
      }

      let toSession;
      try {
        toSession = await sessionRepository.getOpenSessionBySeat({
          storeId,
          seatLabel: toSeatLabel,
        });
      } catch (error) {
        console.error("합석 대상 좌석에 세션이 없음:", error);
        return { ok: false, reason: "to_not_found" };
      }
      if (!toSession) {
        console.error("합석 대상 좌석에 세션이 없음");
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
        const fromJa =
          fromSession.nickname_ja || fromSession.nickname || "ゲスト";
        const toJa = toSession.nickname_ja || toSession.nickname || "ゲスト";
        mergedNicknameJa = `${toJa} + ${fromJa}`;
        if (mergedNicknameJa.length > 25) {
          const plusCount = (toJa.match(/\+/g) || []).length;
          mergedNicknameJa = `${toJa.split(" + ")[0]} 外${plusCount + 1}名`;
        }
      }

      try {
        await sessionRepository.transferOrdersToSession({
          storeId,
          fromSessionId,
          toSessionId: toSession.id,
          toSeatLabel,
        });
      } catch (error) {
        console.error("주문 이전 실패:", error);
        return { ok: false, reason: "orders_transfer_failed" };
      }

      const updatePayload = {
        nickname: mergedNickname,
        last_active_at: new Date().toISOString(),
      };
      if (mergedNicknameJa) {
        updatePayload.nickname_ja = mergedNicknameJa;
      }

      try {
        await sessionRepository.updateSession({
          storeId,
          sessionId: toSession.id,
          updates: updatePayload,
        });
      } catch (error) {
        console.error("대상 세션 업데이트 실패:", error);
      }

      try {
        await sessionRepository.closeSession({
          storeId,
          sessionId: fromSessionId,
          closedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("합석 후 원래 세션 종료 실패:", error);
        return { ok: false, reason: "close_failed" };
      }

      console.log(
        `[Merge] ${fromSession.seat_label}(${fromNickname}) → ${toSeatLabel}(${toNickname}) 합석 완료`,
      );
      return {
        ok: true,
        mergedNickname,
        fromSeat: fromSession.seat_label,
        toSeat: toSeatLabel,
        fromNickname,
        toNickname,
      };
    },
    [storeId],
  );

  return {
    sessions: hasActiveScope ? sessions : [],
    todayRevenue: hasActiveScope ? todayRevenue : 0,
    loading: hasActiveScope ? loading : false,
    error,
    closeSession,
    settleSession,
    moveSession,
    mergeSession,
    refetch: () => fetchSessions(false), // 수동 새로고침은 로딩 표시
  };
}

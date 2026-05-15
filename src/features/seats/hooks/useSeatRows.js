import { useState, useEffect, useCallback, useRef } from "react";
import { seatRepository } from "@/repositories/seats/seatRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";

/**
 * useSeatRows
 * - 매장의 좌석 행 설정 가져오기 (A줄 20석, B줄 20석 등)
 * - 실시간 변경 감지
 *
 * v2: 무한 로딩 방지
 *  - initial fetch만 loading=true, realtime refetch는 silent
 *  - fetch 실패해도 loading은 무조건 풀림
 *  - timeout 안전망 (10초 안에 응답 없으면 loading 강제 해제)
 *
 * @param {string} storeId - 매장 ID
 * @returns {object} { rows, allSeats, loading, error, refetch }
 */
export function useSeatRows(storeId) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);
  const initialFetchedRef = useRef(false);
  const fetchingRef = useRef(false);

  // 🆕 silent 옵션 추가 - realtime refetch는 loading 안 켜기
  const fetchRows = useCallback(
    async (silent = false) => {
      if (!storeId) {
        setLoading(false);
        return;
      }

      // 동시 fetch 방지
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      // 초기 로드만 loading=true, realtime은 silent
      if (!silent && !initialFetchedRef.current) {
        setLoading(true);
      }

      // 🆕 안전망: 10초 안에 안 끝나면 loading 강제 해제
      const timeoutId = setTimeout(() => {
        console.warn("[useSeatRows] fetch 타임아웃 - loading 강제 해제");
        setLoading(false);
        fetchingRef.current = false;
      }, 10000);

      try {
        const data = await seatRepository.listSeatRows(storeId);

        clearTimeout(timeoutId);
        setError(null);
        setRows(data);
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("[useSeatRows] fetch 예외:", err);
        setError(err);
      } finally {
        // 🆕 무조건 loading 풀기
        setLoading(false);
        initialFetchedRef.current = true;
        fetchingRef.current = false;
      }
    },
    [storeId],
  );

  useEffect(() => {
    if (!storeId) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;

    // 초기 로드
    const fetchTimer = setTimeout(() => {
      fetchRows(false);
    }, 0);

    // 이전 채널 정리 (StrictMode 안전장치)
    if (channelRef.current) {
      channelRef.current();
      channelRef.current = null;
    }

    // 새 채널 생성
    const unsubscribe = seatRepository.subscribeToSeatRows({
      storeId,
      onChange: () => {
        // 🆕 realtime 변경은 silent fetch (로딩 화면 안 띄움)
        if (!cancelled) fetchRows(true);
      },
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Seat Rows",
          onSubscribed: () => {
            if (!cancelled) fetchRows(true);
          },
          onRecoverable: () => {
            if (!cancelled) fetchRows(true);
          },
        });
      },
    });

    channelRef.current = unsubscribe;

    return () => {
      cancelled = true;
      clearTimeout(fetchTimer);
      if (channelRef.current) {
        channelRef.current();
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // 모든 좌석 평탄화 — A줄 20석 + B줄 20석 → ['A-1', 'A-2', ..., 'B-20']
  const allSeats = rows.flatMap((row) =>
    Array.from({ length: row.seat_count }, (_, i) => `${row.name}-${i + 1}`),
  );

  // 🆕 수동 refetch는 silent (UI 깜빡임 방지)
  const refetch = useCallback(() => fetchRows(true), [fetchRows]);

  return {
    rows,
    allSeats,
    loading,
    error,
    refetch,
  };
}

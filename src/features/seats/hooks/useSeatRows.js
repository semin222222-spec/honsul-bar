import { useState, useEffect, useCallback, useRef } from "react";
import { seatRepository } from "@/repositories/seats/seatRepository";
import {
  handleRealtimeSubscribeStatus,
  onRealtimeRecover,
} from "@/shared/realtime/realtimeHealth";

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
  // 진행 중 fetch의 AbortController를 들고 있다가 새 fetch가 들어오면 abort한다.
  // 이전엔 fetchingRef boolean으로 새 fetch를 스킵했는데, 첫 fetch가 hang되면
  // 후속 fetch가 영원히 스킵되어 데이터가 갱신되지 않는 문제가 있었음.
  const inflightControllerRef = useRef(null);

  // AbortController + 재시도 + "최신 fetch만 commit" 패턴
  // - 12초 후 abort → 재시도 (Chrome 백그라운드 후 stale connection으로 hang되는 경우 회피)
  // - 새 fetchRows가 들어오면 진행 중 fetch는 abort. 최신 호출만 setRows 한다.
  // - 최대 2회 재시도 (총 3 시도).
  const fetchRows = useCallback(
    async (silent = false) => {
      if (!storeId) {
        setLoading(false);
        return;
      }

      // 직전 fetch가 진행 중이면 abort하고 시작 (hang 우회)
      inflightControllerRef.current?.abort();

      if (!silent && !initialFetchedRef.current) {
        setLoading(true);
      }

      const MAX_RETRIES = 2;
      let attempt = 0;
      let success = false;
      let myController = null;

      while (attempt <= MAX_RETRIES) {
        const controller = new AbortController();
        myController = controller;
        inflightControllerRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        try {
          const data = await seatRepository.listSeatRows(
            storeId,
            controller.signal,
          );
          clearTimeout(timeoutId);
          // 다른 fetch가 시작돼 우리가 더이상 current가 아니면 결과 버린다.
          if (inflightControllerRef.current !== controller) return;
          setError(null);
          setRows(data);
          success = true;
          break;
        } catch (err) {
          clearTimeout(timeoutId);

          // 다른 fetch가 우리를 abort한 거면 조용히 종료
          if (inflightControllerRef.current !== controller) return;

          const isAbort =
            err?.name === "AbortError" ||
            /abort/i.test(err?.message ?? "") ||
            controller.signal.aborted;

          if (isAbort && attempt < MAX_RETRIES) {
            console.warn(
              `[useSeatRows] fetch 타임아웃(abort) - 재시도 ${attempt + 1}/${MAX_RETRIES}`,
            );
            attempt += 1;
            await new Promise((resolve) => setTimeout(resolve, 800));
            continue;
          }

          if (isAbort) {
            console.warn("[useSeatRows] fetch 최종 실패 (재시도 소진)");
          } else {
            console.error("[useSeatRows] fetch 예외:", err);
            setError(err);
          }
          break;
        }
      }

      // 우리가 여전히 current면 cleanup
      if (inflightControllerRef.current === myController) {
        inflightControllerRef.current = null;
      }
      setLoading(false);
      initialFetchedRef.current = true;
      return success;
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

    // 채널 state가 "joined" 상태로 남아있는 동안에도 메시지를 못 받는
    // 케이스를 대비해, 전역 복구 이벤트에 직접 refetch를 건다.
    const offRecover = onRealtimeRecover(() => {
      if (!cancelled) fetchRows(true);
    });

    return () => {
      cancelled = true;
      clearTimeout(fetchTimer);
      offRecover();
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

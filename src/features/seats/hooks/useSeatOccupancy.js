import { useState, useEffect, useCallback } from "react";
import { seatRepository } from "@/repositories/seats/seatRepository";
import {
  handleRealtimeSubscribeStatus,
  onRealtimeRecover,
} from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";

/**
 * useSeatOccupancy
 * - sessions 테이블에서 status='open'인 세션을 읽어 좌석 점유 맵 반환
 * - 실시간으로 INSERT/UPDATE 감지해서 좌석 상태 갱신
 */
export function useSeatOccupancy(storeId) {
  const hasActiveScope = hasStoreScope(storeId);
  const [occupiedSeats, setOccupiedSeats] = useState(new Map());

  const refresh = useCallback(async () => {
    if (!hasStoreScope(storeId)) {
      setOccupiedSeats(new Map());
      return;
    }

    let data;
    try {
      data = await seatRepository.listOpenSeatOccupancy(storeId);
    } catch (error) {
      console.error("좌석 점유 조회 실패:", error);
      return;
    }

    const seatMap = new Map();
    (data || []).forEach((s) => {
      seatMap.set(s.seat_label, {
        nickname: s.nickname,
        avatar: s.avatar,
        customerId: s.customer_id,
      });
    });
    setOccupiedSeats(seatMap);
  }, [storeId]);

  useEffect(() => {
    if (!hasActiveScope) return;

    const refreshTimer = setTimeout(refresh, 0);

    // 실시간 구독 — 누가 앉거나 정산하면 바로 갱신
    const unsubscribe = seatRepository.subscribeToSeatOccupancy({
      storeId,
      onChange: () => {
        refresh();
      },
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Seat Occupancy",
          onSubscribed: refresh,
          onRecoverable: refresh,
        });
      },
    });

    const offRecover = onRealtimeRecover(() => refresh());

    return () => {
      clearTimeout(refreshTimer);
      offRecover();
      unsubscribe();
    };
  }, [storeId, hasActiveScope, refresh]);

  return { occupiedSeats: hasActiveScope ? occupiedSeats : new Map() };
}

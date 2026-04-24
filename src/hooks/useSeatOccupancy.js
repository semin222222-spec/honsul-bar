import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useSeatOccupancy
 * - sessions 테이블에서 status='open'인 세션을 읽어 좌석 점유 맵 반환
 * - 실시간으로 INSERT/UPDATE 감지해서 좌석 상태 갱신
 */
export function useSeatOccupancy() {
  const [occupiedSeats, setOccupiedSeats] = useState(new Map());

  const refresh = async () => {
    const { data, error } = await supabase
      .from("sessions")
      .select("seat_label, nickname, avatar, customer_id")
      .eq("status", "open");

    if (error) {
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
  };

  useEffect(() => {
    refresh();

    // 실시간 구독 — 누가 앉거나 정산하면 바로 갱신
    const channel = supabase
      .channel("seat-occupancy")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { occupiedSeats };
}

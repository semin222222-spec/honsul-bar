import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useSeatOccupancy
 * - 좌석 선택 화면에서 이미 누군가 앉아있는 좌석을 엿보기 위한 훅
 * - usePresence 채널에 '관찰자'로만 접속 (내 정보는 broadcast 하지 않음)
 * - 반환: { occupiedSeats: Map<seatLabel, {nickname, avatar}> }
 */
export function useSeatOccupancy() {
  const [occupiedSeats, setOccupiedSeats] = useState(new Map());

  useEffect(() => {
    // usePresence와 같은 채널 이름 사용 (bar-presence)
    const channel = supabase.channel("bar-presence-observer", {
      config: {
        presence: { key: "observer-" + crypto.randomUUID() },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        // 실제 presence 채널은 "bar-presence"인데
        // 관찰용으로는 다른 방식이 필요함 → bar-presence 자체에 구독
      })
      .subscribe();

    // 실제로 bar-presence 채널에 접속해서 presence 상태만 읽기
    const observerChannel = supabase.channel("bar-presence", {
      config: {
        presence: { key: "observer-only-" + Date.now() },
      },
    });

    observerChannel
      .on("presence", { event: "sync" }, () => {
        const state = observerChannel.presenceState();
        const seatMap = new Map();
        Object.entries(state).forEach(([key, presences]) => {
          if (key.startsWith("observer-")) return; // 관찰자 자신은 무시
          if (presences.length > 0) {
            const p = presences[0];
            if (p.seat) {
              seatMap.set(p.seat, {
                nickname: p.nickname,
                avatar: p.avatar,
                status: p.status,
              });
            }
          }
        });
        setOccupiedSeats(seatMap);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(observerChannel);
    };
  }, []);

  return { occupiedSeats };
}

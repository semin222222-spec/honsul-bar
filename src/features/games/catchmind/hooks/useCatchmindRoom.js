import { useState, useEffect, useCallback, useRef } from "react";
import { catchmindRepository } from "@/repositories/games/catchmindRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";
import { MAX_PLAYERS, MIN_PLAYERS } from "../lib/catchmindRules";

/**
 * useCatchmindRoom
 *
 * 캐치마인드 로비 + 방 가입 상태를 관리.
 *
 * - 매장의 활성 방 리스트(Realtime)
 * - 내가 속한 방 (`myRoom`) — 다른 단계 훅이 이 값을 소비
 * - 액션: 방 만들기 / 입장 / 퇴장 / 게임 시작
 *
 * 게임 진행 자체(드로잉, 채팅, 타이머)는 useCatchmindGame 에서 처리.
 */
export function useCatchmindRoom({ sessionId, seatLabel, storeId }) {
  const [rooms, setRooms] = useState([]);
  const [myRoom, setMyRoom] = useState(null); // 내가 들어가 있는 방
  const [loading, setLoading] = useState(false);

  const unsubRef = useRef(null);

  const refreshRooms = useCallback(async () => {
    if (!hasStoreScope(storeId)) return;
    try {
      const data = await catchmindRepository.listRoomsByStore(storeId);
      setRooms(data);
      // 내가 어딘가 들어가 있는지 동기화
      const mine = data.find((r) =>
        (r.players || []).some((p) => p.session_id === sessionId),
      );
      setMyRoom(mine || null);
    } catch (err) {
      console.error("[Catchmind] 방 목록 조회 실패:", err);
    }
  }, [storeId, sessionId]);

  // 매장 방 리스트 Realtime 구독
  useEffect(() => {
    if (!hasStoreScope(storeId)) return;

    const unsubscribe = catchmindRepository.subscribeToStoreRooms({
      storeId,
      onChange: () => {
        // INSERT/UPDATE/DELETE 모두 전체 refresh가 안전
        refreshRooms();
      },
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Catchmind Lobby",
          onSubscribed: refreshRooms,
          onRecoverable: refreshRooms,
        });
      },
    });
    unsubRef.current = unsubscribe;

    const timer = setTimeout(refreshRooms, 0);

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [storeId, refreshRooms]);

  // ─────────────────────────────────────────
  // 방 만들기 (방장으로)
  // ─────────────────────────────────────────
  const createRoom = useCallback(async () => {
    if (!sessionId || !hasStoreScope(storeId)) {
      return { ok: false, error: "정보가 부족해요" };
    }
    if (myRoom) {
      return { ok: false, error: "이미 참여 중인 방이 있어요" };
    }

    setLoading(true);
    try {
      const data = await catchmindRepository.createRoom({
        store_id: storeId,
        host_session_id: sessionId,
        host_seat_label: seatLabel,
        status: "waiting",
        players: [
          {
            session_id: sessionId,
            seat_label: seatLabel,
            score: 0,
            has_passed: false,
          },
        ],
        current_round: 0,
        total_rounds: 0,
      });
      setMyRoom(data);
      return { ok: true, room: data };
    } catch (err) {
      console.error("[Catchmind] 방 생성 실패:", err);
      return { ok: false, error: "방을 만들지 못했어요" };
    } finally {
      setLoading(false);
    }
  }, [sessionId, seatLabel, storeId, myRoom]);

  // ─────────────────────────────────────────
  // 방 입장
  // ─────────────────────────────────────────
  const joinRoom = useCallback(
    async (roomId) => {
      if (!sessionId || !hasStoreScope(storeId)) {
        return { ok: false, error: "정보가 부족해요" };
      }
      if (myRoom) {
        return { ok: false, error: "이미 참여 중인 방이 있어요" };
      }

      setLoading(true);
      try {
        // 최신 상태 가져오기
        const room = await catchmindRepository.getRoom(roomId);
        if (!room) return { ok: false, error: "방을 찾을 수 없어요" };
        if (room.store_id !== storeId)
          return { ok: false, error: "다른 매장의 방이에요" };
        if (room.status !== "waiting")
          return { ok: false, error: "이미 시작된 게임이에요" };

        const players = room.players || [];
        if (players.some((p) => p.session_id === sessionId)) {
          setMyRoom(room);
          return { ok: true, room };
        }
        if (players.length >= MAX_PLAYERS)
          return { ok: false, error: "정원이 가득 찼어요" };

        const nextPlayers = [
          ...players,
          {
            session_id: sessionId,
            seat_label: seatLabel,
            score: 0,
            has_passed: false,
          },
        ];

        const updated = await catchmindRepository.updateRoom({
          roomId,
          updates: { players: nextPlayers },
          guard: { status: "waiting" },
        });

        if (!updated)
          return { ok: false, error: "방 상태가 바뀌었어요. 다시 시도해주세요." };

        setMyRoom(updated);
        return { ok: true, room: updated };
      } catch (err) {
        console.error("[Catchmind] 방 입장 실패:", err);
        return { ok: false, error: "입장에 실패했어요" };
      } finally {
        setLoading(false);
      }
    },
    [sessionId, seatLabel, storeId, myRoom],
  );

  // ─────────────────────────────────────────
  // 방 퇴장 (방장이면 위임, 아니면 그냥 빠짐)
  // ─────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    if (!myRoom || !sessionId) return;

    const roomId = myRoom.id;
    const players = (myRoom.players || []).filter(
      (p) => p.session_id !== sessionId,
    );

    try {
      if (players.length === 0) {
        // 모두 나가면 방 삭제
        await catchmindRepository.deleteRoom(roomId);
      } else {
        const wasHost = myRoom.host_session_id === sessionId;
        const updates = { players };
        if (wasHost) {
          // 방장 위임
          updates.host_session_id = players[0].session_id;
          updates.host_seat_label = players[0].seat_label;
        }
        await catchmindRepository.updateRoom({
          roomId,
          updates,
          returning: false,
        });
      }
    } catch (err) {
      console.error("[Catchmind] 방 퇴장 실패:", err);
    } finally {
      setMyRoom(null);
    }
  }, [myRoom, sessionId]);

  // ─────────────────────────────────────────
  // 게임 시작 (방장 only)
  // ─────────────────────────────────────────
  const startGame = useCallback(async () => {
    if (!myRoom) return { ok: false, error: "방이 없어요" };
    if (myRoom.host_session_id !== sessionId)
      return { ok: false, error: "방장만 시작할 수 있어요" };
    if ((myRoom.players || []).length < MIN_PLAYERS)
      return { ok: false, error: "최소 2명 이상 필요해요" };

    try {
      const updated = await catchmindRepository.updateRoom({
        roomId: myRoom.id,
        updates: {
          status: "countdown",
          started_at: new Date().toISOString(),
        },
        guard: { status: "waiting" },
      });
      if (!updated)
        return {
          ok: false,
          error: "방 상태가 바뀌었어요. 다시 시도해주세요.",
        };
      return { ok: true };
    } catch (err) {
      console.error("[Catchmind] 게임 시작 실패:", err);
      return { ok: false, error: "시작에 실패했어요" };
    }
  }, [myRoom, sessionId]);

  // 방 강제 새로고침 (외부에서)
  const setRoomDirect = useCallback((room) => setMyRoom(room), []);

  // 내가 방장인지
  const isHost = !!myRoom && myRoom.host_session_id === sessionId;

  return {
    rooms,
    myRoom,
    isHost,
    loading,
    refreshRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    setRoomDirect,
  };
}

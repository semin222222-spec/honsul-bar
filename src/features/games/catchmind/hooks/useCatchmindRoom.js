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
      // myRoom은 명시적인 createRoom/joinRoom/leaveRoom 액션과
      // subscribeToRoom 이벤트로만 갱신한다. 자동 재참여 안 함.
      // (이전엔 들어오자마자 내 session_id가 있는 방으로 자동 진입돼서
      //  유령 방 때문에 "내 방이 자동 생성된 것처럼" 보이는 버그가 있었음)
    } catch (err) {
      console.error("[Catchmind] 방 목록 조회 실패:", err);
    }
  }, [storeId]);

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

        const players = room.players || [];
        // 이미 player에 있으면 status 무관하게 재참여 허용 (새로고침 복구)
        if (players.some((p) => p.session_id === sessionId)) {
          setMyRoom(room);
          return { ok: true, room };
        }
        // 새로 들어가는 경우엔 waiting 상태만 허용
        if (room.status !== "waiting")
          return { ok: false, error: "이미 시작된 게임이에요" };
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
  //
  // ⚠️ UX 원칙: "로비로 나가기" 버튼은 항상 즉시 로비로 가야 한다.
  //   - sessionId가 일시적으로 없거나(세션 재발급 등) 본인이 players에 없는
  //     상태로 결과 화면에 머물러 있는 경우에도 버튼이 동작해야 한다.
  //   - 따라서 setMyRoom(null)을 먼저 동기적으로 실행한 다음, DB 정리는
  //     best-effort로 진행한다 (사용자 체감엔 즉시 로비로 이동).
  // ─────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    if (!myRoom) return;

    const roomId = myRoom.id;
    const myPlayers = myRoom.players || [];
    const wasInPlayers =
      !!sessionId && myPlayers.some((p) => p.session_id === sessionId);

    // 1) 로컬 즉시 정리 — 무조건 로비로 보낸다
    setMyRoom(null);

    // 2) 본인이 players에 없거나 sessionId가 없으면 DB는 건드릴 게 없음
    if (!sessionId || !wasInPlayers) return;

    // 3) DB best-effort cleanup
    const remaining = myPlayers.filter(
      (p) => p.session_id !== sessionId,
    );

    try {
      if (remaining.length === 0) {
        await catchmindRepository.deleteRoom(roomId);
      } else {
        const wasHost = myRoom.host_session_id === sessionId;
        const updates = { players: remaining };
        if (wasHost) {
          updates.host_session_id = remaining[0].session_id;
          updates.host_seat_label = remaining[0].seat_label;
        }
        await catchmindRepository.updateRoom({
          roomId,
          updates,
          returning: false,
        });
      }
    } catch (err) {
      console.error("[Catchmind] 방 퇴장 DB 정리 실패:", err);
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

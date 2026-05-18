import { useState, useEffect, useCallback, useRef } from "react";
import { shieldRepository } from "@/repositories/games/shieldRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  HEARTBEAT_MS,
  ZOMBIE_THRESHOLD_MS,
  ZOMBIE_CHECK_MS,
} from "../lib/shieldRules";
import { generateRandomInitials } from "../lib/shieldInitials";

/**
 * useShieldRoom
 *
 * 5초 쉴드 게임의 방 lifecycle을 관리.
 *  - 로비 진입 시 cleanup RPC 1회 호출 (좀비 방 정리)
 *  - 매장 활성 방 목록 Realtime
 *  - 내가 들어가 있는 방 (`myRoom`)
 *  - createRoom / joinRoom / leaveRoom / startGame
 *  - heartbeat (30s) — 내가 방에 있을 때 last_seen_at 갱신
 *  - 좀비 player 자동 정리 (90s 안 보이면 leaveRoomRpc로 제거)
 *  - 페이지 이탈 (beforeunload + pagehide) → fetch keepalive
 */
export function useShieldRoom({ sessionId, seatLabel, storeId }) {
  const [rooms, setRooms] = useState([]);
  const [myRoom, setMyRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshRooms = useCallback(async () => {
    if (!hasStoreScope(storeId)) return;
    try {
      const data = await shieldRepository.listRoomsByStore(storeId);
      setRooms(data);
    } catch (err) {
      console.error("[Shield] 방 목록 조회 실패:", err);
    }
  }, [storeId]);

  // 로비 진입 시 cleanup RPC 한 번
  useEffect(() => {
    if (!hasStoreScope(storeId)) return;
    shieldRepository
      .cleanupRoomsRpc({ storeId })
      .catch((err) => console.error("[Shield] cleanup RPC 실패:", err));
  }, [storeId]);

  // 매장 방 리스트 Realtime
  useEffect(() => {
    if (!hasStoreScope(storeId)) return;

    const unsubscribe = shieldRepository.subscribeToStoreRooms({
      storeId,
      onChange: () => {
        refreshRooms();
      },
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Shield Lobby",
          onSubscribed: refreshRooms,
          onRecoverable: refreshRooms,
        });
      },
    });

    const timer = setTimeout(refreshRooms, 0);

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [storeId, refreshRooms]);

  // ─────────────────────────────────────────
  // 방 만들기
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
      const nowIso = new Date().toISOString();
      const data = await shieldRepository.createRoom({
        store_id: storeId,
        host_session_id: sessionId,
        host_seat_label: seatLabel,
        status: "waiting",
        players: [
          {
            session_id: sessionId,
            seat_label: seatLabel,
            status: "alive",
            joined_at: nowIso,
            last_seen_at: nowIso,
          },
        ],
        current_round: 0,
      });
      setMyRoom(data);
      return { ok: true, room: data };
    } catch (err) {
      console.error("[Shield] 방 생성 실패:", err);
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
        const room = await shieldRepository.getRoom(roomId);
        if (!room) return { ok: false, error: "방을 찾을 수 없어요" };
        if (room.store_id !== storeId)
          return { ok: false, error: "다른 매장의 방이에요" };

        const players = room.players || [];

        if (players.some((p) => p.session_id === sessionId)) {
          setMyRoom(room);
          return { ok: true, room };
        }
        if (room.status !== "waiting")
          return { ok: false, error: "이미 시작된 게임이에요" };
        if (players.length >= MAX_PLAYERS)
          return { ok: false, error: "정원이 가득 찼어요" };

        const nowIso = new Date().toISOString();
        const nextPlayers = [
          ...players,
          {
            session_id: sessionId,
            seat_label: seatLabel,
            status: "alive",
            joined_at: nowIso,
            last_seen_at: nowIso,
          },
        ];

        const updated = await shieldRepository.updateRoom({
          roomId,
          updates: { players: nextPlayers },
          guard: { status: "waiting" },
        });

        if (!updated)
          return { ok: false, error: "방 상태가 바뀌었어요. 다시 시도해주세요." };

        setMyRoom(updated);
        return { ok: true, room: updated };
      } catch (err) {
        console.error("[Shield] 방 입장 실패:", err);
        return { ok: false, error: "입장에 실패했어요" };
      } finally {
        setLoading(false);
      }
    },
    [sessionId, seatLabel, storeId, myRoom],
  );

  // ─────────────────────────────────────────
  // 방 퇴장
  //
  // UX 원칙: "로비로 나가기" 버튼은 즉시 로비로 가야 한다 (myRoom = null 동기 처리).
  // DB 정리는 leaveRoomRpc로 best-effort.
  // ─────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    if (!myRoom) return;

    const roomId = myRoom.id;
    const wasInPlayers =
      !!sessionId &&
      (myRoom.players || []).some((p) => p.session_id === sessionId);

    setMyRoom(null);
    if (!sessionId || !wasInPlayers) return;

    try {
      await shieldRepository.leaveRoomRpc({ roomId, sessionId });
    } catch (err) {
      console.error("[Shield] 방 퇴장 RPC 실패:", err);
    }
  }, [myRoom, sessionId]);

  // ─────────────────────────────────────────
  // 게임 시작 (방장 only)
  //  - 첫 차례 / 첫 초성 / current_turn_started_at 까지 한 번에 set
  // ─────────────────────────────────────────
  const startGame = useCallback(async () => {
    if (!myRoom) return { ok: false, error: "방이 없어요" };
    if (myRoom.host_session_id !== sessionId)
      return { ok: false, error: "방장만 시작할 수 있어요" };

    const players = myRoom.players || [];
    if (players.length < MIN_PLAYERS)
      return { ok: false, error: "최소 2명 이상 필요해요" };

    try {
      const firstPlayer = players[0];
      const nowIso = new Date().toISOString();
      const initials = generateRandomInitials();

      const updated = await shieldRepository.updateRoom({
        roomId: myRoom.id,
        updates: {
          status: "playing",
          started_at: nowIso,
          current_round: 1,
          current_turn_session_id: firstPlayer.session_id,
          current_initials: initials,
          current_turn_started_at: nowIso,
          last_eliminated: null,
        },
        guard: { status: "waiting" },
      });
      if (!updated)
        return { ok: false, error: "방 상태가 바뀌었어요. 다시 시도해주세요." };
      return { ok: true };
    } catch (err) {
      console.error("[Shield] 게임 시작 실패:", err);
      return { ok: false, error: "시작에 실패했어요" };
    }
  }, [myRoom, sessionId]);

  // ─────────────────────────────────────────
  // Heartbeat — 내가 방에 있을 때만
  // ─────────────────────────────────────────
  const roomIdForHeartbeat = myRoom?.id || null;
  useEffect(() => {
    if (!roomIdForHeartbeat || !sessionId) return;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      shieldRepository
        .heartbeatRpc({ roomId: roomIdForHeartbeat, sessionId })
        .catch((err) => console.error("[Shield] heartbeat 실패:", err));
    };
    tick(); // 즉시 한 번
    const id = setInterval(tick, HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [roomIdForHeartbeat, sessionId]);

  // ─────────────────────────────────────────
  // 좀비 player 자동 정리 — 90s 안 보이는 다른 player를 leaveRoomRpc로 제거
  // (어느 클라이언트든 먼저 감지한 쪽이 처리)
  // ─────────────────────────────────────────
  const myRoomRef = useRef(myRoom);
  useEffect(() => {
    myRoomRef.current = myRoom;
  }, [myRoom]);

  useEffect(() => {
    if (!roomIdForHeartbeat || !sessionId) return;

    const check = () => {
      const r = myRoomRef.current;
      if (!r) return;
      const now = Date.now();
      const players = r.players || [];
      const zombies = players.filter((p) => {
        if (!p || p.session_id === sessionId) return false;
        // 게임 중 'dead' 처리된 사람은 last_seen_at 무관 — 결과 화면 표시용
        if (p.status === "dead") return false;
        const lastSeen = p.last_seen_at
          ? new Date(p.last_seen_at).getTime()
          : 0;
        return now - lastSeen > ZOMBIE_THRESHOLD_MS;
      });
      zombies.forEach((z) => {
        shieldRepository
          .leaveRoomRpc({ roomId: r.id, sessionId: z.session_id })
          .catch((err) => console.error("[Shield] 좀비 정리 실패:", err));
      });
    };

    const id = setInterval(check, ZOMBIE_CHECK_MS);
    return () => clearInterval(id);
  }, [roomIdForHeartbeat, sessionId]);

  // ─────────────────────────────────────────
  // 페이지 이탈 감지 (beforeunload + pagehide)
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!roomIdForHeartbeat || !sessionId) return;

    const fire = () => {
      shieldRepository.sendLeaveBeacon({
        roomId: roomIdForHeartbeat,
        sessionId,
      });
    };
    window.addEventListener("beforeunload", fire);
    window.addEventListener("pagehide", fire);
    return () => {
      window.removeEventListener("beforeunload", fire);
      window.removeEventListener("pagehide", fire);
    };
  }, [roomIdForHeartbeat, sessionId]);

  // 외부에서 room을 직접 set (subscribeToRoom payload 등)
  const setRoomDirect = useCallback((room) => setMyRoom(room), []);

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

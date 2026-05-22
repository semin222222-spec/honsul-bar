import { useState, useEffect, useCallback, useRef } from "react";
import { callMyNameRepository } from "@/repositories/games/callMyNameRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  INITIAL_LIVES,
  HEARTBEAT_MS,
  ZOMBIE_THRESHOLD_MS,
  ZOMBIE_CHECK_MS,
} from "../lib/callMyNameRules";
import { pickIdentities } from "../data/callMyNameKeywords";

/**
 * useCallMyNameRoom
 *
 * 콜 마이 네임 방 lifecycle을 관리한다. (드립/라이어 패턴 그대로)
 *  A) leave 즉시 정리 — leave_call_my_name_room RPC (0명이면 DB가 DELETE)
 *  B) Heartbeat 30s
 *  C) 좀비 player 자동 정리 90s
 *  D) 페이지 이탈 — fetch keepalive
 *  E) 로비 진입 시 cleanup RPC 1회
 */
export function useCallMyNameRoom({ sessionId, seatLabel, storeId }) {
  const [rooms, setRooms] = useState([]);
  const [myRoom, setMyRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshRooms = useCallback(async () => {
    if (!hasStoreScope(storeId)) return;
    try {
      const data = await callMyNameRepository.listRoomsByStore(storeId);
      setRooms(data);
    } catch (err) {
      console.error("[CallMyName] 방 목록 조회 실패:", err);
    }
  }, [storeId]);

  // E) 로비 진입 시 cleanup RPC
  useEffect(() => {
    if (!hasStoreScope(storeId)) return;
    callMyNameRepository
      .cleanupRoomsRpc({ storeId })
      .catch((err) => console.error("[CallMyName] cleanup RPC 실패:", err));
  }, [storeId]);

  // 매장 방 리스트 Realtime
  useEffect(() => {
    if (!hasStoreScope(storeId)) return;

    const unsubscribe = callMyNameRepository.subscribeToStoreRooms({
      storeId,
      onChange: () => {
        refreshRooms();
      },
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "CallMyName Lobby",
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
      const data = await callMyNameRepository.createRoom({
        store_id: storeId,
        host_session_id: sessionId,
        host_seat_label: seatLabel,
        status: "waiting",
        players: [
          {
            session_id: sessionId,
            seat_label: seatLabel,
            joined_at: nowIso,
            last_seen_at: nowIso,
          },
        ],
      });
      setMyRoom(data);
      return { ok: true, room: data };
    } catch (err) {
      console.error("[CallMyName] 방 생성 실패:", err);
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
        const room = await callMyNameRepository.getRoom(roomId);
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
            joined_at: nowIso,
            last_seen_at: nowIso,
          },
        ];

        const updated = await callMyNameRepository.updateRoom({
          roomId,
          updates: { players: nextPlayers },
          guard: { status: "waiting" },
        });

        if (!updated)
          return { ok: false, error: "방 상태가 바뀌었어요. 다시 시도해주세요." };

        setMyRoom(updated);
        return { ok: true, room: updated };
      } catch (err) {
        console.error("[CallMyName] 방 입장 실패:", err);
        return { ok: false, error: "입장에 실패했어요" };
      } finally {
        setLoading(false);
      }
    },
    [sessionId, seatLabel, storeId, myRoom],
  );

  // ─────────────────────────────────────────
  // 방 퇴장 — 즉시 로비 복귀 + best-effort DB 정리
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
      await callMyNameRepository.leaveRoomRpc({ roomId, sessionId });
    } catch (err) {
      console.error("[CallMyName] 방 퇴장 RPC 실패:", err);
    }
  }, [myRoom, sessionId]);

  // ─────────────────────────────────────────
  // 게임 시작 (방장 only) — 각자에게 정체 키워드 랜덤 배정 후 playing
  // ─────────────────────────────────────────
  const startGame = useCallback(async () => {
    if (!myRoom) return { ok: false, error: "방이 없어요" };
    if (myRoom.host_session_id !== sessionId)
      return { ok: false, error: "방장만 시작할 수 있어요" };

    const players = myRoom.players || [];
    if (players.length < MIN_PLAYERS)
      return { ok: false, error: `최소 ${MIN_PLAYERS}명 이상 필요해요` };

    try {
      const identities = pickIdentities(players.length);
      const nowIso = new Date().toISOString();
      const assigned = players.map((p, i) => ({
        ...p,
        identity_keyword: identities[i]?.keyword ?? null,
        identity_category: identities[i]?.category ?? null,
        lives_remaining: INITIAL_LIVES,
        status: "playing",
        solved_at: null,
      }));

      const updated = await callMyNameRepository.updateRoom({
        roomId: myRoom.id,
        updates: {
          status: "playing",
          players: assigned,
          started_at: nowIso,
          finished_at: null,
        },
        guard: { status: "waiting" },
      });
      if (!updated)
        return { ok: false, error: "방 상태가 바뀌었어요. 다시 시도해주세요." };
      return { ok: true };
    } catch (err) {
      console.error("[CallMyName] 게임 시작 실패:", err);
      return { ok: false, error: "시작에 실패했어요" };
    }
  }, [myRoom, sessionId]);

  // ─────────────────────────────────────────
  // B) Heartbeat
  // ─────────────────────────────────────────
  const roomIdForHeartbeat = myRoom?.id || null;
  useEffect(() => {
    if (!roomIdForHeartbeat || !sessionId) return;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      callMyNameRepository
        .heartbeatRpc({ roomId: roomIdForHeartbeat, sessionId })
        .catch((err) => console.error("[CallMyName] heartbeat 실패:", err));
    };
    tick();
    const id = setInterval(tick, HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [roomIdForHeartbeat, sessionId]);

  // ─────────────────────────────────────────
  // C) 좀비 player 자동 정리
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
        const lastSeen = p.last_seen_at
          ? new Date(p.last_seen_at).getTime()
          : 0;
        return now - lastSeen > ZOMBIE_THRESHOLD_MS;
      });
      zombies.forEach((z) => {
        callMyNameRepository
          .leaveRoomRpc({ roomId: r.id, sessionId: z.session_id })
          .catch((err) => console.error("[CallMyName] 좀비 정리 실패:", err));
      });
    };

    const id = setInterval(check, ZOMBIE_CHECK_MS);
    return () => clearInterval(id);
  }, [roomIdForHeartbeat, sessionId]);

  // ─────────────────────────────────────────
  // D) 페이지 이탈
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!roomIdForHeartbeat || !sessionId) return;

    const fire = () => {
      callMyNameRepository.sendLeaveBeacon({
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

import { useState, useEffect, useCallback, useRef } from "react";
import { liarRepository } from "@/repositories/games/liarRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  HEARTBEAT_MS,
  ZOMBIE_THRESHOLD_MS,
  ZOMBIE_CHECK_MS,
} from "../lib/liarRules";
import { pickRandomWord } from "../data/liarWords";

/**
 * useLiarRoom
 *
 * 라이어 게임 방 lifecycle을 관리한다.
 *  A) 게임 종료 후 자동 방 삭제 — useLiarGame이 onLeaveAfterFinish 호출
 *  B) leave 즉시 정리 — leave_liar_room RPC (0명이면 DB가 DELETE)
 *  C) Heartbeat 30s
 *  D) 좀비 player 자동 정리 90s
 *  E) 페이지 이탈 — fetch keepalive
 *  F) 로비 진입 시 cleanup RPC 1회
 */
export function useLiarRoom({ sessionId, seatLabel, storeId }) {
  const [rooms, setRooms] = useState([]);
  const [myRoom, setMyRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshRooms = useCallback(async () => {
    if (!hasStoreScope(storeId)) return;
    try {
      const data = await liarRepository.listRoomsByStore(storeId);
      setRooms(data);
    } catch (err) {
      console.error("[Liar] 방 목록 조회 실패:", err);
    }
  }, [storeId]);

  // F) 로비 진입 시 cleanup RPC
  useEffect(() => {
    if (!hasStoreScope(storeId)) return;
    liarRepository
      .cleanupRoomsRpc({ storeId })
      .catch((err) => console.error("[Liar] cleanup RPC 실패:", err));
  }, [storeId]);

  // 매장 방 리스트 Realtime
  useEffect(() => {
    if (!hasStoreScope(storeId)) return;

    const unsubscribe = liarRepository.subscribeToStoreRooms({
      storeId,
      onChange: () => {
        refreshRooms();
      },
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Liar Lobby",
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
      const data = await liarRepository.createRoom({
        store_id: storeId,
        host_session_id: sessionId,
        host_seat_label: seatLabel,
        status: "waiting",
        players: [
          {
            session_id: sessionId,
            seat_label: seatLabel,
            role: null,
            word_confirmed: false,
            speech_done: false,
            voted_for: null,
            joined_at: nowIso,
            last_seen_at: nowIso,
          },
        ],
        category: null,
        current_speech_index: 0,
      });
      setMyRoom(data);
      return { ok: true, room: data };
    } catch (err) {
      console.error("[Liar] 방 생성 실패:", err);
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
        const room = await liarRepository.getRoom(roomId);
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
            role: null,
            word_confirmed: false,
            speech_done: false,
            voted_for: null,
            joined_at: nowIso,
            last_seen_at: nowIso,
          },
        ];

        const updated = await liarRepository.updateRoom({
          roomId,
          updates: { players: nextPlayers },
          guard: { status: "waiting" },
        });

        if (!updated)
          return { ok: false, error: "방 상태가 바뀌었어요. 다시 시도해주세요." };

        setMyRoom(updated);
        return { ok: true, room: updated };
      } catch (err) {
        console.error("[Liar] 방 입장 실패:", err);
        return { ok: false, error: "입장에 실패했어요" };
      } finally {
        setLoading(false);
      }
    },
    [sessionId, seatLabel, storeId, myRoom],
  );

  // ─────────────────────────────────────────
  // B) 방 퇴장
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
      await liarRepository.leaveRoomRpc({ roomId, sessionId });
    } catch (err) {
      console.error("[Liar] 방 퇴장 RPC 실패:", err);
    }
  }, [myRoom, sessionId]);

  // ─────────────────────────────────────────
  // 게임 시작 (방장 only) — 카테고리 선택 후
  //  - 라이어 1명 랜덤
  //  - 단어/카테고리 추첨
  //  - status → 'word_reveal'
  // ─────────────────────────────────────────
  const startGame = useCallback(
    async (selectedCategory) => {
      if (!myRoom) return { ok: false, error: "방이 없어요" };
      if (myRoom.host_session_id !== sessionId)
        return { ok: false, error: "방장만 시작할 수 있어요" };

      const players = myRoom.players || [];
      if (players.length < MIN_PLAYERS)
        return { ok: false, error: `최소 ${MIN_PLAYERS}명 이상 필요해요` };
      if (!selectedCategory)
        return { ok: false, error: "카테고리를 선택해주세요" };

      try {
        const liarIdx = Math.floor(Math.random() * players.length);
        const liarSessionId = players[liarIdx].session_id;
        const { category, word } = pickRandomWord(selectedCategory);

        const updatedPlayers = players.map((p) => ({
          ...p,
          role: p.session_id === liarSessionId ? "liar" : "citizen",
          word_confirmed: false,
          speech_done: false,
          voted_for: null,
        }));

        const updated = await liarRepository.updateRoom({
          roomId: myRoom.id,
          updates: {
            status: "word_reveal",
            players: updatedPlayers,
            category,
            answer_word: word,
            liar_session_id: liarSessionId,
            current_speech_index: 0,
            speech_started_at: null,
            vote_result: null,
            started_at: new Date().toISOString(),
            finished_at: null,
          },
          guard: { status: "waiting" },
        });
        if (!updated)
          return { ok: false, error: "방 상태가 바뀌었어요. 다시 시도해주세요." };
        return { ok: true };
      } catch (err) {
        console.error("[Liar] 게임 시작 실패:", err);
        return { ok: false, error: "시작에 실패했어요" };
      }
    },
    [myRoom, sessionId],
  );

  // ─────────────────────────────────────────
  // C) Heartbeat
  // ─────────────────────────────────────────
  const roomIdForHeartbeat = myRoom?.id || null;
  useEffect(() => {
    if (!roomIdForHeartbeat || !sessionId) return;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      liarRepository
        .heartbeatRpc({ roomId: roomIdForHeartbeat, sessionId })
        .catch((err) => console.error("[Liar] heartbeat 실패:", err));
    };
    tick();
    const id = setInterval(tick, HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [roomIdForHeartbeat, sessionId]);

  // ─────────────────────────────────────────
  // D) 좀비 player 자동 정리
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
        liarRepository
          .leaveRoomRpc({ roomId: r.id, sessionId: z.session_id })
          .catch((err) => console.error("[Liar] 좀비 정리 실패:", err));
      });
    };

    const id = setInterval(check, ZOMBIE_CHECK_MS);
    return () => clearInterval(id);
  }, [roomIdForHeartbeat, sessionId]);

  // ─────────────────────────────────────────
  // E) 페이지 이탈
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!roomIdForHeartbeat || !sessionId) return;

    const fire = () => {
      liarRepository.sendLeaveBeacon({
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

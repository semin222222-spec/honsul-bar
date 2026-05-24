import { useState, useEffect, useCallback, useRef } from "react";
import { telestrationsRepository } from "@/repositories/games/telestrationsRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  HEARTBEAT_MS,
  ZOMBIE_THRESHOLD_MS,
  ZOMBIE_CHECK_MS,
} from "../lib/telestrationsRules";
import { pickRandomWords } from "../data/telestrationsWords";
import { nextPosition } from "../lib/telestrationsChain";

/**
 * useTelestrationsRoom
 *
 * 텔레스트레이션 방 lifecycle.
 *   A) 결과 화면 자동 종료 — useTelestrationsGame 쪽에서 onLeaveAfterFinish 호출
 *   B) leave RPC — 0명 시 DB가 DELETE
 *   C) Heartbeat 30s
 *   D) 좀비 player 정리 90s
 *   E) 페이지 이탈 — fetch keepalive
 *   F) 로비 진입 시 cleanup RPC 1회
 *
 * 라이어 패턴 그대로. 차이점:
 *   - createRoom 시 player 에 position 부여
 *   - startGame 시 인원수만큼 단어 추첨하여 players[].initial_word 채움
 *   - status → 'word_reveal' (단어 공개 → useGame이 5초 후 playing 진입)
 */
export function useTelestrationsRoom({ sessionId, seatLabel, storeId }) {
  const [rooms, setRooms] = useState([]);
  const [myRoom, setMyRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshRooms = useCallback(async () => {
    if (!hasStoreScope(storeId)) return;
    try {
      const data = await telestrationsRepository.listRoomsByStore(storeId);
      setRooms(data);
    } catch (err) {
      console.error("[Telestrations] 방 목록 조회 실패:", err);
    }
  }, [storeId]);

  // F) 로비 진입 시 cleanup RPC
  useEffect(() => {
    if (!hasStoreScope(storeId)) return;
    telestrationsRepository
      .cleanupRoomsRpc({ storeId })
      .catch((err) =>
        console.error("[Telestrations] cleanup RPC 실패:", err),
      );
  }, [storeId]);

  // 매장 방 리스트 Realtime
  useEffect(() => {
    if (!hasStoreScope(storeId)) return;

    const unsubscribe = telestrationsRepository.subscribeToStoreRooms({
      storeId,
      onChange: () => {
        refreshRooms();
      },
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Telestrations Lobby",
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
      const data = await telestrationsRepository.createRoom({
        store_id: storeId,
        host_session_id: sessionId,
        host_seat_label: seatLabel,
        status: "waiting",
        players: [
          {
            session_id: sessionId,
            seat_label: seatLabel,
            position: 0,
            initial_word: null,
            joined_at: nowIso,
            last_seen_at: nowIso,
          },
        ],
        current_step: 0,
      });
      setMyRoom(data);
      return { ok: true, room: data };
    } catch (err) {
      console.error("[Telestrations] 방 생성 실패:", err);
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
        const room = await telestrationsRepository.getRoom(roomId);
        if (!room) return { ok: false, error: "방을 찾을 수 없어요" };
        if (room.store_id !== storeId)
          return { ok: false, error: "다른 매장의 방이에요" };

        const players = room.players || [];

        // 이미 참가자면 재참여 허용 (새로고침 복구)
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
            position: nextPosition(players),
            initial_word: null,
            joined_at: nowIso,
            last_seen_at: nowIso,
          },
        ];

        const updated = await telestrationsRepository.updateRoom({
          roomId,
          updates: { players: nextPlayers },
          guard: { status: "waiting" },
        });

        if (!updated)
          return {
            ok: false,
            error: "방 상태가 바뀌었어요. 다시 시도해주세요.",
          };

        setMyRoom(updated);
        return { ok: true, room: updated };
      } catch (err) {
        console.error("[Telestrations] 방 입장 실패:", err);
        return { ok: false, error: "입장에 실패했어요" };
      } finally {
        setLoading(false);
      }
    },
    [sessionId, seatLabel, storeId, myRoom],
  );

  // ─────────────────────────────────────────
  // B) 방 퇴장
  //   - setMyRoom(null) 즉시 (UX: 항상 로비로)
  //   - leave RPC 는 best-effort
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
      await telestrationsRepository.leaveRoomRpc({ roomId, sessionId });
    } catch (err) {
      console.error("[Telestrations] 방 퇴장 RPC 실패:", err);
    }
  }, [myRoom, sessionId]);

  // ─────────────────────────────────────────
  // 게임 시작 (방장 only)
  //   - 최소 인원 검사
  //   - 인원수만큼 단어 추첨 → players[].initial_word 할당
  //   - position 재정렬 (0..N-1)
  //   - status → 'word_reveal' (단어 공개 화면)
  // ─────────────────────────────────────────
  const startGame = useCallback(async () => {
    if (!myRoom) return { ok: false, error: "방이 없어요" };
    if (myRoom.host_session_id !== sessionId)
      return { ok: false, error: "방장만 시작할 수 있어요" };

    const players = myRoom.players || [];
    if (players.length < MIN_PLAYERS)
      return { ok: false, error: `최소 ${MIN_PLAYERS}명 이상 필요해요` };

    try {
      // position 재정렬 (join 순서 = position 순서 유지)
      const sorted = [...players].sort(
        (a, b) =>
          (Number.isFinite(a?.position) ? a.position : 0) -
          (Number.isFinite(b?.position) ? b.position : 0),
      );
      const words = pickRandomWords(sorted.length);
      const updatedPlayers = sorted.map((p, idx) => ({
        ...p,
        position: idx,
        initial_word: words[idx],
      }));

      const updated = await telestrationsRepository.updateRoom({
        roomId: myRoom.id,
        updates: {
          status: "word_reveal",
          players: updatedPlayers,
          current_step: 0,
          step_started_at: null,
          started_at: new Date().toISOString(),
          finished_at: null,
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
      console.error("[Telestrations] 게임 시작 실패:", err);
      return { ok: false, error: "시작에 실패했어요" };
    }
  }, [myRoom, sessionId]);

  // ─────────────────────────────────────────
  // 한 판 더 — 결과 화면에서 방장이 누르면 같은 멤버로 새 게임
  //   status → 'waiting', current_step=0, initial_word 클리어, started_at/finished_at 리셋
  //   entries 는 DB CASCADE 대신 명시적 DELETE 안 함 (다음 startGame 에서 새로 INSERT 시 UNIQUE 충돌 가능)
  //   → 그러려면 entries 도 같이 clear 해야 함. 호출자에서 처리.
  // ─────────────────────────────────────────
  const resetToWaiting = useCallback(async () => {
    if (!myRoom) return { ok: false, error: "방이 없어요" };
    if (myRoom.host_session_id !== sessionId)
      return { ok: false, error: "방장만 다시 시작할 수 있어요" };

    try {
      const players = (myRoom.players || []).map((p) => ({
        ...p,
        initial_word: null,
      }));
      const updated = await telestrationsRepository.updateRoom({
        roomId: myRoom.id,
        updates: {
          status: "waiting",
          players,
          current_step: 0,
          step_started_at: null,
          started_at: null,
          finished_at: null,
        },
        guard: { status: "finished" },
      });
      if (!updated)
        return {
          ok: false,
          error: "방 상태가 바뀌었어요.",
        };
      return { ok: true };
    } catch (err) {
      console.error("[Telestrations] 재시작 실패:", err);
      return { ok: false, error: "재시작에 실패했어요" };
    }
  }, [myRoom, sessionId]);

  // ─────────────────────────────────────────
  // C) Heartbeat
  // ─────────────────────────────────────────
  const roomIdForHeartbeat = myRoom?.id || null;
  useEffect(() => {
    if (!roomIdForHeartbeat || !sessionId) return;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      telestrationsRepository
        .heartbeatRpc({ roomId: roomIdForHeartbeat, sessionId })
        .catch((err) =>
          console.error("[Telestrations] heartbeat 실패:", err),
        );
    };
    tick();
    const id = setInterval(tick, HEARTBEAT_MS);

    // 모바일에서 앱 전환/화면 잠금 동안 setInterval 이 멈췄다가 다시 돌아오면
    // 즉시 하트비트를 보내 last_seen_at 을 갱신한다. 그래야 잠깐 폰을 본
    // 손님이 좀비로 오인돼 방에서 쫓겨나(→ 4명 미만 → 강제 종료) 게임이
    // 갑자기 끝나는 일을 막을 수 있다.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
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
        telestrationsRepository
          .leaveRoomRpc({ roomId: r.id, sessionId: z.session_id })
          .catch((err) =>
            console.error("[Telestrations] 좀비 정리 실패:", err),
          );
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

    // ⚠️ 진짜로 페이지가 종료될 때만 leave 한다.
    // 모바일에서 앱 전환/탭 전환은 pagehide(persisted=true, bfcache)로 들어오는데
    // 이때는 곧 다시 살아나므로 leave 하면 안 된다. leave 하면 잠깐 폰을 본
    // 손님이 방에서 빠져 4명 미만 → 게임이 강제 종료되는 버그가 난다.
    // 백그라운드로만 들어간 경우(다시 돌아옴)는 하트비트 멈춤 + 90초 좀비 룰이
    // 안전망 역할을 한다.
    const fire = (e) => {
      if (e && e.type === "pagehide" && e.persisted) return; // bfcache → 곧 복귀
      telestrationsRepository.sendLeaveBeacon({
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
    resetToWaiting,
    setRoomDirect,
  };
}

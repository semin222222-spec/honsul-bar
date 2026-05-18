import { useState, useEffect, useCallback, useRef } from "react";
import { shieldRepository } from "@/repositories/games/shieldRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import {
  TURN_SECONDS,
  RESULT_AUTO_DISMISS_MS,
  calcSecondsLeft,
  getNextAlivePlayer,
  countAlive,
} from "../lib/shieldRules";
import { generateRandomInitials } from "../lib/shieldInitials";

/**
 * useShieldGame
 *
 * 방 안에서의 게임 진행을 책임지는 훅.
 *  - room Realtime 구독 (UPDATE만)
 *  - 250ms tick → secondsLeft derived
 *  - timeout / pass 액션 (first-writer-wins guard)
 *  - finished 30s 후 자동 leaveRoom (방 즉시 삭제 안 함 — leaveRoomRpc의 0명 케이스에서 자연 삭제)
 *  - restartRoom (한 판 더!)
 */
export function useShieldGame({
  room,
  sessionId,
  onRoomUpdate,
  onLeaveAfterFinish,
}) {
  const [, setTick] = useState(0);

  const roomId = room?.id;
  const status = room?.status;
  const isPlaying = status === "playing";
  const isFinished = status === "finished";
  const turnStartedAt = room?.current_turn_started_at;

  // 서버 기준 derived secondsLeft. state 아님 — stale 값으로 다음 턴이 즉시
  // 0이 되는 버그를 피한다.
  const secondsLeft =
    isPlaying && turnStartedAt
      ? Math.max(0, calcSecondsLeft(turnStartedAt))
      : TURN_SECONDS;

  // 가장 최신 room을 ref로 (콜백이 매 render마다 새로 만들어지지 않도록)
  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // ─────────────────────────────────────────
  // Realtime 구독
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const load = async () => {
      try {
        const data = await shieldRepository.getRoom(roomId);
        if (data && onRoomUpdate) onRoomUpdate(data);
      } catch (err) {
        console.error("[Shield] 방 재조회 실패:", err);
      }
    };

    const unsubscribe = shieldRepository.subscribeToRoom({
      roomId,
      onRoomChange: (payload) => {
        if (payload.eventType === "DELETE") {
          if (onRoomUpdate) onRoomUpdate(null);
          return;
        }
        const stillIn = (payload.new?.players || []).some(
          (p) => p.session_id === sessionId,
        );
        if (!stillIn) {
          // 본인이 players에서 빠진 경우 → 방에서 나간 상태로 처리
          if (onRoomUpdate) onRoomUpdate(null);
          return;
        }
        if (onRoomUpdate) onRoomUpdate(payload.new);
      },
      onStatus: (s) => {
        handleRealtimeSubscribeStatus(s, {
          label: "Shield Room",
          onSubscribed: load,
          onRecoverable: load,
        });
      },
    });

    const initTimer = setTimeout(load, 0);

    return () => {
      clearTimeout(initTimer);
      unsubscribe();
    };
    // sessionId/onRoomUpdate는 ref 안 잡고 deps로 단순화 — 필요 시 콜러가 안정시킨다
  }, [roomId, sessionId, onRoomUpdate]);

  // ─────────────────────────────────────────
  // 250ms tick — secondsLeft 재계산용 re-render만 트리거
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !turnStartedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [isPlaying, turnStartedAt]);

  // ─────────────────────────────────────────
  // Timeout → 현재 차례 player를 dead 처리, 1명 남으면 finished
  //
  // first-writer-wins: 모든 클라이언트가 동시에 보고 있어도 guard 조건으로 한 번만 통과
  // ─────────────────────────────────────────
  const finalizingRef = useRef(false);

  const handleTimeout = useCallback(async () => {
    const r = roomRef.current;
    if (!r || finalizingRef.current) return;
    if (r.status !== "playing") return;
    if (!r.current_turn_session_id) return;

    finalizingRef.current = true;
    try {
      const players = r.players || [];
      const currentTurnId = r.current_turn_session_id;

      // 현재 차례 → dead
      const nextPlayers = players.map((p) =>
        p.session_id === currentTurnId
          ? {
              ...p,
              status: "dead",
              eliminated_round: r.current_round,
              eliminated_initials: r.current_initials,
            }
          : p,
      );

      const eliminated = players.find((p) => p.session_id === currentTurnId);
      const lastEliminated = eliminated
        ? {
            session_id: eliminated.session_id,
            seat_label: eliminated.seat_label,
            initials: r.current_initials,
            round: r.current_round,
          }
        : null;

      const aliveAfter = countAlive(nextPlayers);

      if (aliveAfter <= 1) {
        // 게임 종료
        await shieldRepository.updateRoom({
          roomId: r.id,
          updates: {
            status: "finished",
            finished_at: new Date().toISOString(),
            players: nextPlayers,
            last_eliminated: lastEliminated,
            current_turn_session_id: null,
          },
          guard: {
            status: "playing",
            current_round: r.current_round,
            current_turn_session_id: currentTurnId,
          },
          returning: false,
        });
      } else {
        // 다음 alive에게 턴 + 새 초성 + 라운드++
        const next = getNextAlivePlayer(nextPlayers, currentTurnId);
        if (!next) {
          // 이론상 도달 불가 (aliveAfter > 1 인데 next가 null)
          return;
        }
        await shieldRepository.updateRoom({
          roomId: r.id,
          updates: {
            players: nextPlayers,
            current_round: (r.current_round || 0) + 1,
            current_turn_session_id: next.session_id,
            current_initials: generateRandomInitials(),
            current_turn_started_at: new Date().toISOString(),
            last_eliminated: lastEliminated,
          },
          guard: {
            status: "playing",
            current_round: r.current_round,
            current_turn_session_id: currentTurnId,
          },
          returning: false,
        });
      }
    } catch (err) {
      console.error("[Shield] timeout 처리 실패:", err);
    } finally {
      setTimeout(() => {
        finalizingRef.current = false;
      }, 800);
    }
  }, []);

  // secondsLeft가 0이 되면 timeout 자동 트리거
  useEffect(() => {
    if (!isPlaying || !turnStartedAt) return;
    if (secondsLeft > 0) return;
    handleTimeout();
  }, [secondsLeft, isPlaying, turnStartedAt, handleTimeout]);

  // ─────────────────────────────────────────
  // PASS — 내 차례면 다음 alive에게 턴 넘김 (초성 유지)
  // ─────────────────────────────────────────
  const passingRef = useRef(false);

  const handlePass = useCallback(async () => {
    const r = roomRef.current;
    if (!r || passingRef.current) return { ok: false };
    if (r.status !== "playing") return { ok: false };
    if (r.current_turn_session_id !== sessionId)
      return { ok: false, error: "내 차례가 아니에요" };

    // 5초 초과 시점에 누른 PASS는 무시 (사실상 timeout이 이미 처리)
    const left = calcSecondsLeft(r.current_turn_started_at);
    if (left <= 0) return { ok: false, error: "이미 시간 초과예요" };

    passingRef.current = true;
    try {
      const players = r.players || [];
      const next = getNextAlivePlayer(players, sessionId);
      if (!next) return { ok: false, error: "다음 사람이 없어요" };

      await shieldRepository.updateRoom({
        roomId: r.id,
        updates: {
          current_round: (r.current_round || 0) + 1,
          current_turn_session_id: next.session_id,
          current_turn_started_at: new Date().toISOString(),
          // 초성은 유지 (라운드 끝까지 — explode 시에만 새로 뽑음)
        },
        guard: {
          status: "playing",
          current_round: r.current_round,
          current_turn_session_id: sessionId,
        },
        returning: false,
      });
      return { ok: true };
    } catch (err) {
      console.error("[Shield] PASS 실패:", err);
      return { ok: false, error: "패스에 실패했어요" };
    } finally {
      setTimeout(() => {
        passingRef.current = false;
      }, 300);
    }
  }, [sessionId]);

  // ─────────────────────────────────────────
  // restartRoom — 같은 방원으로 새 게임 (방장 only)
  // ─────────────────────────────────────────
  const restartRoom = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return { ok: false };
    if (r.host_session_id !== sessionId)
      return { ok: false, error: "방장만 시작할 수 있어요" };

    try {
      const nowIso = new Date().toISOString();
      const resetPlayers = (r.players || [])
        // 게임 중 떠난 사람(left_mid_game)은 빼고 재시작
        .filter((p) => !p.left_mid_game)
        .map((p) => ({
          session_id: p.session_id,
          seat_label: p.seat_label,
          status: "alive",
          joined_at: p.joined_at || nowIso,
          last_seen_at: nowIso,
        }));

      if (resetPlayers.length < 2) {
        return { ok: false, error: "인원이 부족해요" };
      }

      await shieldRepository.updateRoom({
        roomId: r.id,
        updates: {
          status: "waiting",
          players: resetPlayers,
          current_round: 0,
          current_turn_session_id: null,
          current_initials: null,
          current_turn_started_at: null,
          last_eliminated: null,
          started_at: null,
          finished_at: null,
        },
        guard: { status: "finished" },
        returning: false,
      });
      return { ok: true };
    } catch (err) {
      console.error("[Shield] 한 판 더 실패:", err);
      return { ok: false, error: "재시작에 실패했어요" };
    }
  }, [sessionId]);

  // ─────────────────────────────────────────
  // finished 후 30초 카운트다운 → 자동 leave (DB는 leaveRoomRpc가 0명 시 DELETE)
  // 카운트다운은 매 250ms re-render에서 displayedDismissLeft로 외부 노출.
  // ─────────────────────────────────────────
  const finishedAt = isFinished ? room?.finished_at : null;

  const dismissLeftMs = (() => {
    if (!finishedAt) return null;
    const elapsed = Date.now() - new Date(finishedAt).getTime();
    return Math.max(0, RESULT_AUTO_DISMISS_MS - elapsed);
  })();

  // 0 도달 시 onLeaveAfterFinish 호출
  const fireDismissRef = useRef(false);
  useEffect(() => {
    if (!isFinished || !finishedAt) {
      fireDismissRef.current = false;
      return;
    }
    if (dismissLeftMs === null) return;
    if (dismissLeftMs > 0) return;
    if (fireDismissRef.current) return;
    fireDismissRef.current = true;
    onLeaveAfterFinish?.();
  }, [isFinished, finishedAt, dismissLeftMs, onLeaveAfterFinish]);

  // 결과 화면에서도 tick 필요 (dismissLeftMs render)
  useEffect(() => {
    if (!isFinished) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [isFinished]);

  return {
    secondsLeft,
    handlePass,
    restartRoom,
    dismissLeftMs,
  };
}

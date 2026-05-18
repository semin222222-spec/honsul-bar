import { useState, useEffect, useCallback, useRef } from "react";
import { liarRepository } from "@/repositories/games/liarRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import {
  SPEECH_SECONDS,
  RESULT_AUTO_DISMISS_MS,
  calcSpeechSecondsLeft,
  computeVoteResult,
} from "../lib/liarRules";

/**
 * useLiarGame
 *
 * 라이어 게임 진행 훅.
 *  - room Realtime 구독
 *  - 단어 확인 (word_reveal → speech 전환은 방장만)
 *  - 설명 PASS / 15초 타임아웃 (first-writer-wins guard)
 *  - 투표 / 모두 완료 시 결과 산출 (방장만)
 *  - finished 30s 자동 leave
 *  - restartRoom (한 판 더 — 방장만)
 */
export function useLiarGame({
  room,
  sessionId,
  onRoomUpdate,
  onLeaveAfterFinish,
}) {
  const [, setTick] = useState(0);

  const roomId = room?.id;
  const status = room?.status;
  const isSpeech = status === "speech";
  const isFinished = status === "finished";
  const speechStartedAt = room?.speech_started_at;

  // derived secondsLeft — state로 안 둔다 (stale 방지)
  const secondsLeft =
    isSpeech && speechStartedAt
      ? Math.max(0, calcSpeechSecondsLeft(speechStartedAt))
      : SPEECH_SECONDS;

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
        const data = await liarRepository.getRoom(roomId);
        if (data && onRoomUpdate) onRoomUpdate(data);
      } catch (err) {
        console.error("[Liar] 방 재조회 실패:", err);
      }
    };

    const unsubscribe = liarRepository.subscribeToRoom({
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
          if (onRoomUpdate) onRoomUpdate(null);
          return;
        }
        if (onRoomUpdate) onRoomUpdate(payload.new);
      },
      onStatus: (s) => {
        handleRealtimeSubscribeStatus(s, {
          label: "Liar Room",
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
  }, [roomId, sessionId, onRoomUpdate]);

  // ─────────────────────────────────────────
  // 250ms tick — secondsLeft 재계산용
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!isSpeech || !speechStartedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [isSpeech, speechStartedAt]);

  // ─────────────────────────────────────────
  // 단어 확인
  // ─────────────────────────────────────────
  const confirmingRef = useRef(false);
  const confirmWord = useCallback(async () => {
    const r = roomRef.current;
    if (!r || confirmingRef.current) return { ok: false };
    if (r.status !== "word_reveal") return { ok: false };

    confirmingRef.current = true;
    try {
      const me = (r.players || []).find((p) => p.session_id === sessionId);
      if (!me) return { ok: false, error: "방에 없어요" };
      if (me.word_confirmed) return { ok: true };

      const nextPlayers = (r.players || []).map((p) =>
        p.session_id === sessionId ? { ...p, word_confirmed: true } : p,
      );
      await liarRepository.updateRoom({
        roomId: r.id,
        updates: { players: nextPlayers },
        guard: { status: "word_reveal" },
        returning: false,
      });
      return { ok: true };
    } catch (err) {
      console.error("[Liar] 단어 확인 실패:", err);
      return { ok: false, error: "확인에 실패했어요" };
    } finally {
      setTimeout(() => {
        confirmingRef.current = false;
      }, 200);
    }
  }, [sessionId]);

  // word_reveal에서 모두 확인하면 방장이 speech로 전환
  const isHost = !!room && room.host_session_id === sessionId;
  const transitioningWordRef = useRef(false);
  useEffect(() => {
    if (!isHost || !room) return;
    if (room.status !== "word_reveal") return;
    const players = room.players || [];
    if (players.length < 3) return;
    if (!players.every((p) => p.word_confirmed)) return;
    if (transitioningWordRef.current) return;

    transitioningWordRef.current = true;
    liarRepository
      .updateRoom({
        roomId: room.id,
        updates: {
          status: "speech",
          current_speech_index: 0,
          speech_started_at: new Date().toISOString(),
        },
        guard: { status: "word_reveal" },
        returning: false,
      })
      .catch((err) => console.error("[Liar] speech 전환 실패:", err))
      .finally(() => {
        setTimeout(() => {
          transitioningWordRef.current = false;
        }, 800);
      });
  }, [room, isHost]);

  // ─────────────────────────────────────────
  // 설명 종료 / 다음 사람 / 투표 전환
  // ─────────────────────────────────────────
  const finishingSpeechRef = useRef(false);

  const finishSpeech = useCallback(async () => {
    const r = roomRef.current;
    if (!r || finishingSpeechRef.current) return { ok: false };
    if (r.status !== "speech") return { ok: false };

    const players = r.players || [];
    const idx = r.current_speech_index || 0;
    const currentPlayer = players[idx];
    if (!currentPlayer) return { ok: false };

    finishingSpeechRef.current = true;
    try {
      const nextPlayers = players.map((p, i) =>
        i === idx ? { ...p, speech_done: true } : p,
      );
      const nextIndex = idx + 1;

      if (nextIndex >= players.length) {
        // 모두 끝 → 투표
        await liarRepository.updateRoom({
          roomId: r.id,
          updates: {
            status: "voting",
            players: nextPlayers,
            speech_started_at: null,
          },
          guard: {
            status: "speech",
            current_speech_index: idx,
          },
          returning: false,
        });
      } else {
        await liarRepository.updateRoom({
          roomId: r.id,
          updates: {
            players: nextPlayers,
            current_speech_index: nextIndex,
            speech_started_at: new Date().toISOString(),
          },
          guard: {
            status: "speech",
            current_speech_index: idx,
          },
          returning: false,
        });
      }
      return { ok: true };
    } catch (err) {
      console.error("[Liar] 설명 완료 처리 실패:", err);
      return { ok: false, error: "처리에 실패했어요" };
    } finally {
      setTimeout(() => {
        finishingSpeechRef.current = false;
      }, 400);
    }
  }, []);

  // 본인 차례면 PASS 가능 — 본인만
  const handlePassMySpeech = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return { ok: false };
    if (r.status !== "speech") return { ok: false };
    const idx = r.current_speech_index || 0;
    const currentPlayer = (r.players || [])[idx];
    if (!currentPlayer || currentPlayer.session_id !== sessionId) {
      return { ok: false, error: "내 차례가 아니에요" };
    }
    return finishSpeech();
  }, [sessionId, finishSpeech]);

  // 15초 타임아웃 — 누구든 먼저 감지하면 finishSpeech (guard로 race 흡수)
  useEffect(() => {
    if (!isSpeech || !speechStartedAt) return;
    if (secondsLeft > 0) return;
    finishSpeech();
  }, [secondsLeft, isSpeech, speechStartedAt, finishSpeech]);

  // ─────────────────────────────────────────
  // 투표
  // ─────────────────────────────────────────
  const submitVote = useCallback(
    async (targetSessionId) => {
      const r = roomRef.current;
      if (!r) return { ok: false };
      if (r.status !== "voting") return { ok: false, error: "투표 시간이 아니에요" };
      if (!targetSessionId) return { ok: false, error: "대상을 선택해주세요" };
      if (targetSessionId === sessionId)
        return { ok: false, error: "자기 자신은 투표할 수 없어요" };

      try {
        const nextPlayers = (r.players || []).map((p) =>
          p.session_id === sessionId ? { ...p, voted_for: targetSessionId } : p,
        );
        await liarRepository.updateRoom({
          roomId: r.id,
          updates: { players: nextPlayers },
          guard: { status: "voting" },
          returning: false,
        });
        return { ok: true };
      } catch (err) {
        console.error("[Liar] 투표 실패:", err);
        return { ok: false, error: "투표에 실패했어요" };
      }
    },
    [sessionId],
  );

  // 모두 투표 완료 → 방장이 결과 산출 후 finished
  const computingResultRef = useRef(false);
  useEffect(() => {
    if (!isHost || !room) return;
    if (room.status !== "voting") return;
    const players = room.players || [];
    if (players.length === 0) return;
    if (!players.every((p) => p.voted_for)) return;
    if (computingResultRef.current) return;

    computingResultRef.current = true;
    const result = computeVoteResult(players, room.liar_session_id);

    liarRepository
      .updateRoom({
        roomId: room.id,
        updates: {
          status: "finished",
          finished_at: new Date().toISOString(),
          vote_result: result,
        },
        guard: { status: "voting" },
        returning: false,
      })
      .catch((err) => console.error("[Liar] 결과 산출 실패:", err))
      .finally(() => {
        setTimeout(() => {
          computingResultRef.current = false;
        }, 800);
      });
  }, [room, isHost]);

  // ─────────────────────────────────────────
  // restartRoom (한 판 더 — 방장만)
  // ─────────────────────────────────────────
  const restartRoom = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return { ok: false };
    if (r.host_session_id !== sessionId)
      return { ok: false, error: "방장만 시작할 수 있어요" };

    try {
      const resetPlayers = (r.players || []).map((p) => ({
        session_id: p.session_id,
        seat_label: p.seat_label,
        role: null,
        word_confirmed: false,
        speech_done: false,
        voted_for: null,
        joined_at: p.joined_at,
        last_seen_at: new Date().toISOString(),
      }));

      if (resetPlayers.length < 3) {
        return { ok: false, error: "인원이 부족해요" };
      }

      const updated = await liarRepository.updateRoom({
        roomId: r.id,
        updates: {
          status: "waiting",
          players: resetPlayers,
          category: null,
          answer_word: null,
          liar_session_id: null,
          current_speech_index: 0,
          speech_started_at: null,
          vote_result: null,
          started_at: null,
          finished_at: null,
        },
        guard: { status: "finished" },
      });
      if (!updated)
        return { ok: false, error: "방 상태가 바뀌었어요. 다시 시도해주세요." };
      return { ok: true };
    } catch (err) {
      console.error("[Liar] 한 판 더 실패:", err);
      return { ok: false, error: "재시작에 실패했어요" };
    }
  }, [sessionId]);

  // ─────────────────────────────────────────
  // finished 30s 자동 leave
  // ─────────────────────────────────────────
  const finishedAt = isFinished ? room?.finished_at : null;

  const dismissLeftMs = (() => {
    if (!finishedAt) return null;
    const elapsed = Date.now() - new Date(finishedAt).getTime();
    return Math.max(0, RESULT_AUTO_DISMISS_MS - elapsed);
  })();

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

  useEffect(() => {
    if (!isFinished) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [isFinished]);

  return {
    secondsLeft,
    confirmWord,
    finishSpeech,
    handlePassMySpeech,
    submitVote,
    restartRoom,
    dismissLeftMs,
  };
}

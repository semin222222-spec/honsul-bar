import { useState, useEffect, useCallback, useRef } from "react";
import { liarRepository } from "@/repositories/games/liarRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import {
  SPEECH_SECONDS,
  TOTAL_LAPS,
  RESULT_AUTO_DISMISS_MS,
  calcSpeechSecondsLeft,
} from "../lib/liarRules";

/**
 * useLiarGame
 *
 * 라이어 게임 진행 훅 — 단순화 V2.
 *  - room Realtime 구독
 *  - 단어 확인 → 방장이 speech 전환
 *  - 설명: 각자 TOTAL_LAPS(3)번 → 다 끝나면 voting
 *  - voting: 앱 투표 없음. 사용자가 명시적으로 revealResult 호출 시 finished
 *  - finished 30s 자동 leave
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

  // 타이머 tick
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
  //
  // - 각자 TOTAL_LAPS번 설명
  // - speech_count 증가 → 모두 >= TOTAL_LAPS 면 voting
  // - 인덱스는 모듈로 (한 바퀴 끝나면 다시 0번부터)
  // - 15초 타임아웃 / 본인 PASS 모두 동일 finishSpeech 호출 (guard로 race 흡수)
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
        i === idx ? { ...p, speech_count: (p.speech_count || 0) + 1 } : p,
      );

      const everyoneDone = nextPlayers.every(
        (p) => (p.speech_count || 0) >= TOTAL_LAPS,
      );

      if (everyoneDone) {
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
        const nextIndex = (idx + 1) % players.length;
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

  // 15초 타임아웃 — 누구든 먼저 감지 (guard race 흡수)
  useEffect(() => {
    if (!isSpeech || !speechStartedAt) return;
    if (secondsLeft > 0) return;
    finishSpeech();
  }, [secondsLeft, isSpeech, speechStartedAt, finishSpeech]);

  // ─────────────────────────────────────────
  // 정답 공개 (voting → finished)
  //
  // 누구든 voting 화면에서 "정답 공개" 누르면 finished로.
  // guard로 race 흡수 — 첫 클릭이 이김.
  // ─────────────────────────────────────────
  const revealingRef = useRef(false);
  const revealResult = useCallback(async () => {
    const r = roomRef.current;
    if (!r || revealingRef.current) return { ok: false };
    if (r.status !== "voting") return { ok: false };

    revealingRef.current = true;
    try {
      await liarRepository.updateRoom({
        roomId: r.id,
        updates: {
          status: "finished",
          finished_at: new Date().toISOString(),
        },
        guard: { status: "voting" },
        returning: false,
      });
      return { ok: true };
    } catch (err) {
      console.error("[Liar] 정답 공개 실패:", err);
      return { ok: false, error: "정답 공개에 실패했어요" };
    } finally {
      setTimeout(() => {
        revealingRef.current = false;
      }, 400);
    }
  }, []);

  // ─────────────────────────────────────────
  // finished 30s 자동 leave (라이프사이클 유지)
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
    revealResult,
    dismissLeftMs,
  };
}

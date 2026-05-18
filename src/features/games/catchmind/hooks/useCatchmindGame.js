import { useState, useEffect, useCallback, useRef } from "react";
import { catchmindRepository } from "@/repositories/games/catchmindRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import {
  ROUND_SECONDS,
  COUNTDOWN_SECONDS,
  TRANSITION_SECONDS,
  PASS_PENALTY,
  calcCorrectScore,
  calcDrawerBonus,
  calcSecondsLeft,
  isCorrectAnswer,
  isCloseAnswer,
} from "../lib/catchmindRules";
import { pickRandomWord } from "../data/catchmindWords";

/**
 * useCatchmindGame
 *
 * 방 안에서의 게임 진행을 책임지는 훅.
 *  - room/strokes/messages Realtime 구독
 *  - 1초마다 timer tick (서버 기준 남은 초 계산)
 *  - 라운드 종료/다음 라운드 진행/카운트다운 → playing 등 상태 전이를
 *    "조건부 UPDATE (guard)"로 first-writer-wins 처리
 *  - 출제자 stroke INSERT / 정답자 추측 INSERT
 */
export function useCatchmindGame({ room, sessionId, seatLabel, onRoomUpdate }) {
  const [strokes, setStrokes] = useState([]); // 현재 라운드의 strokes
  const [messages, setMessages] = useState([]); // 채팅 + 정답
  // tick은 단순히 re-render 트리거 (실제 secondsLeft는 roundStartedAt에서 derive)
  const [, setTick] = useState(0);

  const roomId = room?.id;
  const currentRound = room?.current_round || 0;
  const isPlaying = room?.status === "playing";
  const roundStartedAt = room?.current_round_started_at;

  // ⚠️ secondsLeft는 state가 아닌 derived. 라운드 사이에 stale 값으로 인해
  // 다음 라운드가 즉시 종료되는 버그를 피하려면 매 render마다 roundStartedAt
  // 기준으로 다시 계산해야 한다.
  const secondsLeft = isPlaying && roundStartedAt
    ? Math.max(0, Math.ceil(calcSecondsLeft(roundStartedAt)))
    : ROUND_SECONDS;

  // ─────────────────────────────────────────
  // Realtime 구독 + 초기 로드
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const load = async () => {
      try {
        const [strokeData, messageData, roomData] = await Promise.all([
          catchmindRepository.listStrokes({
            roomId,
            roundNumber: currentRound || 1,
          }),
          catchmindRepository.listMessages({ roomId }),
          catchmindRepository.getRoom(roomId),
        ]);
        // 머지: 구독 후 도착한 Realtime 메시지를 query 결과로 덮어쓰지 않게.
        // 같은 id가 양쪽에 있을 수 있으니 id 기준 dedupe.
        setStrokes((prev) => {
          const ids = new Set(strokeData.map((s) => s.id));
          const extra = prev.filter((s) => s.id != null && !ids.has(s.id));
          return [...strokeData, ...extra].sort((a, b) =>
            (a.id ?? 0) - (b.id ?? 0),
          );
        });
        setMessages((prev) => {
          const ids = new Set(messageData.map((m) => m.id));
          const extra = prev.filter((m) => m.id != null && !ids.has(m.id));
          return [...messageData, ...extra].sort((a, b) =>
            (a.id ?? 0) - (b.id ?? 0),
          );
        });
        if (roomData && onRoomUpdate) onRoomUpdate(roomData);
      } catch (err) {
        console.error("[Catchmind] 초기 로드 실패:", err);
      }
    };

    const unsubscribe = catchmindRepository.subscribeToRoom({
      roomId,
      onRoomChange: (payload) => {
        if (payload.eventType === "DELETE") {
          // 방이 삭제되면 외부에서 myRoom = null 처리
          if (onRoomUpdate) onRoomUpdate(null);
          return;
        }
        // ⚠️ players에 내가 없으면 = 내가 나간 것으로 처리.
        // 본인이 leaveRoom으로 UPDATE한 echo가 본 구독으로 돌아와서
        // myRoom을 다시 채우는 race를 막는다. 다른 사람이 호스트 권한으로
        // 내보내는 흐름이 추가되어도 동일하게 동작.
        const stillIn = (payload.new?.players || []).some(
          (p) => p.session_id === sessionId,
        );
        if (!stillIn) {
          if (onRoomUpdate) onRoomUpdate(null);
          return;
        }
        if (onRoomUpdate) onRoomUpdate(payload.new);
        // 라운드가 바뀌면 strokes 초기화 (다음 라운드 데이터로 갈아끼움)
        if (payload.new?.current_round !== payload.old?.current_round) {
          setStrokes([]);
        }
      },
      onStrokeInsert: (payload) => {
        const row = payload.new;
        setStrokes((prev) => {
          if (prev.some((s) => s.id === row.id)) return prev;
          return [...prev, row];
        });
      },
      onMessageInsert: (payload) => {
        const row = payload.new;
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev;
          return [...prev, row];
        });
      },
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Catchmind Room",
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
    // currentRound는 의존성에 넣지 않는다 — 라운드 바뀔 때마다 채널을 다시 만들면 잠깐 끊김
    // 라운드 변화는 onRoomChange에서 처리하고, strokes는 별도 effect에서 갈아끼움
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // 라운드 바뀔 때 strokes 재조회 (initial load 우회 케이스 보강)
  useEffect(() => {
    if (!roomId || !currentRound) return;
    let cancelled = false;
    catchmindRepository
      .listStrokes({ roomId, roundNumber: currentRound })
      .then((data) => {
        if (!cancelled) setStrokes(data);
      })
      .catch((err) => console.error("[Catchmind] strokes 재조회 실패:", err));
    return () => {
      cancelled = true;
    };
  }, [roomId, currentRound]);

  // ─────────────────────────────────────────
  // 타이머 tick (re-render 트리거만 담당)
  //
  // secondsLeft는 render시점에 roundStartedAt에서 derive되므로,
  // 여기서는 250ms마다 re-render만 발생시키면 된다.
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !roundStartedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [isPlaying, roundStartedAt]);

  // ─────────────────────────────────────────
  // 라운드 종료 자동 감지 (first-writer-wins)
  //   - 시간 종료 OR 모든 정답자가 맞힘
  // ─────────────────────────────────────────
  const endingRef = useRef(false);

  const finalizeRound = useCallback(
    async (reason = "timeup") => {
      if (!room || endingRef.current) return;
      if (room.status !== "playing") return;
      endingRef.current = true;

      try {
        // 정답자 리스트 추출 (current_round 기준)
        const correctMsgs = messages.filter(
          (m) => m.type === "correct" && m.round_number === room.current_round,
        );
        // 점수 변동 표 구성
        const drawerId = room.current_drawer_session_id;
        const word = room.current_word;
        const players = room.players || [];

        const correctSessions = correctMsgs.map((m) => m.session_id);
        const drawerBonus =
          reason === "pass" ? PASS_PENALTY : calcDrawerBonus(correctSessions.length);

        // 점수 합산 (correct 메시지에 score_gained가 이미 들어가 있음)
        const scoreChanges = {};
        for (const p of players) {
          scoreChanges[p.session_id] = 0;
        }
        for (const m of correctMsgs) {
          scoreChanges[m.session_id] =
            (scoreChanges[m.session_id] || 0) + (m.score_gained || 0);
        }
        if (drawerId) {
          scoreChanges[drawerId] =
            (scoreChanges[drawerId] || 0) + drawerBonus;
        }

        // players 배열 score 갱신
        const nextPlayers = players.map((p) => ({
          ...p,
          score: (p.score || 0) + (scoreChanges[p.session_id] || 0),
        }));

        const lastRoundResult = {
          round: room.current_round,
          word,
          drawer_session_id: drawerId,
          drawer_seat_label:
            players.find((p) => p.session_id === drawerId)?.seat_label || "",
          correct_sessions: correctSessions,
          score_changes: scoreChanges,
          drawer_bonus: drawerBonus,
          reason,
          used_words: [...(room.last_round_result?.used_words || []), word],
        };

        await catchmindRepository.updateRoom({
          roomId: room.id,
          updates: {
            status: "transition",
            players: nextPlayers,
            last_round_result: lastRoundResult,
          },
          guard: { status: "playing", current_round: room.current_round },
          returning: false,
        });
      } catch (err) {
        console.error("[Catchmind] 라운드 종료 실패:", err);
      } finally {
        setTimeout(() => {
          endingRef.current = false;
        }, 1000);
      }
    },
    [room, messages],
  );

  // 시간 종료 감지
  // roundStartedAt을 deps에 포함해서, 라운드가 바뀐 직후 새 roundStartedAt
  // 기준으로 secondsLeft가 재계산된 후에만 0 체크가 되도록 보장.
  useEffect(() => {
    if (!isPlaying || !roundStartedAt) return;
    if (secondsLeft > 0) return;
    finalizeRound("timeup");
  }, [secondsLeft, isPlaying, roundStartedAt, finalizeRound]);

  // 모든 정답자(출제자 제외)가 맞혔으면 종료
  useEffect(() => {
    if (!isPlaying || !room) return;
    const players = room.players || [];
    const drawerId = room.current_drawer_session_id;
    const guessers = players.filter((p) => p.session_id !== drawerId);
    if (guessers.length === 0) return;

    const correctSet = new Set(
      messages
        .filter(
          (m) =>
            m.type === "correct" && m.round_number === room.current_round,
        )
        .map((m) => m.session_id),
    );

    const allCorrect = guessers.every((g) => correctSet.has(g.session_id));
    if (allCorrect) {
      finalizeRound("all_correct");
    }
  }, [messages, isPlaying, room, finalizeRound]);

  // ─────────────────────────────────────────
  // 카운트다운(countdown) → playing 전이
  //  - 모두가 보고 있지만 first-writer-wins
  //  - room.started_at + COUNTDOWN_SECONDS 가 지나면 누구든 트리거
  // ─────────────────────────────────────────
  const startingRef = useRef(false);

  const startFirstRound = useCallback(async () => {
    if (!room || startingRef.current) return;
    if (room.status !== "countdown") return;
    startingRef.current = true;

    try {
      const players = room.players || [];
      if (players.length < 2) {
        startingRef.current = false;
        return;
      }
      const { word } = pickRandomWord([]);
      const firstDrawer = players[0];

      await catchmindRepository.updateRoom({
        roomId: room.id,
        updates: {
          status: "playing",
          current_round: 1,
          total_rounds: players.length,
          current_drawer_session_id: firstDrawer.session_id,
          current_word: word,
          current_round_started_at: new Date().toISOString(),
          last_round_result: null,
        },
        guard: { status: "countdown" },
        returning: false,
      });
    } catch (err) {
      console.error("[Catchmind] 첫 라운드 시작 실패:", err);
    } finally {
      setTimeout(() => {
        startingRef.current = false;
      }, 1000);
    }
  }, [room]);

  useEffect(() => {
    if (!room || room.status !== "countdown" || !room.started_at) return;
    const startTime = new Date(room.started_at).getTime();
    const delay = startTime + COUNTDOWN_SECONDS * 1000 - Date.now();
    if (delay <= 0) {
      startFirstRound();
      return;
    }
    const id = setTimeout(startFirstRound, delay + 50);
    return () => clearTimeout(id);
  }, [room, startFirstRound]);

  // ─────────────────────────────────────────
  // transition → 다음 라운드 시작 / 게임 종료
  // ─────────────────────────────────────────
  const advancingRef = useRef(false);

  const advanceFromTransition = useCallback(async () => {
    if (!room || advancingRef.current) return;
    if (room.status !== "transition") return;
    advancingRef.current = true;

    try {
      const players = room.players || [];
      const nextRound = (room.current_round || 0) + 1;
      const totalRounds = room.total_rounds || players.length;
      const usedWords = room.last_round_result?.used_words || [];

      if (nextRound > totalRounds) {
        // 게임 종료
        await catchmindRepository.updateRoom({
          roomId: room.id,
          updates: {
            status: "finished",
            finished_at: new Date().toISOString(),
          },
          guard: { status: "transition" },
          returning: false,
        });
      } else {
        // 다음 출제자 (라운드 인덱스 기준 순회)
        const nextDrawer = players[(nextRound - 1) % players.length];
        const { word } = pickRandomWord(usedWords);

        await catchmindRepository.updateRoom({
          roomId: room.id,
          updates: {
            status: "playing",
            current_round: nextRound,
            current_drawer_session_id: nextDrawer.session_id,
            current_word: word,
            current_round_started_at: new Date().toISOString(),
            last_round_result: {
              used_words: usedWords,
            },
          },
          guard: { status: "transition", current_round: room.current_round },
          returning: false,
        });
      }
    } catch (err) {
      console.error("[Catchmind] 다음 라운드 진행 실패:", err);
    } finally {
      setTimeout(() => {
        advancingRef.current = false;
      }, 1000);
    }
  }, [room]);

  useEffect(() => {
    if (!room || room.status !== "transition") return;
    const id = setTimeout(advanceFromTransition, TRANSITION_SECONDS * 1000);
    return () => clearTimeout(id);
  }, [room, advanceFromTransition]);

  // ─────────────────────────────────────────
  // 출제자 액션: stroke INSERT
  // ─────────────────────────────────────────
  const addStroke = useCallback(
    async (strokeData) => {
      if (!room || !isPlaying) return;
      if (room.current_drawer_session_id !== sessionId) return;
      try {
        await catchmindRepository.insertStroke({
          roomId: room.id,
          roundNumber: room.current_round,
          strokeData,
        });
      } catch (err) {
        console.error("[Catchmind] stroke 전송 실패:", err);
      }
    },
    [room, isPlaying, sessionId],
  );

  // 출제자 패스 (라운드당 -30, 게임당 1회)
  const passDrawer = useCallback(async () => {
    if (!room || !isPlaying) return { ok: false };
    if (room.current_drawer_session_id !== sessionId)
      return { ok: false, error: "출제자만 패스할 수 있어요" };
    const me = (room.players || []).find((p) => p.session_id === sessionId);
    if (me?.has_passed) return { ok: false, error: "이미 패스를 사용했어요" };

    try {
      // players에 has_passed 표시
      const nextPlayers = (room.players || []).map((p) =>
        p.session_id === sessionId ? { ...p, has_passed: true } : p,
      );
      await catchmindRepository.updateRoom({
        roomId: room.id,
        updates: { players: nextPlayers },
        guard: { status: "playing", current_round: room.current_round },
        returning: false,
      });
      // 라운드 종료 트리거
      await finalizeRound("pass");
      return { ok: true };
    } catch (err) {
      console.error("[Catchmind] 패스 실패:", err);
      return { ok: false, error: "패스에 실패했어요" };
    }
  }, [room, isPlaying, sessionId, finalizeRound]);

  // ─────────────────────────────────────────
  // 정답자 액션: 채팅 / 추측 전송
  // ─────────────────────────────────────────
  const sendGuess = useCallback(
    async (text) => {
      if (!room || !isPlaying) return;
      if (!text || !text.trim()) return;
      const trimmed = text.trim();

      const isDrawer = room.current_drawer_session_id === sessionId;
      const word = room.current_word;

      // 이미 정답을 맞췄으면 일반 채팅으로 변환
      const alreadyCorrect = messages.some(
        (m) =>
          m.type === "correct" &&
          m.round_number === room.current_round &&
          m.session_id === sessionId,
      );

      let type = "chat";
      let scoreGained = null;

      if (!isDrawer && !alreadyCorrect) {
        if (isCorrectAnswer(trimmed, word)) {
          type = "correct";
          const left = calcSecondsLeft(room.current_round_started_at);
          scoreGained = calcCorrectScore(left);
        } else if (isCloseAnswer(trimmed, word)) {
          type = "close";
        }
      }

      try {
        await catchmindRepository.insertMessage({
          room_id: room.id,
          round_number: room.current_round,
          session_id: sessionId,
          seat_label: seatLabel,
          content: type === "correct" ? word : trimmed,
          type,
          score_gained: scoreGained,
        });

        // 정답이면 즉시 all-correct 체크 (Realtime echo 기다리지 않음)
        if (type === "correct") {
          const players = room.players || [];
          const drawerId = room.current_drawer_session_id;
          const correctIds = new Set(
            messages
              .filter(
                (m) =>
                  m.type === "correct" &&
                  m.round_number === room.current_round,
              )
              .map((m) => m.session_id),
          );
          correctIds.add(sessionId);
          const guessers = players.filter(
            (p) => p.session_id !== drawerId,
          );
          if (
            guessers.length > 0 &&
            guessers.every((g) => correctIds.has(g.session_id))
          ) {
            finalizeRound("all_correct");
          }
        }
      } catch (err) {
        console.error("[Catchmind] 메시지 전송 실패:", err);
      }
    },
    [room, isPlaying, sessionId, seatLabel, messages, finalizeRound],
  );

  // 캔버스 전체 지우기 (출제자)
  const clearCanvas = useCallback(async () => {
    if (!room || !isPlaying) return;
    if (room.current_drawer_session_id !== sessionId) return;
    try {
      await catchmindRepository.insertStroke({
        roomId: room.id,
        roundNumber: room.current_round,
        strokeData: { type: "clear" },
      });
      // 로컬 즉시 반영
      setStrokes([]);
    } catch (err) {
      console.error("[Catchmind] 캔버스 클리어 실패:", err);
    }
  }, [room, isPlaying, sessionId]);

  // 한 판 더 (결과 화면 → 대기실 재시작)
  const restartRoom = useCallback(async () => {
    if (!room) return;
    if (room.host_session_id !== sessionId) return;
    try {
      const resetPlayers = (room.players || []).map((p) => ({
        ...p,
        score: 0,
        has_passed: false,
      }));
      await catchmindRepository.updateRoom({
        roomId: room.id,
        updates: {
          status: "waiting",
          players: resetPlayers,
          current_round: 0,
          total_rounds: 0,
          current_drawer_session_id: null,
          current_word: null,
          current_round_started_at: null,
          last_round_result: null,
          started_at: null,
          finished_at: null,
        },
        guard: { status: "finished" },
        returning: false,
      });
    } catch (err) {
      console.error("[Catchmind] 한 판 더 실패:", err);
    }
  }, [room, sessionId]);

  // 현재 라운드 strokes만 필터링해서 반환 (안전)
  const currentRoundStrokes = strokes.filter(
    (s) => s.round_number === currentRound,
  );

  return {
    strokes: currentRoundStrokes,
    messages,
    secondsLeft,
    addStroke,
    clearCanvas,
    sendGuess,
    passDrawer,
    restartRoom,
  };
}

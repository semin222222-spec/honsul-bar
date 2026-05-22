import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { catchmindRepository } from "@/repositories/games/catchmindRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import {
  ROUND_SECONDS,
  COUNTDOWN_SECONDS,
  TRANSITION_SECONDS,
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

  // ─── live draw (Broadcast) ───────────────────────────────
  // 그리는 도중의 부분 선을 DB 없이 실시간으로 주고받기 위한 채널.
  //  - sendLiveDrawRef: repository가 채널에 바인딩해준 송신 함수
  //  - liveDrawListenersRef: 캔버스(보는 사람)가 등록한 수신 리스너 집합.
  //    high-frequency 이벤트라 state/re-render 대신 ref 기반으로 즉시 전달한다.
  const sendLiveDrawRef = useRef(null);
  const liveDrawListenersRef = useRef(new Set());

  // 캔버스(보는 사람)가 부분 선 수신을 구독. 반환값으로 해제.
  const subscribeLiveDraw = useCallback((listener) => {
    liveDrawListenersRef.current.add(listener);
    return () => liveDrawListenersRef.current.delete(listener);
  }, []);

  // 캔버스(그리는 사람)가 부분 선을 송신.
  const broadcastLiveDraw = useCallback((payload) => {
    sendLiveDrawRef.current?.(payload);
  }, []);

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

    const sub = catchmindRepository.subscribeToRoom({
      roomId,
      onLiveDraw: (payload) => {
        for (const fn of liveDrawListenersRef.current) {
          try {
            fn(payload);
          } catch {
            // 한 리스너 에러가 나머지 전달을 막지 않게
          }
        }
      },
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

    sendLiveDrawRef.current = sub.sendLiveDraw;

    const initTimer = setTimeout(load, 0);

    return () => {
      clearTimeout(initTimer);
      sub.unsubscribe();
      sendLiveDrawRef.current = null;
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
        // ⭐ 새 룰: 정답자 +1, 시간초과+정답자0명이면 출제자 -1, 그 외 출제자 0
        //   · pass도 -1 (출제자 페널티)
        let drawerBonus = 0;
        if (reason === "pass") {
          drawerBonus = -1;
        } else if (reason === "timeup" && correctSessions.length === 0) {
          drawerBonus = -1;
        }

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

  // ⭐ 첫 정답자가 나오면 즉시 라운드 종료 (캐치마인드 표준 룰)
  useEffect(() => {
    if (!isPlaying || !room) return;
    const hasCorrect = messages.some(
      (m) => m.type === "correct" && m.round_number === room.current_round,
    );
    if (hasCorrect) {
      console.log("[Catchmind] 🎯 첫 정답자 감지 → 라운드 종료 트리거");
      finalizeRound("first_correct");
    }
  }, [messages, isPlaying, room, finalizeRound]);

  // room의 최신값을 ref로 추적. 콜백들이 매 render마다 재생성되지 않게
  // 의존성에 room 객체를 넣지 않고 ref를 통해 최신값 읽기.
  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // ─────────────────────────────────────────
  // 카운트다운(countdown) → playing 전이
  //  - 모두가 보고 있지만 first-writer-wins
  //  - room.started_at + COUNTDOWN_SECONDS 가 지나면 누구든 트리거
  // ─────────────────────────────────────────
  const startingRef = useRef(false);

  const startFirstRound = useCallback(async () => {
    const r = roomRef.current;
    if (!r || startingRef.current) return;
    if (r.status !== "countdown") return;
    startingRef.current = true;

    try {
      const players = r.players || [];
      if (players.length < 2) {
        startingRef.current = false;
        return;
      }
      const { word } = pickRandomWord([]);
      const firstDrawer = players[0];

      await catchmindRepository.updateRoom({
        roomId: r.id,
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
  }, []);

  // ⚠️ deps는 room.started_at(string)만. room 객체 자체를 deps에 넣으면
  // Realtime 재구독/load 등으로 room ref가 바뀔 때마다 타이머가 리셋돼서
  // 카운트다운이 영영 안 끝남.
  const countdownStartedAt = room?.status === "countdown" ? room?.started_at : null;
  useEffect(() => {
    if (!countdownStartedAt) return;
    const startTime = new Date(countdownStartedAt).getTime();
    const delay = startTime + COUNTDOWN_SECONDS * 1000 - Date.now();
    if (delay <= 0) {
      startFirstRound();
      return;
    }
    const id = setTimeout(startFirstRound, delay + 50);
    return () => clearTimeout(id);
  }, [countdownStartedAt, startFirstRound]);

  // ─────────────────────────────────────────
  // transition → 다음 라운드 시작 / 게임 종료
  // ─────────────────────────────────────────
  const advancingRef = useRef(false);

  const advanceFromTransition = useCallback(async () => {
    const r = roomRef.current;
    if (!r || advancingRef.current) return;
    if (r.status !== "transition") return;
    advancingRef.current = true;

    try {
      const players = r.players || [];
      const nextRound = (r.current_round || 0) + 1;
      const totalRounds = r.total_rounds || players.length;
      const usedWords = r.last_round_result?.used_words || [];

      if (nextRound > totalRounds) {
        // 게임 종료
        await catchmindRepository.updateRoom({
          roomId: r.id,
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
          roomId: r.id,
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
          guard: { status: "transition", current_round: r.current_round },
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
  }, []);

  // ⚠️ status/current_round만 deps. room 객체 자체를 deps에 넣으면 매번
  // Realtime 이벤트마다 4초 타이머가 리셋돼서 다음 라운드로 영영 안 넘어감.
  const isTransition = room?.status === "transition";
  const transitionRound = isTransition ? room?.current_round : null;
  useEffect(() => {
    if (!isTransition) return;
    const id = setTimeout(advanceFromTransition, TRANSITION_SECONDS * 1000);
    return () => clearTimeout(id);
  }, [isTransition, transitionRound, advanceFromTransition]);

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
          // ⭐ 새 룰: 정답자는 무조건 +1
          scoreGained = 1;
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

        // 정답이면 즉시 라운드 종료 트리거 (Realtime echo 기다리지 않음)
        if (type === "correct") {
          console.log("[Catchmind] 🎯 본인이 첫(또는 한)명 정답 → 즉시 종료");
          finalizeRound("first_correct");
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
  // ⚠️ useMemo 필수: 게임 중 250ms 타이머 tick마다 이 훅이 re-render되는데,
  //    매번 .filter()로 새 배열을 만들면 CatchmindCanvas의 React.memo가 깨지고
  //    렌더 effect가 불필요하게 다시 돌아 그리는 도중 렉이 생긴다.
  //    strokes(state)나 currentRound가 실제로 바뀔 때만 새 배열을 만든다.
  const currentRoundStrokes = useMemo(
    () => strokes.filter((s) => s.round_number === currentRound),
    [strokes, currentRound],
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
    broadcastLiveDraw,
    subscribeLiveDraw,
  };
}

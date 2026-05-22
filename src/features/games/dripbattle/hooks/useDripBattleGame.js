import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { dripBattleRepository } from "@/repositories/games/dripBattleRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import {
  INPUT_SECONDS,
  VOTE_SECONDS,
  TOTAL_ROUNDS,
  RESULT_AUTO_DISMISS_MS,
  calcSecondsLeft,
  validateAnswer,
  inputComplete,
  votingComplete,
  computeRoundResult,
} from "../lib/dripBattleRules";
import { pickRandomQuestion } from "../data/dripBattleQuestions";

/**
 * useDripBattleGame
 *
 * 드립 배틀 진행 훅. (라이어 패턴 + 답변/투표 별도 테이블)
 *  - room + 라운드 데이터(answers/votes) Realtime 구독
 *  - 답변 제출 / 투표
 *  - 페이즈 전환: 전원 완료(방장) 또는 타임아웃(누구든) → guard로 race 흡수
 *  - 투표 종료 시 결과 집계 → last_round_result 저장 (모든 클라 동일 결과)
 *  - 다음 라운드 / 게임 종료 (방장)
 *  - finished 30s 자동 leave
 */
export function useDripBattleGame({
  room,
  sessionId,
  seatLabel,
  onRoomUpdate,
  onLeaveAfterFinish,
}) {
  const [, setTick] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [votes, setVotes] = useState([]);

  const roomId = room?.id;
  const status = room?.status;
  const round = room?.current_round;
  const isInput = status === "phase_input";
  const isVote = status === "phase_vote";
  const isFinished = status === "finished";
  const isHost = !!room && room.host_session_id === sessionId;
  const phaseStartedAt = room?.phase_started_at;

  const totalSeconds = isInput ? INPUT_SECONDS : isVote ? VOTE_SECONDS : 0;
  const secondsLeft =
    (isInput || isVote) && phaseStartedAt
      ? calcSecondsLeft(phaseStartedAt, totalSeconds)
      : totalSeconds;

  const roomRef = useRef(room);
  const answersRef = useRef(answers);
  const votesRef = useRef(votes);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    votesRef.current = votes;
  }, [votes]);

  // ─────────────────────────────────────────
  // 이번 라운드 데이터 파생
  // ─────────────────────────────────────────
  const roundAnswers = useMemo(
    () => answers.filter((a) => a.round_number === round),
    [answers, round],
  );
  const roundVotes = useMemo(
    () => votes.filter((v) => v.round_number === round),
    [votes, round],
  );

  const myAnswer = useMemo(
    () => roundAnswers.find((a) => a.session_id === sessionId) || null,
    [roundAnswers, sessionId],
  );
  const myVote = useMemo(
    () => roundVotes.find((v) => v.voter_session_id === sessionId) || null,
    [roundVotes, sessionId],
  );

  // ─────────────────────────────────────────
  // room Realtime 구독
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const load = async () => {
      try {
        const data = await dripBattleRepository.getRoom(roomId);
        if (data && onRoomUpdate) onRoomUpdate(data);
      } catch (err) {
        console.error("[DripBattle] 방 재조회 실패:", err);
      }
    };

    const unsubscribe = dripBattleRepository.subscribeToRoom({
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
          label: "DripBattle Room",
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
  // 답변 + 투표 Realtime 구독
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const reload = async () => {
      try {
        const [ans, vts] = await Promise.all([
          dripBattleRepository.listAnswers({ roomId }),
          dripBattleRepository.listVotes({ roomId }),
        ]);
        setAnswers(ans);
        setVotes(vts);
      } catch (err) {
        console.error("[DripBattle] 라운드 데이터 재조회 실패:", err);
      }
    };

    const unsubscribe = dripBattleRepository.subscribeToRoundData({
      roomId,
      onAnswerChange: (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          setAnswers((prev) =>
            prev.some((a) => a.id === payload.new.id)
              ? prev
              : [...prev, payload.new],
          );
        } else {
          reload();
        }
      },
      onVoteChange: (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          setVotes((prev) =>
            prev.some((v) => v.id === payload.new.id)
              ? prev
              : [...prev, payload.new],
          );
        } else {
          reload();
        }
      },
      onStatus: (s) => {
        handleRealtimeSubscribeStatus(s, {
          label: "DripBattle Round",
          onSubscribed: reload,
          onRecoverable: reload,
        });
      },
    });

    const initTimer = setTimeout(reload, 0);

    return () => {
      clearTimeout(initTimer);
      unsubscribe();
    };
  }, [roomId]);

  // 타이머 tick (입력/투표 페이즈)
  useEffect(() => {
    if (!(isInput || isVote) || !phaseStartedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [isInput, isVote, phaseStartedAt]);

  // ─────────────────────────────────────────
  // 답변 제출
  // ─────────────────────────────────────────
  const submittingRef = useRef(false);
  const submitAnswer = useCallback(
    async (text) => {
      const r = roomRef.current;
      if (!r || r.status !== "phase_input") return { ok: false };
      const { ok, value, error } = validateAnswer(text);
      if (!ok) return { ok: false, error };
      if (submittingRef.current) return { ok: false };

      const already = answersRef.current.some(
        (a) =>
          a.round_number === r.current_round && a.session_id === sessionId,
      );
      if (already) return { ok: true, already: true };

      submittingRef.current = true;
      try {
        const row = await dripBattleRepository.insertAnswer({
          room_id: r.id,
          round_number: r.current_round,
          session_id: sessionId,
          seat_label: seatLabel,
          answer_text: value,
        });
        setAnswers((prev) =>
          prev.some((a) => a.id === row.id) ? prev : [...prev, row],
        );
        return { ok: true };
      } catch (err) {
        console.error("[DripBattle] 답변 제출 실패:", err);
        return { ok: false, error: "제출에 실패했어요" };
      } finally {
        setTimeout(() => {
          submittingRef.current = false;
        }, 200);
      }
    },
    [sessionId, seatLabel],
  );

  // ─────────────────────────────────────────
  // 투표
  // ─────────────────────────────────────────
  const votingRef = useRef(false);
  const submitVote = useCallback(
    async (answerId) => {
      const r = roomRef.current;
      if (!r || r.status !== "phase_vote") return { ok: false };
      if (votingRef.current) return { ok: false };

      const target = answersRef.current.find((a) => a.id === answerId);
      if (!target) return { ok: false };
      if (target.session_id === sessionId)
        return { ok: false, error: "본인 답변에는 투표할 수 없어요" };

      const already = votesRef.current.some(
        (v) =>
          v.round_number === r.current_round &&
          v.voter_session_id === sessionId,
      );
      if (already) return { ok: true, already: true };

      votingRef.current = true;
      try {
        const row = await dripBattleRepository.insertVote({
          room_id: r.id,
          round_number: r.current_round,
          voter_session_id: sessionId,
          target_answer_id: answerId,
        });
        setVotes((prev) =>
          prev.some((v) => v.id === row.id) ? prev : [...prev, row],
        );
        return { ok: true };
      } catch (err) {
        console.error("[DripBattle] 투표 실패:", err);
        return { ok: false, error: "투표에 실패했어요" };
      } finally {
        setTimeout(() => {
          votingRef.current = false;
        }, 200);
      }
    },
    [sessionId],
  );

  // ─────────────────────────────────────────
  // 페이즈 전환 (guard로 race 흡수)
  // ─────────────────────────────────────────
  const transitionRef = useRef(false);

  const goToVote = useCallback(async () => {
    const r = roomRef.current;
    if (!r || r.status !== "phase_input" || transitionRef.current) return;
    transitionRef.current = true;
    try {
      await dripBattleRepository.updateRoom({
        roomId: r.id,
        updates: {
          status: "phase_vote",
          phase_started_at: new Date().toISOString(),
        },
        guard: { status: "phase_input" },
        returning: false,
      });
    } catch (err) {
      console.error("[DripBattle] 투표 전환 실패:", err);
    } finally {
      setTimeout(() => {
        transitionRef.current = false;
      }, 600);
    }
  }, []);

  const goToResult = useCallback(async () => {
    const r = roomRef.current;
    if (!r || r.status !== "phase_vote" || transitionRef.current) return;
    transitionRef.current = true;
    try {
      const roundNumber = r.current_round;
      // 최신 답변/투표 재조회 후 집계 (state lag 방지)
      const [ans, vts] = await Promise.all([
        dripBattleRepository.listAnswers({ roomId: r.id, roundNumber }),
        dripBattleRepository.listVotes({ roomId: r.id, roundNumber }),
      ]);
      const result = computeRoundResult(ans, vts);
      await dripBattleRepository.updateRoom({
        roomId: r.id,
        updates: {
          status: "phase_result",
          last_round_result: { ...result, round: roundNumber },
          phase_started_at: new Date().toISOString(),
        },
        guard: { status: "phase_vote" },
        returning: false,
      });
    } catch (err) {
      console.error("[DripBattle] 결과 전환 실패:", err);
    } finally {
      setTimeout(() => {
        transitionRef.current = false;
      }, 600);
    }
  }, []);

  // 다음 라운드 / 게임 종료 (방장)
  const nextRound = useCallback(async () => {
    const r = roomRef.current;
    if (!r || r.status !== "phase_result" || transitionRef.current)
      return { ok: false };
    if (r.host_session_id !== sessionId)
      return { ok: false, error: "방장만 진행할 수 있어요" };

    transitionRef.current = true;
    try {
      const lastRound = r.current_round >= (r.total_rounds || TOTAL_ROUNDS);
      if (lastRound) {
        await dripBattleRepository.updateRoom({
          roomId: r.id,
          updates: {
            status: "finished",
            finished_at: new Date().toISOString(),
          },
          guard: { status: "phase_result" },
          returning: false,
        });
      } else {
        const used = Array.isArray(r.used_questions) ? r.used_questions : [];
        const question = pickRandomQuestion(used);
        await dripBattleRepository.updateRoom({
          roomId: r.id,
          updates: {
            status: "phase_input",
            current_round: r.current_round + 1,
            current_question: question,
            used_questions: [...used, question],
            phase_started_at: new Date().toISOString(),
            last_round_result: null,
          },
          guard: { status: "phase_result" },
          returning: false,
        });
      }
      return { ok: true };
    } catch (err) {
      console.error("[DripBattle] 다음 라운드 전환 실패:", err);
      return { ok: false, error: "진행에 실패했어요" };
    } finally {
      setTimeout(() => {
        transitionRef.current = false;
      }, 600);
    }
  }, [sessionId]);

  // ── 입력 페이즈 종료: 전원 제출(방장) / 타임아웃(누구든)
  useEffect(() => {
    if (!isHost || !isInput) return;
    if (!inputComplete({ players: room?.players || [], answers: roundAnswers }))
      return;
    goToVote();
  }, [isHost, isInput, room, roundAnswers, goToVote]);

  useEffect(() => {
    if (!isInput || !phaseStartedAt) return;
    if (secondsLeft > 0) return;
    goToVote();
  }, [isInput, phaseStartedAt, secondsLeft, goToVote]);

  // ── 투표 페이즈 종료: 전원 투표(방장) / 타임아웃(누구든)
  useEffect(() => {
    if (!isHost || !isVote) return;
    if (
      !votingComplete({
        players: room?.players || [],
        answers: roundAnswers,
        votes: roundVotes,
      })
    )
      return;
    goToResult();
  }, [isHost, isVote, room, roundAnswers, roundVotes, goToResult]);

  useEffect(() => {
    if (!isVote || !phaseStartedAt) return;
    if (secondsLeft > 0) return;
    goToResult();
  }, [isVote, phaseStartedAt, secondsLeft, goToResult]);

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
    roundAnswers,
    roundVotes,
    myAnswer,
    myVote,
    submittedCount: roundAnswers.length,
    votedCount: roundVotes.length,
    submitAnswer,
    submitVote,
    nextRound,
    dismissLeftMs,
  };
}

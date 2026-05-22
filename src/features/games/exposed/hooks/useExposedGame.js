import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { exposedRepository } from "@/repositories/games/exposedRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import {
  INPUT_SECONDS,
  VOTE_SECONDS,
  RESULT_AUTO_DISMISS_MS,
  calcSecondsLeft,
  validateQuestion,
  inputComplete,
  voteComplete,
} from "../lib/exposedRules";
import { pickRandomQuestion } from "../data/exposedQuestions";

/**
 * useExposedGame
 *
 * 익명 폭로전 진행 훅. (드립 패턴 + 단일 room 소스)
 *  - room 한 곳만 Realtime 구독한다. (votes는 잠겨 있어 클라가 읽지 않는다)
 *  - 질문 제출(익명) / 투표(fold·pass)
 *  - 페이즈 전환: 전원 완료(방장) 또는 타임아웃(누구든) → guard로 race 흡수
 *    · 입력 종료 → 풀에서 질문 1개 뽑아 phase_vote
 *    · 투표 종료 → tally RPC(서버 집계) → phase_result
 *  - 내 결과(안전/-1)는 "내가 던진 표(myVote, 로컬) + outcome"으로만 계산 → 익명 보장
 *  - finished 30s 자동 leave
 */
export function useExposedGame({
  room,
  sessionId,
  onRoomUpdate,
  onLeaveAfterFinish,
}) {
  const [, setTick] = useState(0);
  // 내가 이번 라운드에 던진 표(로컬 전용, 라운드에 묶음). 남의 표는 절대 받지 않는다.
  const [voteRecord, setVoteRecord] = useState({ round: 0, vote: null });

  const roomId = room?.id;
  const status = room?.status;
  const round = room?.current_round || 0;
  const isInput = status === "phase_input";
  const isVote = status === "phase_vote";
  const isResult = status === "phase_result";
  const isFinished = status === "finished";
  const isHost = !!room && room.host_session_id === sessionId;
  const phaseStartedAt = room?.phase_started_at;

  const players = useMemo(() => room?.players || [], [room]);
  const submittedSessions = useMemo(
    () => room?.submitted_sessions || [],
    [room],
  );
  const votedSessions = useMemo(() => room?.voted_sessions || [], [room]);

  const iSubmitted = submittedSessions.includes(sessionId);
  const iVoted = votedSessions.includes(sessionId);

  // 라운드가 바뀌면 자동으로 null (effect 없이 파생)
  const myVote = voteRecord.round === round ? voteRecord.vote : null;

  const totalSeconds = isInput ? INPUT_SECONDS : isVote ? VOTE_SECONDS : 0;
  const secondsLeft =
    (isInput || isVote) && phaseStartedAt
      ? calcSecondsLeft(phaseStartedAt, totalSeconds)
      : totalSeconds;

  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // ─────────────────────────────────────────
  // room Realtime 구독 (단일 소스)
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const load = async () => {
      try {
        const data = await exposedRepository.getRoom(roomId);
        if (data && onRoomUpdate) onRoomUpdate(data);
      } catch (err) {
        console.error("[Exposed] 방 재조회 실패:", err);
      }
    };

    const unsubscribe = exposedRepository.subscribeToRoom({
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
          label: "Exposed Room",
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

  // 타이머 tick (입력/투표 페이즈)
  useEffect(() => {
    if (!(isInput || isVote) || !phaseStartedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [isInput, isVote, phaseStartedAt]);

  // ─────────────────────────────────────────
  // 질문 제출 (익명)
  // ─────────────────────────────────────────
  const submittingRef = useRef(false);
  const submitQuestion = useCallback(
    async (text) => {
      const r = roomRef.current;
      if (!r || r.status !== "phase_input") return { ok: false };
      const { ok, value, error } = validateQuestion(text);
      if (!ok) return { ok: false, error };
      if (submittingRef.current) return { ok: false };
      if ((r.submitted_sessions || []).includes(sessionId))
        return { ok: true, already: true };

      submittingRef.current = true;
      try {
        await exposedRepository.submitQuestionRpc({
          roomId: r.id,
          sessionId,
          text: value,
        });
        return { ok: true };
      } catch (err) {
        console.error("[Exposed] 질문 제출 실패:", err);
        return { ok: false, error: "제출에 실패했어요" };
      } finally {
        setTimeout(() => {
          submittingRef.current = false;
        }, 200);
      }
    },
    [sessionId],
  );

  // ─────────────────────────────────────────
  // 투표 (fold/pass)
  // ─────────────────────────────────────────
  const votingRef = useRef(false);
  const castVote = useCallback(
    async (vote) => {
      const r = roomRef.current;
      if (!r || r.status !== "phase_vote") return { ok: false };
      if (vote !== "fold" && vote !== "pass") return { ok: false };
      if (votingRef.current) return { ok: false };
      if ((r.voted_sessions || []).includes(sessionId)) {
        setVoteRecord((prev) =>
          prev.round === r.current_round ? prev : { round: r.current_round, vote },
        );
        return { ok: true, already: true };
      }

      votingRef.current = true;
      // 낙관적: 내 표는 로컬에 즉시 반영 (결과 화면 계산용)
      setVoteRecord({ round: r.current_round, vote });
      try {
        await exposedRepository.castVoteRpc({
          roomId: r.id,
          sessionId,
          round: r.current_round,
          vote,
        });
        return { ok: true };
      } catch (err) {
        console.error("[Exposed] 투표 실패:", err);
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

  // 풀에서 질문 1개 뽑아 phase_vote 로 (입력 종료 또는 다음 질문)
  const advanceToVote = useCallback(
    async (fromStatus) => {
      const r = roomRef.current;
      if (!r || r.status !== fromStatus || transitionRef.current) return;
      transitionRef.current = true;
      try {
        const used = Array.isArray(r.used_questions) ? r.used_questions : [];
        const pool = Array.isArray(r.question_pool) ? r.question_pool : [];
        const fresh = pool
          .map((q) => q?.text)
          .filter((t) => typeof t === "string" && t && !used.includes(t));
        const question =
          fresh.length > 0
            ? fresh[Math.floor(Math.random() * fresh.length)]
            : pickRandomQuestion(r.spice_level, used);

        await exposedRepository.updateRoom({
          roomId: r.id,
          updates: {
            status: "phase_vote",
            current_round: (r.current_round || 0) + 1,
            current_question: question,
            used_questions: [...used, question],
            voted_sessions: [],
            last_round_result: null,
            phase_started_at: new Date().toISOString(),
          },
          guard: { status: fromStatus },
          returning: false,
        });
      } catch (err) {
        console.error("[Exposed] 투표 전환 실패:", err);
      } finally {
        setTimeout(() => {
          transitionRef.current = false;
        }, 600);
      }
    },
    [],
  );

  // 투표 종료 → 서버 집계
  const goToResult = useCallback(async () => {
    const r = roomRef.current;
    if (!r || r.status !== "phase_vote" || transitionRef.current) return;
    transitionRef.current = true;
    try {
      await exposedRepository.tallyRoundRpc({
        roomId: r.id,
        round: r.current_round,
      });
    } catch (err) {
      console.error("[Exposed] 결과 집계 실패:", err);
    } finally {
      setTimeout(() => {
        transitionRef.current = false;
      }, 600);
    }
  }, []);

  // 다음 질문 (방장) — phase_result → phase_vote
  const nextQuestion = useCallback(async () => {
    const r = roomRef.current;
    if (!r || r.status !== "phase_result") return { ok: false };
    if (r.host_session_id !== sessionId)
      return { ok: false, error: "방장만 진행할 수 있어요" };
    await advanceToVote("phase_result");
    return { ok: true };
  }, [sessionId, advanceToVote]);

  // 게임 종료 (방장) — phase_result → finished
  const endGame = useCallback(async () => {
    const r = roomRef.current;
    if (!r || r.status !== "phase_result") return { ok: false };
    if (r.host_session_id !== sessionId)
      return { ok: false, error: "방장만 진행할 수 있어요" };
    try {
      await exposedRepository.updateRoom({
        roomId: r.id,
        updates: { status: "finished", finished_at: new Date().toISOString() },
        guard: { status: "phase_result" },
        returning: false,
      });
      return { ok: true };
    } catch (err) {
      console.error("[Exposed] 게임 종료 실패:", err);
      return { ok: false, error: "종료에 실패했어요" };
    }
  }, [sessionId]);

  // 한 판 더 (방장) — 라이프/풀/투표 초기화 → waiting
  const restartGame = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return { ok: false };
    if (r.host_session_id !== sessionId)
      return { ok: false, error: "방장만 진행할 수 있어요" };
    try {
      await exposedRepository.restartGameRpc({ roomId: r.id, sessionId });
      return { ok: true };
    } catch (err) {
      console.error("[Exposed] 재시작 실패:", err);
      return { ok: false, error: "재시작에 실패했어요" };
    }
  }, [sessionId]);

  // ── 입력 페이즈 종료: 전원 제출(방장) / 타임아웃(누구든)
  useEffect(() => {
    if (!isHost || !isInput) return;
    if (!inputComplete({ players, submittedSessions })) return;
    advanceToVote("phase_input");
  }, [isHost, isInput, players, submittedSessions, advanceToVote]);

  useEffect(() => {
    if (!isInput || !phaseStartedAt) return;
    if (secondsLeft > 0) return;
    advanceToVote("phase_input");
  }, [isInput, phaseStartedAt, secondsLeft, advanceToVote]);

  // ── 투표 페이즈 종료: 전원 투표(방장) / 타임아웃(누구든)
  useEffect(() => {
    if (!isHost || !isVote) return;
    if (!voteComplete({ players, votedSessions })) return;
    goToResult();
  }, [isHost, isVote, players, votedSessions, goToResult]);

  useEffect(() => {
    if (!isVote || !phaseStartedAt) return;
    if (secondsLeft > 0) return;
    goToResult();
  }, [isVote, phaseStartedAt, secondsLeft, goToResult]);

  // ─────────────────────────────────────────
  // finished 30s 자동 leave (setTimeout — render 중 Date.now 호출 안 함)
  // ─────────────────────────────────────────
  const finishedAt = isFinished ? room?.finished_at : null;
  useEffect(() => {
    if (!isFinished || !finishedAt) return;
    const startMs = new Date(finishedAt).getTime();
    const remaining = Math.max(
      0,
      RESULT_AUTO_DISMISS_MS - (Date.now() - startMs),
    );
    const id = setTimeout(() => onLeaveAfterFinish?.(), remaining);
    return () => clearTimeout(id);
  }, [isFinished, finishedAt, onLeaveAfterFinish]);

  const me = useMemo(
    () => players.find((p) => p.session_id === sessionId) || null,
    [players, sessionId],
  );

  return {
    secondsLeft,
    me,
    myVote,
    iSubmitted,
    iVoted,
    submittedCount: submittedSessions.length,
    votedCount: votedSessions.length,
    submitQuestion,
    castVote,
    nextQuestion,
    endGame,
    restartGame,
    isResult,
    isFinished,
  };
}

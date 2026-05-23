import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { exposedRepository } from "@/repositories/games/exposedRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import {
  VOTE_SECONDS,
  RESULT_AUTO_DISMISS_MS,
  calcSecondsLeft,
  voteComplete,
} from "../lib/exposedRules";
import { pickRandomQuestion } from "../data/exposedQuestions";

/**
 * useExposedGame (v2 — 지목 방식)
 *
 *  - room 한 곳만 Realtime 구독 (votes는 잠겨 있어 클라가 읽지 않는다)
 *  - castVote: 다른 참가자 1명 지목 (자기 지목 불가, 1인 1표)
 *  - 페이즈 전환: 전원 투표(방장) 또는 타임아웃(누구든) → guard로 race 흡수 → tally(서버 집계)
 *  - 다음 질문(방장): 랜덤 질문 새로 뽑아 phase_vote
 *  - finished 30s 자동 leave
 *
 * 내 표(누구를 찍었는지)는 로컬에만 둔다. 남의 표는 받지 않는다.
 */
export function useExposedGame({
  room,
  sessionId,
  onRoomUpdate,
  onLeaveAfterFinish,
}) {
  const [, setTick] = useState(0);
  // 내가 이번 라운드에 지목한 대상(로컬 전용, 라운드에 묶음)
  const [voteRecord, setVoteRecord] = useState({ round: 0, target: null });

  const roomId = room?.id;
  const status = room?.status;
  const round = room?.current_round || 0;
  const isVote = status === "phase_vote";
  const isResult = status === "phase_result";
  const isFinished = status === "finished";
  const isHost = !!room && room.host_session_id === sessionId;
  const phaseStartedAt = room?.phase_started_at;

  const players = useMemo(() => room?.players || [], [room]);
  const votedSessions = useMemo(() => room?.voted_sessions || [], [room]);

  const iVoted = votedSessions.includes(sessionId);
  // 라운드가 바뀌면 자동 null (effect 없이 파생)
  const myVoteTarget = voteRecord.round === round ? voteRecord.target : null;

  const totalSeconds = isVote ? VOTE_SECONDS : 0;
  const secondsLeft =
    isVote && phaseStartedAt
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

  // 타이머 tick (투표 페이즈)
  useEffect(() => {
    if (!isVote || !phaseStartedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [isVote, phaseStartedAt]);

  // ─────────────────────────────────────────
  // 투표 (다른 참가자 1명 지목)
  //   - 이미 투표/잘못된 대상/페이즈 불일치는 조용히 무시(얼럿 없음).
  //   - 진짜 네트워크/DB 오류만 실패로 반환한다.
  // ─────────────────────────────────────────
  const votingRef = useRef(false);
  const castVote = useCallback(
    async (targetSessionId, targetSeatLabel) => {
      const r = roomRef.current;
      if (!r || r.status !== "phase_vote") return { ok: false };
      if (!targetSessionId || targetSessionId === sessionId)
        return { ok: false, error: "다른 참가자를 골라주세요" };
      // 대상이 방 참가자인지 확인 (오매칭으로 인한 실패 방지)
      const target = (r.players || []).find(
        (p) => p.session_id === targetSessionId,
      );
      if (!target) return { ok: false, error: "참가자를 찾을 수 없어요" };

      if (votingRef.current) return { ok: false };
      if ((r.voted_sessions || []).includes(sessionId)) {
        setVoteRecord((prev) =>
          prev.round === r.current_round
            ? prev
            : { round: r.current_round, target: targetSessionId },
        );
        return { ok: true, already: true };
      }

      votingRef.current = true;
      // 낙관적: 내 지목은 로컬에 즉시 반영
      setVoteRecord({ round: r.current_round, target: targetSessionId });
      try {
        await exposedRepository.castVoteRpc({
          roomId: r.id,
          sessionId,
          round: r.current_round,
          targetSessionId,
          targetSeatLabel: targetSeatLabel || target.seat_label,
        });
        return { ok: true };
      } catch (err) {
        console.error("[Exposed] 투표 실패:", err);
        // 실패 시 낙관적 반영 롤백
        setVoteRecord({ round: r.current_round, target: null });
        return { ok: false, error: "투표 전송에 실패했어요. 다시 시도해주세요." };
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
    if (!r || r.status !== "phase_result" || transitionRef.current)
      return { ok: false };
    if (r.host_session_id !== sessionId)
      return { ok: false, error: "방장만 진행할 수 있어요" };

    transitionRef.current = true;
    try {
      const used = Array.isArray(r.used_questions) ? r.used_questions : [];
      const question = pickRandomQuestion(used);
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
        guard: { status: "phase_result" },
        returning: false,
      });
      return { ok: true };
    } catch (err) {
      console.error("[Exposed] 다음 질문 전환 실패:", err);
      return { ok: false, error: "진행에 실패했어요" };
    } finally {
      setTimeout(() => {
        transitionRef.current = false;
      }, 600);
    }
  }, [sessionId]);

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

  // 한 판 더 (방장) — 풀/투표 초기화 → waiting
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
    myVoteTarget,
    iVoted,
    votedCount: votedSessions.length,
    castVote,
    nextQuestion,
    endGame,
    restartGame,
    isResult,
    isFinished,
  };
}

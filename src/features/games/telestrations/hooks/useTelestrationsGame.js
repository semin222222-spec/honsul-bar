import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { telestrationsRepository } from "@/repositories/games/telestrationsRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import {
  RESULT_AUTO_DISMISS_MS,
  WORD_REVEAL_AUTO_NEXT_MS,
  EMPTY_DRAWING_DATA,
  EMPTY_GUESS_WORD,
  isDrawingStep as isDrawingStepFn,
  getStepDurationSec,
  getTotalSteps,
  calcStepSecondsLeft,
} from "../lib/telestrationsRules";
import {
  sortPlayers,
  findPlayerIndex,
  getChainStarterForPlayerAtStep,
} from "../lib/telestrationsChain";

/**
 * useTelestrationsGame
 *
 * 텔레스트레이션 게임 진행 훅 — 자동 패스 시스템 핵심.
 *
 *  - room realtime 구독 → onRoomUpdate 로 부모에게 알림
 *  - entries INSERT 구독 → 모두 제출 시 방장이 next step / finished 로 UPDATE
 *  - 직전 step 의 chain entry 자동 로드 (그릴 단어 / 추측할 그림)
 *  - submitEntry: 그림 또는 단어 제출 (UNIQUE 충돌 idempotent)
 *  - 시간 초과 시 빈 데이터 자동 제출
 *  - word_reveal → 5초 후 playing 진입 (방장)
 *  - finished 60s 후 자동 leave
 *
 * Race condition 방지:
 *  - 모든 status/current_step UPDATE 에 guard 조건
 *  - submittingRef / transitioningRef / fireDismissRef 가드
 */
export function useTelestrationsGame({
  room,
  sessionId,
  onRoomUpdate,
  onLeaveAfterFinish,
}) {
  const [, setTick] = useState(0);
  const [currentInputEntry, setCurrentInputEntry] = useState(null);
  const [allEntries, setAllEntries] = useState([]);
  const [mySubmittedStep, setMySubmittedStep] = useState(-1);
  const [submittedAuthors, setSubmittedAuthors] = useState(() => new Set());

  const roomId = room?.id;
  const status = room?.status;
  const isWordReveal = status === "word_reveal";
  const isPlaying = status === "playing";
  const isFinished = status === "finished";
  const isHost = !!room && room.host_session_id === sessionId;

  const players = useMemo(
    () => sortPlayers(room?.players || []),
    [room?.players],
  );
  const myIdx = useMemo(
    () => findPlayerIndex(players, sessionId),
    [players, sessionId],
  );
  const totalSteps = getTotalSteps(players.length);
  const currentStep = room?.current_step ?? 0;
  const drawingNow = isDrawingStepFn(currentStep);

  const me = myIdx >= 0 ? players[myIdx] : null;

  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // ─────────────────────────────────────────
  // Realtime room 구독
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const load = async () => {
      try {
        const data = await telestrationsRepository.getRoom(roomId);
        if (data && onRoomUpdate) onRoomUpdate(data);
      } catch (err) {
        console.error("[Telestrations] 방 재조회 실패:", err);
      }
    };

    const unsubscribe = telestrationsRepository.subscribeToRoom({
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
          label: "Telestrations Room",
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
  // playing 중 1초마다 tick (타이머 표시 + 타임아웃 감지)
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [isPlaying]);

  // ─────────────────────────────────────────
  // word_reveal → 5초 후 playing 진입 (방장만)
  // ─────────────────────────────────────────
  const wordRevealTransitionRef = useRef(false);
  useEffect(() => {
    if (!isHost || !isWordReveal || !roomId) return;
    if (wordRevealTransitionRef.current) return;

    const timer = setTimeout(() => {
      wordRevealTransitionRef.current = true;
      telestrationsRepository
        .updateRoom({
          roomId,
          updates: {
            status: "playing",
            current_step: 0,
            step_started_at: new Date().toISOString(),
          },
          guard: { status: "word_reveal" },
          returning: false,
        })
        .catch((err) =>
          console.error("[Telestrations] playing 전환 실패:", err),
        )
        .finally(() => {
          setTimeout(() => {
            wordRevealTransitionRef.current = false;
          }, 800);
        });
    }, WORD_REVEAL_AUTO_NEXT_MS);

    return () => clearTimeout(timer);
  }, [isHost, isWordReveal, roomId]);

  // ─────────────────────────────────────────
  // 현재 step 의 입력 자료 로드
  //   - step 0: 자신의 initial_word (그릴 단어)
  //   - step k >= 1: 내가 받을 chain 의 (step-1) entry
  //       · 직전 step 이 그리기였으면 → drawing 자료를 보고 단어 추측
  //       · 직전 step 이 추측이었으면 → 그 단어를 보고 그림 그림
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !roomId || myIdx < 0) {
      setCurrentInputEntry(null);
      return;
    }

    if (currentStep === 0) {
      setCurrentInputEntry({
        source: "initial",
        word: me?.initial_word ?? null,
        drawing: null,
        chainStarterSessionId: me?.session_id ?? null,
      });
      return;
    }

    const chainStarter = getChainStarterForPlayerAtStep(
      players,
      myIdx,
      currentStep,
    );
    if (!chainStarter) {
      setCurrentInputEntry(null);
      return;
    }

    let cancelled = false;
    telestrationsRepository
      .getEntry({
        roomId,
        chainStarterSessionId: chainStarter.session_id,
        step: currentStep - 1,
      })
      .then((entry) => {
        if (cancelled) return;
        if (!entry) {
          setCurrentInputEntry({
            source: "missing",
            word: null,
            drawing: null,
            chainStarterSessionId: chainStarter.session_id,
          });
          return;
        }
        setCurrentInputEntry({
          source: "prev_entry",
          word: entry.word_content,
          drawing: entry.drawing_data,
          chainStarterSessionId: chainStarter.session_id,
          fromSeatLabel: entry.author_seat_label,
        });
      })
      .catch((err) => {
        console.error("[Telestrations] 입력 자료 로드 실패:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [isPlaying, currentStep, roomId, myIdx, players, me]);

  // ─────────────────────────────────────────
  // step 바뀌면 내 제출 플래그 + 제출자 목록 리셋
  // ─────────────────────────────────────────
  useEffect(() => {
    setMySubmittedStep(-1);
    setSubmittedAuthors(new Set());
  }, [currentStep, status]);

  // ─────────────────────────────────────────
  // submitEntry — 그림 또는 단어 제출
  //   - UNIQUE(room, chain, step) 충돌은 idempotent 처리
  // ─────────────────────────────────────────
  const submittingRef = useRef(false);

  const submitEntry = useCallback(
    async (content) => {
      if (submittingRef.current) return { ok: false };
      const r = roomRef.current;
      if (!r || r.status !== "playing") return { ok: false };

      const sorted = sortPlayers(r.players || []);
      const idx = findPlayerIndex(sorted, sessionId);
      if (idx < 0) return { ok: false, error: "방에 없어요" };

      const step = r.current_step ?? 0;
      const chainStarter = getChainStarterForPlayerAtStep(sorted, idx, step);
      if (!chainStarter) return { ok: false, error: "체인 매핑 실패" };

      const meNow = sorted[idx];
      const drawing = isDrawingStepFn(step);

      const payload = {
        room_id: r.id,
        chain_starter_session_id: chainStarter.session_id,
        step,
        author_session_id: sessionId,
        author_seat_label: meNow?.seat_label || "",
        entry_type: drawing ? "drawing" : "word",
        drawing_data: drawing ? content : null,
        word_content: drawing ? null : content,
      };

      submittingRef.current = true;
      try {
        await telestrationsRepository.insertEntry(payload);
        setMySubmittedStep(step);
        return { ok: true };
      } catch (err) {
        // UNIQUE 충돌 (23505) = 이미 제출됨
        if (err?.code === "23505") {
          setMySubmittedStep(step);
          return { ok: true };
        }
        console.error("[Telestrations] 제출 실패:", err);
        return { ok: false, error: "제출에 실패했어요" };
      } finally {
        setTimeout(() => {
          submittingRef.current = false;
        }, 300);
      }
    },
    [sessionId],
  );

  // ─────────────────────────────────────────
  // 모두 제출 감지 → 방장만 next step / finished 로 UPDATE
  //   - entries INSERT 구독 + 초기 1회 체크 (Realtime 누락 보정)
  // ─────────────────────────────────────────
  const transitionStepRef = useRef(false);

  const refreshSubmittedAuthors = useCallback(async () => {
    const r = roomRef.current;
    if (!r || r.status !== "playing") return [];
    try {
      const submitted = await telestrationsRepository.listEntriesForStep({
        roomId: r.id,
        step: r.current_step ?? 0,
      });
      setSubmittedAuthors(
        new Set(submitted.map((s) => s.author_session_id)),
      );
      return submitted;
    } catch (err) {
      console.error("[Telestrations] 제출자 조회 실패:", err);
      return [];
    }
  }, []);

  const checkAndAdvance = useCallback(async () => {
    const r = roomRef.current;
    if (!r || r.status !== "playing") return;
    if (transitionStepRef.current) return;

    const step = r.current_step ?? 0;
    const playerCount = (r.players || []).length;
    if (playerCount === 0) return;

    // 제출자 목록 갱신 (모두에게 필요한 UI 데이터)
    const submitted = await refreshSubmittedAuthors();

    // 방장만 다음 단계 전환
    if (r.host_session_id !== sessionId) return;
    if (submitted.length < playerCount) return;

    try {
      transitionStepRef.current = true;
      const nextStep = step + 1;
      const total = getTotalSteps(playerCount);

      if (nextStep >= total) {
        await telestrationsRepository.updateRoom({
          roomId: r.id,
          updates: {
            status: "finished",
            finished_at: new Date().toISOString(),
            step_started_at: null,
          },
          guard: { status: "playing", current_step: step },
          returning: false,
        });
      } else {
        await telestrationsRepository.updateRoom({
          roomId: r.id,
          updates: {
            current_step: nextStep,
            step_started_at: new Date().toISOString(),
          },
          guard: { status: "playing", current_step: step },
          returning: false,
        });
      }
    } catch (err) {
      console.error("[Telestrations] 단계 전환 실패:", err);
    } finally {
      setTimeout(() => {
        transitionStepRef.current = false;
      }, 600);
    }
  }, [sessionId, refreshSubmittedAuthors]);

  useEffect(() => {
    if (!isPlaying || !roomId) return;

    const unsubscribe = telestrationsRepository.subscribeToEntries({
      roomId,
      onInsert: () => {
        checkAndAdvance();
      },
      onStatus: () => {},
    });

    // 초기 1회 (Realtime 누락 / 페이지 늦게 진입 보정)
    const initTimer = setTimeout(checkAndAdvance, 200);

    return () => {
      clearTimeout(initTimer);
      unsubscribe();
    };
  }, [isPlaying, roomId, currentStep, checkAndAdvance]);

  // ─────────────────────────────────────────
  // 시간 초과 자동 제출
  //   - step_started_at + duration 지나면 빈 데이터 INSERT
  //   - 이미 제출했으면 (mySubmittedStep === currentStep) 스킵
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !room?.step_started_at) return;
    if (mySubmittedStep === currentStep) return;
    if (myIdx < 0) return;

    const stepStarted = new Date(room.step_started_at).getTime();
    const limitMs = getStepDurationSec(currentStep) * 1000;
    const elapsed = Date.now() - stepStarted;
    const remaining = limitMs - elapsed;

    const fire = () => {
      const empty = isDrawingStepFn(currentStep)
        ? EMPTY_DRAWING_DATA
        : EMPTY_GUESS_WORD;
      submitEntry(empty);
    };

    if (remaining <= 0) {
      fire();
      return;
    }

    const id = setTimeout(fire, remaining);
    return () => clearTimeout(id);
  }, [
    isPlaying,
    currentStep,
    room?.step_started_at,
    mySubmittedStep,
    myIdx,
    submitEntry,
  ]);

  // ─────────────────────────────────────────
  // 결과 화면: 모든 entries 로드
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!isFinished || !roomId) {
      setAllEntries([]);
      return;
    }
    let cancelled = false;
    telestrationsRepository
      .listEntriesByRoom(roomId)
      .then((data) => {
        if (!cancelled) setAllEntries(data);
      })
      .catch((err) =>
        console.error("[Telestrations] 결과 entries 로드 실패:", err),
      );
    return () => {
      cancelled = true;
    };
  }, [isFinished, roomId]);

  // ─────────────────────────────────────────
  // finished 60s 자동 leave (라이어 패턴)
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
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [isFinished]);

  // 타이머 표시용
  const stepSecondsLeft =
    isPlaying && room?.step_started_at
      ? Math.ceil(calcStepSecondsLeft(room.step_started_at, currentStep))
      : getStepDurationSec(currentStep);

  const mySubmittedThisStep = mySubmittedStep === currentStep;

  return {
    // 진행 상태
    players,
    myIdx,
    me,
    currentStep,
    totalSteps,
    drawingNow,
    stepSecondsLeft,
    // 현재 입력 자료
    currentInputEntry,
    // 제출
    submitEntry,
    mySubmittedThisStep,
    submittedAuthors,
    // 결과
    allEntries,
    dismissLeftMs,
  };
}

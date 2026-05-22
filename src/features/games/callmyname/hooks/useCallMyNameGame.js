import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { callMyNameRepository } from "@/repositories/games/callMyNameRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import { RESULT_AUTO_DISMISS_MS, validateGuess } from "../lib/callMyNameRules";

/**
 * useCallMyNameGame
 *
 * 콜 마이 네임 진행 훅. (드립/라이어 패턴 — 단, 자유 플레이라 페이즈 타이머 없음)
 *  - room Realtime 구독
 *  - 정답 시도: 서버 RPC(call_my_name_attempt)가 정규화 비교 + 결과 원자 적용 + 종료 판정.
 *    반환값으로 성공/실패 연출에 필요한 정보(correct, lives_remaining, status, identity_keyword)를 받는다.
 *  - finished 30s 자동 leave
 */
export function useCallMyNameGame({
  room,
  sessionId,
  onRoomUpdate,
  onLeaveAfterFinish,
}) {
  const [, setTick] = useState(0);

  const roomId = room?.id;
  const status = room?.status;
  const isFinished = status === "finished";

  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const players = useMemo(() => room?.players || [], [room]);
  const me = useMemo(
    () => players.find((p) => p.session_id === sessionId) || null,
    [players, sessionId],
  );
  const others = useMemo(
    () => players.filter((p) => p.session_id !== sessionId),
    [players, sessionId],
  );

  // ─────────────────────────────────────────
  // room Realtime 구독
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const load = async () => {
      try {
        const data = await callMyNameRepository.getRoom(roomId);
        if (data && onRoomUpdate) onRoomUpdate(data);
      } catch (err) {
        console.error("[CallMyName] 방 재조회 실패:", err);
      }
    };

    const unsubscribe = callMyNameRepository.subscribeToRoom({
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
          label: "CallMyName Room",
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
  // 정답 시도 (서버 RPC가 정오답 판정 + 결과 적용)
  // ─────────────────────────────────────────
  const submittingRef = useRef(false);
  const submitGuess = useCallback(
    async (text) => {
      const r = roomRef.current;
      if (!r || r.status !== "playing") return { ok: false };
      const { ok, value, error } = validateGuess(text);
      if (!ok) return { ok: false, error };
      if (submittingRef.current) return { ok: false };

      submittingRef.current = true;
      try {
        const res = await callMyNameRepository.attemptRpc({
          roomId: r.id,
          sessionId,
          guess: value,
        });
        if (!res) return { ok: false, error: "지금은 시도할 수 없어요" };
        return { ok: true, guess: value, ...res };
      } catch (err) {
        console.error("[CallMyName] 정답 시도 실패:", err);
        return { ok: false, error: "전송에 실패했어요" };
      } finally {
        setTimeout(() => {
          submittingRef.current = false;
        }, 200);
      }
    },
    [sessionId],
  );

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
    me,
    others,
    submitGuess,
    dismissLeftMs,
  };
}

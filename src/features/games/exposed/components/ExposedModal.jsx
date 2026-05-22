import { useEffect, useRef, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useExposedRoom } from "../hooks/useExposedRoom";
import { useExposedGame } from "../hooks/useExposedGame";
import { C, FONTS } from "./exposedTheme";
import ExposedLobby from "./ExposedLobby";
import ExposedWaitingRoom from "./ExposedWaitingRoom";
import ExposedQuestionInput from "./ExposedQuestionInput";
import ExposedVote from "./ExposedVote";
import ExposedResult from "./ExposedResult";

/**
 * ExposedModal — 익명 폭로전 전체 단계를 감싸는 풀스크린 모달
 *
 * room.status: waiting → phase_input → phase_vote → phase_result → (다음 질문 ...) → finished
 * room이 없으면 lobby.
 */
export default function ExposedModal({
  open,
  onClose,
  sessionId,
  seatLabel,
  storeId,
}) {
  const room = useExposedRoom({ sessionId, seatLabel, storeId });

  const handleAutoDismiss = useCallback(() => {
    room.setRoomDirect(null);
    room.leaveRoom();
  }, [room]);

  const game = useExposedGame({
    room: room.myRoom,
    sessionId,
    onRoomUpdate: room.setRoomDirect,
    onLeaveAfterFinish: handleAutoDismiss,
  });

  // ESC로 닫기 (lobby에서만)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape" && !room.myRoom) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, room.myRoom, onClose]);

  // 모달 unmount 시 자동 leave (유령 방 방지)
  const leaveRoomRef = useRef(room.leaveRoom);
  const myRoomRef = useRef(room.myRoom);
  useEffect(() => {
    leaveRoomRef.current = room.leaveRoom;
    myRoomRef.current = room.myRoom;
  });
  useEffect(() => {
    return () => {
      if (myRoomRef.current) leaveRoomRef.current?.();
    };
  }, []);

  const handleCreate = useCallback(async () => {
    const res = await room.createRoom();
    if (!res.ok) alert(res.error || "방을 만들지 못했어요");
  }, [room]);

  const handleJoin = useCallback(
    async (roomId) => {
      const res = await room.joinRoom(roomId);
      if (!res.ok) alert(res.error || "입장에 실패했어요");
    },
    [room],
  );

  const handleLeaveToLobby = useCallback(async () => {
    room.setRoomDirect(null);
    await room.leaveRoom();
  }, [room]);

  const handleStart = useCallback(async () => {
    const res = await room.startGame();
    if (!res?.ok && res?.error) alert(res.error);
  }, [room]);

  if (!open) return null;

  const r = room.myRoom;
  let content = null;

  if (!r) {
    content = (
      <ExposedLobby
        rooms={room.rooms}
        loading={room.loading}
        onCreate={handleCreate}
        onJoin={handleJoin}
        mySeat={seatLabel}
      />
    );
  } else if (r.status === "waiting") {
    content = (
      <ExposedWaitingRoom
        room={r}
        isHost={room.isHost}
        sessionId={sessionId}
        onLeave={handleLeaveToLobby}
        onStart={handleStart}
        onSetSpice={room.setSpice}
      />
    );
  } else if (r.status === "phase_input") {
    content = (
      <ExposedQuestionInput
        room={r}
        sessionId={sessionId}
        secondsLeft={game.secondsLeft}
        me={game.me}
        iSubmitted={game.iSubmitted}
        submittedCount={game.submittedCount}
        onSubmit={game.submitQuestion}
        onLeave={handleLeaveToLobby}
      />
    );
  } else if (r.status === "phase_vote") {
    content = (
      <ExposedVote
        room={r}
        secondsLeft={game.secondsLeft}
        me={game.me}
        myVote={game.myVote}
        iVoted={game.iVoted}
        votedCount={game.votedCount}
        onVote={game.castVote}
        onLeave={handleLeaveToLobby}
      />
    );
  } else if (r.status === "phase_result" || r.status === "finished") {
    content = (
      <ExposedResult
        room={r}
        isHost={room.isHost}
        me={game.me}
        myVote={game.myVote}
        onNextQuestion={game.nextQuestion}
        onEndGame={game.endGame}
        onRestart={game.restartGame}
        onLeave={handleLeaveToLobby}
      />
    );
  }

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: C.bgDeep,
        zIndex: 450,
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        fontFamily: FONTS.body,
      }}
    >
      {!r && (
        <button
          onClick={onClose}
          aria-label="닫기"
          style={{
            position: "fixed",
            top: "max(16px, env(safe-area-inset-top))",
            right: 16,
            zIndex: 5,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            padding: 0,
          }}
        >
          <X size={18} />
        </button>
      )}
      <AnimatePresence mode="wait">
        <Motion.div
          key={r ? r.status : "lobby"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          style={{ minHeight: "100vh" }}
        >
          {content}
        </Motion.div>
      </AnimatePresence>
    </Motion.div>
  );
}

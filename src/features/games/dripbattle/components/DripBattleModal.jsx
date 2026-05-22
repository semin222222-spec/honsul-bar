import { useEffect, useRef, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useDripBattleRoom } from "../hooks/useDripBattleRoom";
import { useDripBattleGame } from "../hooks/useDripBattleGame";
import { C, FONTS } from "./dripBattleTheme";
import DripBattleLobby from "./DripBattleLobby";
import DripBattleWaitingRoom from "./DripBattleWaitingRoom";
import DripBattleInput from "./DripBattleInput";
import DripBattleVote from "./DripBattleVote";
import DripBattleResult from "./DripBattleResult";

/**
 * DripBattleModal — 드립 배틀 전체 단계 wrapping 풀스크린 모달
 *
 * room.status: waiting → phase_input → phase_vote → phase_result → (다음 라운드 ...) → finished
 * room이 없으면 lobby.
 */
export default function DripBattleModal({
  open,
  onClose,
  sessionId,
  seatLabel,
  storeId,
}) {
  const room = useDripBattleRoom({ sessionId, seatLabel, storeId });

  const handleAutoDismiss = useCallback(() => {
    room.setRoomDirect(null);
    room.leaveRoom();
  }, [room]);

  const game = useDripBattleGame({
    room: room.myRoom,
    sessionId,
    seatLabel,
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
      <DripBattleLobby
        rooms={room.rooms}
        loading={room.loading}
        onCreate={handleCreate}
        onJoin={handleJoin}
        onCloseGame={onClose}
        mySeat={seatLabel}
      />
    );
  } else if (r.status === "waiting") {
    content = (
      <DripBattleWaitingRoom
        room={r}
        isHost={room.isHost}
        sessionId={sessionId}
        onLeave={handleLeaveToLobby}
        onStart={handleStart}
      />
    );
  } else if (r.status === "phase_input") {
    content = (
      <DripBattleInput
        room={r}
        sessionId={sessionId}
        secondsLeft={game.secondsLeft}
        myAnswer={game.myAnswer}
        roundAnswers={game.roundAnswers}
        submittedCount={game.submittedCount}
        onSubmit={game.submitAnswer}
        onLeave={handleLeaveToLobby}
      />
    );
  } else if (r.status === "phase_vote") {
    content = (
      <DripBattleVote
        room={r}
        sessionId={sessionId}
        secondsLeft={game.secondsLeft}
        roundAnswers={game.roundAnswers}
        myVote={game.myVote}
        votedCount={game.votedCount}
        onVote={game.submitVote}
        onLeave={handleLeaveToLobby}
      />
    );
  } else if (r.status === "phase_result" || r.status === "finished") {
    content = (
      <DripBattleResult
        room={r}
        isHost={room.isHost}
        onNextRound={game.nextRound}
        onLeave={handleLeaveToLobby}
        dismissLeftMs={game.dismissLeftMs}
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

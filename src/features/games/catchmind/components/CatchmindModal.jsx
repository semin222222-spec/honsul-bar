import { useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useCatchmindRoom } from "../hooks/useCatchmindRoom";
import { useCatchmindGame } from "../hooks/useCatchmindGame";
import CatchmindLobby from "./CatchmindLobby";
import CatchmindWaitingRoom from "./CatchmindWaitingRoom";
import CatchmindCountdown from "./CatchmindCountdown";
import CatchmindGame from "./CatchmindGame";
import CatchmindRoundTransition from "./CatchmindRoundTransition";
import CatchmindResult from "./CatchmindResult";

/**
 * CatchmindModal
 *
 * 캐치마인드 게임 전 단계를 wrapping하는 풀스크린 모달.
 * room.status 에 따라 lobby → waiting → countdown → playing/transition → finished
 * 화면을 전환한다.
 */
export default function CatchmindModal({
  open,
  onClose,
  sessionId,
  seatLabel,
  storeId,
}) {
  const room = useCatchmindRoom({ sessionId, seatLabel, storeId });
  const game = useCatchmindGame({
    room: room.myRoom,
    sessionId,
    seatLabel,
    onRoomUpdate: room.setRoomDirect,
  });

  // ESC로 닫기 (lobby에서만)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape" && !room.myRoom) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, room.myRoom, onClose]);

  if (!open) return null;

  const handleCreate = async () => {
    const res = await room.createRoom();
    if (!res.ok) alert(res.error || "방을 만들지 못했어요");
  };

  const handleJoin = async (roomId) => {
    const res = await room.joinRoom(roomId);
    if (!res.ok) alert(res.error || "입장에 실패했어요");
  };

  const handleLeaveToLobby = async () => {
    await room.leaveRoom();
  };

  const handleStart = async () => {
    const res = await room.startGame();
    if (!res.ok) alert(res.error || "시작에 실패했어요");
  };

  // 화면 결정
  const r = room.myRoom;
  let content = null;

  if (!r) {
    content = (
      <CatchmindLobby
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
      <CatchmindWaitingRoom
        room={r}
        isHost={room.isHost}
        sessionId={sessionId}
        onLeave={handleLeaveToLobby}
        onStart={handleStart}
      />
    );
  } else if (r.status === "countdown") {
    content = (
      <>
        <CatchmindWaitingRoom
          room={r}
          isHost={room.isHost}
          sessionId={sessionId}
          onLeave={handleLeaveToLobby}
          onStart={handleStart}
        />
        <CatchmindCountdown startedAt={r.started_at} />
      </>
    );
  } else if (r.status === "playing") {
    content = (
      <CatchmindGame
        room={r}
        sessionId={sessionId}
        strokes={game.strokes}
        messages={game.messages}
        secondsLeft={game.secondsLeft}
        onAddStroke={game.addStroke}
        onClearCanvas={game.clearCanvas}
        onSendGuess={game.sendGuess}
        onPass={game.passDrawer}
      />
    );
  } else if (r.status === "transition") {
    content = (
      <>
        <CatchmindGame
          room={r}
          sessionId={sessionId}
          strokes={game.strokes}
          messages={game.messages}
          secondsLeft={0}
          onAddStroke={game.addStroke}
          onClearCanvas={game.clearCanvas}
          onSendGuess={game.sendGuess}
          onPass={game.passDrawer}
        />
        <CatchmindRoundTransition room={r} sessionId={sessionId} />
      </>
    );
  } else if (r.status === "finished") {
    content = (
      <CatchmindResult
        room={r}
        sessionId={sessionId}
        isHost={room.isHost}
        onRestart={game.restartRoom}
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
        background: "#1A1410",
        zIndex: 450,
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        fontFamily: "'Plus Jakarta Sans', system-ui",
      }}
    >
      {/* 게임 중이 아닐 때만 X 버튼 */}
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
            background: "rgba(245,230,200,0.08)",
            border: "1px solid rgba(245,230,200,0.15)",
            color: "rgba(245,230,200,0.7)",
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

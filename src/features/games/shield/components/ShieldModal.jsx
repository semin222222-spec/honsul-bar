import { useEffect, useRef, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useShieldRoom } from "../hooks/useShieldRoom";
import { useShieldGame } from "../hooks/useShieldGame";
import ShieldLobby from "./ShieldLobby";
import ShieldWaitingRoom from "./ShieldWaitingRoom";
import ShieldGame from "./ShieldGame";
import ShieldResult from "./ShieldResult";

/**
 * ShieldModal — 5초 쉴드 게임 전체 단계 wrapping 풀스크린 모달
 *
 * room.status: waiting → playing → finished
 * room이 없으면 lobby.
 */
export default function ShieldModal({
  open,
  onClose,
  sessionId,
  seatLabel,
  storeId,
}) {
  const room = useShieldRoom({ sessionId, seatLabel, storeId });

  // 결과 화면 자동 만료 → leaveRoom
  const handleAutoDismiss = useCallback(() => {
    room.setRoomDirect(null);
    room.leaveRoom();
  }, [room]);

  const game = useShieldGame({
    room: room.myRoom,
    sessionId,
    onRoomUpdate: room.setRoomDirect,
    onLeaveAfterFinish: handleAutoDismiss,
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

  // 모달 unmount 시 자동 leave (유령 방 방지)
  const leaveRoomRef = useRef(room.leaveRoom);
  const myRoomRef = useRef(room.myRoom);
  useEffect(() => {
    leaveRoomRef.current = room.leaveRoom;
    myRoomRef.current = room.myRoom;
  });
  useEffect(() => {
    return () => {
      if (myRoomRef.current) {
        leaveRoomRef.current?.();
      }
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

  // 즉시 로비로 (race 방지)
  const handleLeaveToLobby = useCallback(async () => {
    room.setRoomDirect(null);
    await room.leaveRoom();
  }, [room]);

  const handleStart = useCallback(async () => {
    const res = await room.startGame();
    if (!res.ok) alert(res.error || "시작에 실패했어요");
  }, [room]);

  const handleRestart = useCallback(async () => {
    const res = await game.restartRoom();
    if (!res?.ok && res?.error) alert(res.error);
  }, [game]);

  if (!open) return null;

  const r = room.myRoom;
  let content = null;

  if (!r) {
    content = (
      <ShieldLobby
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
      <ShieldWaitingRoom
        room={r}
        isHost={room.isHost}
        sessionId={sessionId}
        onLeave={handleLeaveToLobby}
        onStart={handleStart}
      />
    );
  } else if (r.status === "playing") {
    content = (
      <ShieldGame
        room={r}
        sessionId={sessionId}
        secondsLeft={game.secondsLeft}
        onPass={game.handlePass}
        onLeave={handleLeaveToLobby}
      />
    );
  } else if (r.status === "finished") {
    content = (
      <ShieldResult
        room={r}
        sessionId={sessionId}
        isHost={room.isHost}
        onRestart={handleRestart}
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
        background: "#0F0E0D",
        zIndex: 450,
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        fontFamily: "'Pretendard Variable', 'Pretendard', system-ui",
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
            background: "rgba(240,232,216,0.08)",
            border: "1px solid rgba(240,232,216,0.15)",
            color: "rgba(240,232,216,0.7)",
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

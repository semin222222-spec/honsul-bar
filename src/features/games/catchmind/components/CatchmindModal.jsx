import { useEffect, useRef, useCallback } from "react";
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

  // 모달 unmount 시 자동 leave (유령 방 방지)
  // 부모가 X 누르거나 다른 탭으로 넘어가면 modal이 unmount되며 cleanup 실행 →
  // 방에 들어가 있었다면 정리.
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

  // ⚠️ 강제 단순화: "나가기" 누르면 무조건 모달 전체 닫기 (UI 즉시 반응) →
  // DB 정리는 백그라운드. RPC 실패해도 직접 DELETE 폴백이 leaveRoom 안에 있음.
  const handleLeaveToLobby = useCallback(() => {
    console.log("[Catchmind] 🚪 나가기 클릭 — 모달 즉시 닫기");
    // 1) 모달 닫기 — 부모 onClose. 즉시 게임 센터로.
    onClose();
    // 2) 백그라운드 DB 정리 (await 안 함 — UI는 이미 빠져나감)
    room.leaveRoom().catch((err) => {
      console.error("[Catchmind] 백그라운드 leaveRoom 에러:", err);
    });
  }, [room, onClose]);

  // 결과 화면에서 "한 판 더!" 누르면 게임 재시작 (방 유지)
  const handleRestart = useCallback(async () => {
    try {
      await game.restartRoom();
    } catch (err) {
      console.error("[Catchmind] restart 에러:", err);
    }
  }, [game]);

  const handleStart = useCallback(async () => {
    const res = await room.startGame();
    if (!res.ok) alert(res.error || "시작에 실패했어요");
  }, [room]);

  if (!open) return null;

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
        onLiveStroke={game.broadcastLiveDraw}
        subscribeLiveStroke={game.subscribeLiveDraw}
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
        onRestart={handleRestart}
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

import { useEffect, useRef, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useCallMyNameRoom } from "../hooks/useCallMyNameRoom";
import { useCallMyNameGame } from "../hooks/useCallMyNameGame";
import { C, FONTS } from "./callMyNameTheme";
import CallMyNameLobby from "./CallMyNameLobby";
import CallMyNameWaitingRoom from "./CallMyNameWaitingRoom";
import CallMyNamePlay from "./CallMyNamePlay";
import CallMyNameResult from "./CallMyNameResult";

/**
 * CallMyNameModal — 콜 마이 네임 전체 단계 wrapping 풀스크린 모달
 *
 * room.status: waiting → playing → finished
 *  - lobby:    room 없음
 *  - waiting:  대기실
 *  - playing:  게임 보드 (Play 내부에서 본인 solved/penalty/오답 전환 처리)
 *  - finished: 전원 종료 요약
 */
export default function CallMyNameModal({
  open,
  onClose,
  sessionId,
  seatLabel,
  storeId,
}) {
  const room = useCallMyNameRoom({ sessionId, seatLabel, storeId });

  // 결과 자동 만료 → 게임 모달 전체 닫기 (캐치마인드와 동일). DB 정리는 백그라운드.
  const handleAutoDismiss = useCallback(() => {
    onClose();
    room.leaveRoom().catch((err) => {
      console.error("[CallMyName] 자동 종료 leaveRoom 에러:", err);
    });
  }, [room, onClose]);

  const game = useCallMyNameGame({
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

  // 나가기 = 게임 모달 전체 닫기 (캐치마인드와 동일). DB 정리는 백그라운드.
  const handleLeaveToLobby = useCallback(() => {
    onClose();
    room.leaveRoom().catch((err) => {
      console.error("[CallMyName] 백그라운드 leaveRoom 에러:", err);
    });
  }, [room, onClose]);

  const handleStart = useCallback(async () => {
    const res = await room.startGame();
    if (!res?.ok && res?.error) alert(res.error);
  }, [room]);

  if (!open) return null;

  const r = room.myRoom;
  const me = r?.players?.find((p) => p.session_id === sessionId) || null;

  let content = null;
  let viewKey = "lobby";

  if (!r) {
    viewKey = "lobby";
    content = (
      <CallMyNameLobby
        rooms={room.rooms}
        loading={room.loading}
        onCreate={handleCreate}
        onJoin={handleJoin}
        mySeat={seatLabel}
      />
    );
  } else if (r.status === "waiting") {
    viewKey = "waiting";
    content = (
      <CallMyNameWaitingRoom
        room={r}
        isHost={room.isHost}
        sessionId={sessionId}
        onLeave={handleLeaveToLobby}
        onStart={handleStart}
      />
    );
  } else if (r.status === "finished") {
    viewKey = "finished";
    content = (
      <CallMyNameResult
        mode="finished"
        players={r.players || []}
        onLeave={handleLeaveToLobby}
        dismissLeftMs={game.dismissLeftMs}
      />
    );
  } else {
    // playing — Play 내부에서 solved/penalty/오답 전환
    viewKey = "playing";
    content = (
      <CallMyNamePlay
        room={r}
        me={me}
        others={game.others}
        elapsedMs={game.elapsedMs}
        onSubmitGuess={game.submitGuess}
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
          key={viewKey}
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

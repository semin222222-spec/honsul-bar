import { useState, useCallback, useEffect, useRef } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

import { useTelestrationsRoom } from "../hooks/useTelestrationsRoom";
import { useTelestrationsGame } from "../hooks/useTelestrationsGame";
import { telestrationsRepository } from "@/repositories/games/telestrationsRepository";

import TelestrationsLobby from "./TelestrationsLobby";
import TelestrationsWaitingRoom from "./TelestrationsWaitingRoom";
import TelestrationsWordReveal from "./TelestrationsWordReveal";
import TelestrationsCanvas from "./TelestrationsCanvas";
import TelestrationsGuess from "./TelestrationsGuess";
import TelestrationsWaiting from "./TelestrationsWaiting";
import TelestrationsResult from "./TelestrationsResult";

/**
 * TelestrationsModal
 *   - useTelestrationsRoom + useTelestrationsGame 통합
 *   - status / mySubmittedThisStep / drawingNow 에 따라 화면 라우팅
 */
export default function TelestrationsModal({
  open,
  onClose,
  sessionId,
  seatLabel,
  storeId,
}) {
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const room = useTelestrationsRoom({ sessionId, seatLabel, storeId });

  // room 객체는 매 렌더마다 새 reference (내부 함수들이 myRoom 의존이라 안 stable).
  // 따라서 ref 로 보관해서 onRoomUpdate / onLeaveAfterFinish 콜백을 안정화한다.
  // (안정화 안 하면 useTelestrationsGame 의 subscribeToRoom 이 매 렌더마다 재구독 → 무한 루프)
  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const onRoomUpdate = useCallback((next) => {
    roomRef.current?.setRoomDirect(next);
  }, []);

  const onLeaveAfterFinish = useCallback(async () => {
    await roomRef.current?.leaveRoom();
  }, []);

  const game = useTelestrationsGame({
    room: room.myRoom,
    sessionId,
    onRoomUpdate,
    onLeaveAfterFinish,
  });

  const flashToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  // ─────────────────────────────────────────
  // 핸들러
  // ─────────────────────────────────────────
  const handleCreateRoom = async () => {
    const result = await room.createRoom();
    if (!result.ok) flashToast(result.error || "방 만들기 실패");
  };

  const handleJoinRoom = async (roomId) => {
    const result = await room.joinRoom(roomId);
    if (!result.ok) flashToast(result.error || "입장 실패");
  };

  const handleStartGame = async () => {
    const result = await room.startGame();
    if (!result.ok) flashToast(result.error || "시작 실패");
  };

  const handleLeaveRoom = async () => {
    await room.leaveRoom();
  };

  const handleSubmitEntry = async (content) => {
    setSubmitting(true);
    try {
      const result = await game.submitEntry(content);
      if (!result.ok) flashToast(result.error || "제출 실패");
    } finally {
      setTimeout(() => setSubmitting(false), 300);
    }
  };

  const handleResetGame = async () => {
    if (!room.myRoom) return;
    try {
      // "한 판 더!": 같은 방 유지하고 entries만 비운 후 status='waiting' 으로
      await telestrationsRepository.deleteEntriesByRoom(room.myRoom.id);
      const result = await room.resetToWaiting();
      if (!result.ok) flashToast(result.error || "다시 시작 실패");
    } catch (err) {
      console.error("[Telestrations] 한 판 더 실패:", err);
      flashToast("다시 시작에 실패했어요");
    }
  };

  const handleClose = async () => {
    if (room.myRoom) {
      await room.leaveRoom();
    }
    onClose();
  };

  // ─────────────────────────────────────────
  // 화면 라우팅
  // ─────────────────────────────────────────
  let content = null;

  if (!room.myRoom) {
    content = (
      <TelestrationsLobby
        rooms={room.rooms}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        loading={room.loading}
      />
    );
  } else {
    const status = room.myRoom.status;

    if (status === "waiting") {
      content = (
        <TelestrationsWaitingRoom
          room={room.myRoom}
          sessionId={sessionId}
          isHost={room.isHost}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
          loading={room.loading}
        />
      );
    } else if (status === "word_reveal") {
      content = (
        <TelestrationsWordReveal
          myInitialWord={game.me?.initial_word}
        />
      );
    } else if (status === "playing") {
      if (game.mySubmittedThisStep) {
        content = (
          <TelestrationsWaiting
            players={game.players}
            submittedAuthors={game.submittedAuthors}
            sessionId={sessionId}
            currentStep={game.currentStep}
            drawingNow={game.drawingNow}
          />
        );
      } else if (game.drawingNow) {
        content = (
          <TelestrationsCanvas
            currentInputEntry={game.currentInputEntry}
            stepSecondsLeft={game.stepSecondsLeft}
            currentStep={game.currentStep}
            totalSteps={game.totalSteps}
            onSubmit={handleSubmitEntry}
            submitting={submitting}
          />
        );
      } else {
        content = (
          <TelestrationsGuess
            currentInputEntry={game.currentInputEntry}
            stepSecondsLeft={game.stepSecondsLeft}
            currentStep={game.currentStep}
            totalSteps={game.totalSteps}
            onSubmit={handleSubmitEntry}
            submitting={submitting}
          />
        );
      }
    } else if (status === "finished") {
      content = (
        <TelestrationsResult
          room={room.myRoom}
          allEntries={game.allEntries}
          isHost={room.isHost}
          onResetGame={handleResetGame}
          onLeaveRoom={handleLeaveRoom}
          dismissLeftMs={game.dismissLeftMs}
        />
      );
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 0",
            overflowY: "auto",
          }}
        >
          <Motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            style={{
              width: "100%",
              maxWidth: 460,
              maxHeight: "calc(100vh - 32px)",
              background: "rgba(20,18,14,0.97)",
              border: "1px solid rgba(212,165,55,0.18)",
              borderRadius: 18,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(176,132,255,0.08)",
            }}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={handleClose}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                zIndex: 10,
              }}
              aria-label="닫기"
            >
              <X size={16} />
            </button>

            {/* 본문 */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {content}
            </div>

            {/* 토스트 */}
            <AnimatePresence>
              {toast && (
                <Motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  style={{
                    position: "absolute",
                    bottom: 16,
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "10px 16px",
                    background: "rgba(20,18,14,0.95)",
                    border: "1px solid rgba(212,165,55,0.4)",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "#F0E8D8",
                    fontFamily: "'Noto Serif KR', serif",
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                  }}
                >
                  {toast}
                </Motion.div>
              )}
            </AnimatePresence>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}

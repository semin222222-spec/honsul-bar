import { useState, useEffect, useCallback } from "react";
import { motion as Motion } from "framer-motion";
import { Heart, X, Loader2 } from "lucide-react";

/**
 * IncomingFlirtingModal
 *
 * 게임 신청을 받았을 때 표시되는 모달
 *
 * Props:
 *  - game: 받은 게임 객체 (inviter_seat_label, inviter_nickname 등)
 *  - onAccept: () => Promise<void>
 *  - onDecline: () => Promise<void>
 *  - autoExpireSeconds: 자동 만료 시간 (기본 30초)
 */
export default function IncomingFlirtingModal({
  game,
  onAccept,
  onDecline,
  autoExpireSeconds = 30,
}) {
  const [responding, setResponding] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(autoExpireSeconds);

  const handleAccept = useCallback(async () => {
    if (responding) return;
    setResponding(true);
    await onAccept();
    setResponding(false);
  }, [responding, onAccept]);

  const handleDecline = useCallback(async () => {
    if (responding) return;
    setResponding(true);
    await onDecline();
    setResponding(false);
  }, [responding, onDecline]);

  // 카운트다운
  useEffect(() => {
    if (!game) return;

    const createdAt = new Date(game.created_at).getTime();

    const updateRemaining = () => {
      const elapsed = Math.floor((Date.now() - createdAt) / 1000);
      const remaining = Math.max(0, autoExpireSeconds - elapsed);
      setRemainingSeconds(remaining);

      // 시간 끝나면 자동 거절
      if (remaining === 0 && !responding) {
        handleDecline();
      }
    };

    const timer = setTimeout(updateRemaining, 0);
    const interval = setInterval(updateRemaining, 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [game, autoExpireSeconds, responding, handleDecline]);

  if (!game) return null;

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Motion.div
        initial={{ scale: 0.7, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        style={{
          width: "100%",
          maxWidth: 340,
          background:
            "linear-gradient(135deg, rgba(60,30,50,0.98), rgba(40,20,40,0.98))",
          border: "2px solid rgba(255,107,157,0.6)",
          borderRadius: 22,
          padding: 28,
          textAlign: "center",
          boxShadow: "0 0 60px rgba(255,107,157,0.4)",
          position: "relative",
        }}
      >
        {/* 펄스 하트 (배경) */}
        <Motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            position: "absolute",
            top: -20,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 50,
            filter: "drop-shadow(0 0 20px rgba(255,107,157,0.8))",
            zIndex: 1,
          }}
        >
          💕
        </Motion.div>

        <div style={{ marginTop: 30 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "rgba(255,200,220,0.6)",
              marginBottom: 6,
            }}
          >
            FLIRTING GAME
          </div>
          <div
            style={{
              fontSize: 16,
              color: "rgba(255,200,220,0.9)",
              marginBottom: 12,
              fontFamily: "'Noto Serif KR', serif",
            }}
          >
            게임 신청이 들어왔어요!
          </div>

          {/* 신청자 정보 */}
          <div
            style={{
              padding: "16px",
              background:
                "linear-gradient(135deg, rgba(255,107,157,0.15), rgba(196,122,255,0.08))",
              border: "1px solid rgba(255,107,157,0.3)",
              borderRadius: 14,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,200,220,0.5)",
                letterSpacing: "0.15em",
                marginBottom: 4,
              }}
            >
              FROM
            </div>
            <div
              style={{
                fontSize: 28,
                fontFamily: "'Noto Serif KR', serif",
                color: "#FF6B9D",
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              📍 {game.inviter_seat_label}
            </div>
            {game.inviter_nickname && (
              <div style={{ fontSize: 12, color: "rgba(255,200,220,0.7)" }}>
                {game.inviter_nickname} 손님
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: 11,
              color: "rgba(255,200,220,0.6)",
              marginBottom: 16,
              lineHeight: 1.6,
            }}
          >
            5라운드 동안 같은 단어를
            <br />
            골라보는 이구동성 게임이에요 💕
          </div>

          {/* 카운트다운 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "6px 12px",
              background:
                remainingSeconds <= 10
                  ? "rgba(226,75,74,0.12)"
                  : "rgba(255,255,255,0.04)",
              border:
                "1px solid " +
                (remainingSeconds <= 10
                  ? "rgba(226,75,74,0.3)"
                  : "rgba(255,255,255,0.08)"),
              borderRadius: 100,
              marginBottom: 18,
              fontSize: 10,
              color:
                remainingSeconds <= 10 ? "#FF7878" : "rgba(255,255,255,0.5)",
            }}
          >
            <Motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ⏱
            </Motion.span>
            <span style={{ fontWeight: 600 }}>
              {remainingSeconds}초 후 자동 거절
            </span>
          </div>

          {/* 버튼 */}
          <div style={{ display: "flex", gap: 8 }}>
            <Motion.button
              whileTap={!responding ? { scale: 0.96 } : {}}
              onClick={handleDecline}
              disabled={responding}
              style={{
                flex: 1,
                padding: 13,
                borderRadius: 11,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontWeight: 600,
                cursor: responding ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                opacity: responding ? 0.5 : 1,
              }}
            >
              <X size={13} />
              거절
            </Motion.button>
            <Motion.button
              whileTap={!responding ? { scale: 0.96 } : {}}
              onClick={handleAccept}
              disabled={responding}
              style={{
                flex: 1.6,
                padding: 13,
                borderRadius: 11,
                background: responding
                  ? "rgba(255,107,157,0.4)"
                  : "linear-gradient(135deg, #FF6B9D, #C47AFF)",
                border: "none",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: responding ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                boxShadow: "0 4px 20px rgba(255,107,157,0.4)",
              }}
            >
              {responding ? (
                <Motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 size={14} />
                </Motion.div>
              ) : (
                <>
                  <Heart size={14} fill="#fff" />
                  수락하기 💕
                </>
              )}
            </Motion.button>
          </div>
        </div>
      </Motion.div>
    </Motion.div>
  );
}

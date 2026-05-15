import { motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * GameSelectModal
 *
 * 채팅에서 다른 손님 닉네임 클릭 시 표시되는 게임 선택 모달
 *
 * Props:
 *  - target: 선택된 메시지 객체 { session_id, seat_label, nickname, avatar }
 *  - onSelectFlirting: () => void  (플러팅 게임 선택)
 *  - onSelectNine: () => void      (더 나인 선택)
 *  - onClose: () => void
 */
export default function GameSelectModal({
  target,
  onSelectFlirting,
  onSelectNine,
  onClose,
}) {
  if (!target) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "linear-gradient(135deg, rgba(40,30,40,0.98), rgba(20,15,25,0.98))",
          border: "2px solid rgba(212,165,55,0.4)",
          borderRadius: 20,
          padding: 22,
          boxShadow: "0 0 40px rgba(212,165,55,0.2)",
          position: "relative",
        }}
      >
        {/* 닫기 */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 30,
            height: 30,
            background: "rgba(255,255,255,0.06)",
            border: "none",
            borderRadius: 8,
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <X size={14} />
        </button>

        {/* 대상 정보 */}
        <div style={{
          textAlign: "center",
          marginBottom: 18,
          padding: 14,
          background: "linear-gradient(135deg, rgba(212,165,55,0.1), rgba(180,120,30,0.05))",
          border: "1px solid rgba(212,165,55,0.2)",
          borderRadius: 14,
        }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, delay: 0.1 }}
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: "rgba(212,165,55,0.15)",
              border: "2px solid rgba(212,165,55,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              margin: "0 auto 8px",
            }}
          >
            {target.avatar || "🥃"}
          </motion.div>
          <div style={{
            fontSize: 16,
            color: "#F5E6C8",
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 600,
            marginBottom: 3,
          }}>
            {target.nickname || "익명 손님"}
          </div>
          {target.seat_label && (
            <div style={{
              fontSize: 11,
              color: "rgba(212,165,55,0.7)",
            }}>
              📍 {target.seat_label}
            </div>
          )}
        </div>

        {/* 타이틀 */}
        <div style={{
          fontSize: 12,
          color: "rgba(212,165,55,0.7)",
          textAlign: "center",
          marginBottom: 12,
          letterSpacing: "0.1em",
        }}>
          🎮 어떤 걸 신청할까요?
        </div>

        {/* 게임 목록 */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 14,
        }}>
          {/* 💕 플러팅 게임 */}
          <motion.div
            whileTap={{ scale: 0.97 }}
            onClick={onSelectFlirting}
            style={{
              padding: "14px 16px",
              borderRadius: 13,
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
              background: "linear-gradient(135deg, rgba(255,107,157,0.12), rgba(196,122,255,0.06))",
              border: "1.5px solid rgba(255,107,157,0.4)",
              WebkitTapHighlightColor: "transparent",
              transition: "all 0.2s",
            }}
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3 }}
              style={{ fontSize: 30, flexShrink: 0 }}
            >
              💕
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 9,
                letterSpacing: "0.15em",
                color: "#FF6B9D",
                fontWeight: 600,
                marginBottom: 2,
              }}>
                FLIRTING GAME
              </div>
              <div style={{
                fontSize: 14,
                color: "#F5E6C8",
                fontFamily: "'Noto Serif KR', serif",
                fontWeight: 500,
                marginBottom: 2,
              }}>
                이구동성 플러팅
              </div>
              <div style={{
                fontSize: 10,
                color: "rgba(255,200,220,0.65)",
              }}>
                5라운드 단어 맞추기 · 운명을 찾아봐요
              </div>
            </div>
          </motion.div>

          {/* ⚔️ 더 나인 */}
          <motion.div
            whileTap={{ scale: 0.97 }}
            onClick={onSelectNine}
            style={{
              padding: "14px 16px",
              borderRadius: 13,
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
              background: "linear-gradient(135deg, rgba(212,165,55,0.1), rgba(180,120,30,0.04))",
              border: "1.5px solid rgba(212,165,55,0.3)",
              WebkitTapHighlightColor: "transparent",
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: 30, flexShrink: 0 }}>⚔️</div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 9,
                letterSpacing: "0.15em",
                color: "#D4A537",
                fontWeight: 600,
                marginBottom: 2,
              }}>
                1 VS 1 BATTLE
              </div>
              <div style={{
                fontSize: 14,
                color: "#F5E6C8",
                fontFamily: "'Noto Serif KR', serif",
                fontWeight: 500,
                marginBottom: 2,
              }}>
                더 나인 · 대결
              </div>
              <div style={{
                fontSize: 10,
                color: "rgba(255,230,180,0.65)",
              }}>
                9라운드 심리전 · 1은 9를 잡는다
              </div>
            </div>
          </motion.div>
        </div>

        {/* 취소 */}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: 12,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            color: "rgba(255,255,255,0.6)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          취소
        </button>
      </motion.div>
    </motion.div>
  );
}

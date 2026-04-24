import { useState } from "react";
import { motion } from "framer-motion";
import { Dices } from "lucide-react";

/**
 * MyProfileCard
 * - 허브 화면, 게임 탭 등에서 공통으로 쓰이는 "내 정보" 카드
 * - 아바타 + 닉네임 + 좌석 + 주사위 재추첨 버튼
 */
export default function MyProfileCard({
  nickname,
  avatar,
  seat,
  onReroll,
  delay = 0,
  compact = false, // true면 더 작은 버전
}) {
  const [rolling, setRolling] = useState(false);

  const handleReroll = (e) => {
    e.stopPropagation();
    setRolling(true);
    onReroll();
    setTimeout(() => setRolling(false), 500);
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay }}
        style={{
          background: "rgba(212,165,55,0.06)",
          border: "1px solid rgba(212,165,55,0.18)",
          borderRadius: 12,
          padding: "10px 12px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(212,165,55,0.12)",
            border: "1.5px solid rgba(212,165,55,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {avatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <motion.div
            key={nickname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#F5E6C8",
              fontFamily: "'Noto Serif KR', serif",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {nickname}
          </motion.div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
            📍 {seat}
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleReroll}
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            border: "1px solid rgba(212,165,55,0.25)",
            background: "rgba(212,165,55,0.08)",
            color: "#D4A537",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <motion.div
            animate={rolling ? { rotate: 360 } : {}}
            transition={{ duration: 0.5 }}
          >
            <Dices size={16} />
          </motion.div>
        </motion.button>
      </motion.div>
    );
  }

  // 기본 (큰 카드)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{
        background: "linear-gradient(135deg, rgba(212,165,55,0.08), rgba(180,120,30,0.04))",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(212,165,55,0.2)",
        borderRadius: "clamp(12px, 3.5vw, 16px)",
        padding: "clamp(14px, 4vw, 18px)",
        marginBottom: "clamp(10px, 3vw, 16px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <motion.div
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 80% 20%, rgba(212,165,55,0.1), transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "clamp(10px, 3vw, 14px)",
        }}
      >
        <motion.div
          animate={rolling ? { rotate: 360, scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.5 }}
          style={{
            width: "clamp(48px, 12vw, 56px)",
            height: "clamp(48px, 12vw, 56px)",
            borderRadius: 16,
            background: "rgba(212,165,55,0.12)",
            border: "1.5px solid rgba(212,165,55,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "clamp(24px, 7vw, 30px)",
            flexShrink: 0,
          }}
        >
          {avatar}
        </motion.div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "rgba(212,165,55,0.55)",
              marginBottom: 3,
              fontFamily: "'Noto Serif KR', serif",
            }}
          >
            오늘 밤의 나
          </div>
          <motion.div
            key={nickname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              fontSize: "clamp(14px, 4vw, 16px)",
              fontWeight: 500,
              color: "#F5E6C8",
              fontFamily: "'Noto Serif KR', serif",
              marginBottom: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {nickname}
          </motion.div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            📍 {seat}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleReroll}
          style={{
            width: "clamp(36px, 9vw, 42px)",
            height: "clamp(36px, 9vw, 42px)",
            borderRadius: 12,
            border: "1px solid rgba(212,165,55,0.25)",
            background: "rgba(212,165,55,0.08)",
            color: "#D4A537",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
            fontFamily: "inherit",
          }}
          title="닉네임 다시 뽑기"
        >
          <motion.div
            animate={rolling ? { rotate: 360 } : {}}
            transition={{ duration: 0.5 }}
          >
            <Dices size={18} />
          </motion.div>
        </motion.button>
      </div>
    </motion.div>
  );
}

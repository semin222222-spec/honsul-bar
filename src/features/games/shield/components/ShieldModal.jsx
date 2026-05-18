import { useState, useEffect, useCallback } from "react";
import { motion as Motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { generateRandomInitials } from "../lib/shieldInitials";

const COLORS = {
  bgBase: "#0F0E0D",
  bgCard: "#1A1816",
  ink: "#F0E8D8",
  gold: "#C9A66B",
  danger: "#E5443C",
  dangerBright: "#FF5C52",
};

/**
 * ShieldModal — 초성 게임 (로컬 단일 화면)
 *
 * 핸드폰 한 대를 술자리에서 돌려가며 사용. PASS 누르면 새 초성.
 * DB·실시간·타이머 없음. 인터페이스는 기존과 동일하게 두되 props는 무시.
 */
// eslint-disable-next-line no-unused-vars
export default function ShieldModal({ open, onClose, sessionId, seatLabel, storeId }) {
  const [initials, setInitials] = useState(() => generateRandomInitials());

  const handlePass = useCallback(() => {
    setInitials(generateRandomInitials());
  }, []);

  // 스페이스/엔터로도 PASS, ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handlePass();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, handlePass]);

  if (!open) return null;

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: COLORS.bgBase,
        zIndex: 450,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Pretendard Variable', 'Pretendard', system-ui",
        color: COLORS.ink,
        overflow: "hidden",
        paddingTop: "max(0px, env(safe-area-inset-top))",
        paddingBottom: "max(0px, env(safe-area-inset-bottom))",
      }}
    >
      {/* 상단 바 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 14px",
          gap: 8,
        }}
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "rgba(240,232,216,0.06)",
            border: "1px solid rgba(240,232,216,0.1)",
            color: COLORS.ink,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            padding: 0,
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 14,
            letterSpacing: "0.2em",
            color: "rgba(240,232,216,0.6)",
            fontWeight: 600,
          }}
        >
          초성 게임
        </div>
        {/* 좌우 균형용 */}
        <div style={{ width: 40, height: 40 }} />
      </div>

      {/* 중앙: 거대한 초성 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px 20px",
          gap: 24,
          minHeight: 0,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.3em",
            color: COLORS.danger,
            fontWeight: 700,
          }}
        >
          ▼ 초성
        </div>

        <Motion.div
          key={initials}
          initial={{ scale: 0.85, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 14, stiffness: 220 }}
          style={{
            fontSize: "clamp(96px, 36vw, 180px)",
            lineHeight: 1,
            fontFamily: "'Black Han Sans', 'Noto Serif KR', serif",
            fontWeight: 900,
            letterSpacing: "0.06em",
            textAlign: "center",
            color: COLORS.ink,
            textShadow: "0 4px 24px rgba(229,68,60,0.25)",
            userSelect: "none",
            display: "flex",
            gap: "0.18em",
            justifyContent: "center",
          }}
        >
          {initials.split("").map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </Motion.div>

        <div
          style={{
            fontSize: 13,
            color: "rgba(240,232,216,0.55)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          이 초성으로 시작하는 단어를
          <br />
          <strong style={{ color: COLORS.ink }}>입으로 외치세요!</strong>
        </div>
      </div>

      {/* 하단: PASS 버튼 */}
      <div style={{ padding: "12px 16px 18px" }}>
        <Motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handlePass}
          style={{
            width: "100%",
            minHeight: 84,
            padding: "20px",
            border: "none",
            borderRadius: 20,
            background: `linear-gradient(135deg, ${COLORS.danger}, #B83328)`,
            color: "#fff",
            fontWeight: 900,
            fontSize: 24,
            fontFamily: "'Noto Serif KR', serif",
            letterSpacing: "0.06em",
            cursor: "pointer",
            boxShadow:
              "0 14px 32px rgba(229,68,60,0.42), inset 0 0 18px rgba(255,255,255,0.08)",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          💥 PASS 💥
        </Motion.button>
        <div
          style={{
            textAlign: "center",
            fontSize: 10,
            color: "rgba(240,232,216,0.3)",
            marginTop: 8,
            letterSpacing: "0.1em",
          }}
        >
          탭하면 새 초성이 나와요
        </div>
      </div>
    </Motion.div>
  );
}

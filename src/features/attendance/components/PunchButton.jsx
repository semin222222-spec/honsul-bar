import { motion as Motion } from "framer-motion";
import { T } from "./attendanceTheme";

// 큰 출퇴근 버튼. 출근=골드 / 퇴근=오렌지로 색 구분 (어두운 매장에서도 구분).
export default function PunchButton({ mode, onClick, disabled }) {
  const isOut = mode === "out";
  return (
    <Motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: "100%",
        background: isOut
          ? `linear-gradient(135deg, ${T.orangeSoft}, ${T.orangeDeep})`
          : `linear-gradient(135deg, ${T.goldSoft}, ${T.goldDeep})`,
        border: "none",
        color: "#fff",
        padding: 20,
        borderRadius: 18,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        boxShadow: `0 10px 40px -10px ${isOut ? T.orangeGlow : T.goldGlow}, inset 0 1px 0 rgba(255,255,255,0.2)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        fontFamily: "inherit",
      }}
    >
      <span style={{ fontSize: 32 }}>{isOut ? "🏠" : "🟢"}</span>
      <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>
        {isOut ? "퇴근하기" : "출근하기"}
      </span>
      <span style={{ fontSize: 10, opacity: 0.85 }}>탭하면 자동 기록</span>
    </Motion.button>
  );
}

import { useState } from "react";
import { motion } from "framer-motion";

const BAR_SEATS = ["바 1번석", "바 2번석", "바 3번석", "바 4번석", "바 5번석", "바 6번석"];
const TABLE_SEATS = ["테이블 A", "테이블 B", "테이블 C", "테이블 D"];

export default function SeatPicker({ onSelect }) {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{
      minHeight: "100vh", minHeight: "100dvh",
      background: "#0D0B08", color: "#F5E6C8",
      display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center",
      padding: "clamp(20px, 5vw, 40px)",
      fontFamily: "'Pretendard', -apple-system, sans-serif",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ width: "100%", maxWidth: 360 }}
      >
        {/* 헤더 영역 */}
        <div style={{ textAlign: "center", marginBottom: "clamp(36px, 10vw, 52px)" }}>
          {/* 작은 로고 아이콘 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ fontSize: "clamp(28px, 7vw, 34px)", marginBottom: "clamp(16px, 4vw, 24px)" }}
          >
            🥃
          </motion.div>

          {/* 메인 타이틀 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              fontSize: "clamp(40px, 12vw, 56px)",
              fontWeight: 700,
              fontFamily: "'Noto Serif KR', serif",
              color: "#F5E6C8",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              marginBottom: "clamp(8px, 2vw, 12px)",
            }}
          >
            오늘, 혼술
          </motion.div>

          {/* 서브 타이틀 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{
              fontSize: "clamp(11px, 3vw, 13px)",
              letterSpacing: "0.18em",
              color: "rgba(212,165,55,0.5)",
              fontFamily: "'Noto Serif KR', serif",
              marginBottom: "clamp(24px, 7vw, 36px)",
            }}
          >
            혼술바 소셜 가이드
          </motion.div>

          {/* 구분선 */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            style={{
              width: 40, height: 1, margin: "0 auto",
              background: "rgba(212,165,55,0.2)",
              marginBottom: "clamp(24px, 7vw, 36px)",
            }}
          />

          {/* 질문 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <div style={{
              fontSize: "clamp(20px, 5.5vw, 26px)",
              fontWeight: 300,
              fontFamily: "'Noto Serif KR', serif",
              color: "#F5E6C8",
              lineHeight: 1.4,
              marginBottom: "clamp(8px, 2vw, 10px)",
            }}>
              어디에 앉으셨나요?
            </div>
            <div style={{
              fontSize: "clamp(11px, 2.8vw, 12px)",
              color: "rgba(255,255,255,0.3)",
              lineHeight: 1.5,
            }}>
              자리를 선택하면 사장님이 정확히 도움을 드릴 수 있어요
            </div>
          </motion.div>
        </div>

        {/* 바 좌석 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, letterSpacing: "0.1em",
            color: "rgba(212,165,55,0.5)", marginBottom: 10,
          }}>
            바 좌석
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
          }}>
            {BAR_SEATS.map((seat, i) => {
              const active = selected === seat;
              return (
                <motion.button
                  key={seat}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelected(seat)}
                  style={{
                    padding: "14px 8px", borderRadius: 12,
                    background: active ? "rgba(212,165,55,0.12)" : "rgba(255,255,255,0.03)",
                    border: "1px solid " + (active ? "rgba(212,165,55,0.3)" : "rgba(255,255,255,0.06)"),
                    color: active ? "#D4A537" : "rgba(255,255,255,0.5)",
                    fontSize: "clamp(11px, 3vw, 13px)", fontWeight: active ? 600 : 400,
                    cursor: "pointer", transition: "all 0.2s",
                    fontFamily: "inherit",
                    WebkitTapHighlightColor: "transparent",
                    minHeight: 44,
                  }}
                >
                  {seat.replace("바 ", "")}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* 테이블 좌석 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 11, letterSpacing: "0.1em",
            color: "rgba(212,165,55,0.5)", marginBottom: 10,
          }}>
            테이블 좌석
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
          }}>
            {TABLE_SEATS.map((seat, i) => {
              const active = selected === seat;
              return (
                <motion.button
                  key={seat}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 + i * 0.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelected(seat)}
                  style={{
                    padding: "14px 8px", borderRadius: 12,
                    background: active ? "rgba(212,165,55,0.12)" : "rgba(255,255,255,0.03)",
                    border: "1px solid " + (active ? "rgba(212,165,55,0.3)" : "rgba(255,255,255,0.06)"),
                    color: active ? "#D4A537" : "rgba(255,255,255,0.5)",
                    fontSize: "clamp(11px, 3vw, 13px)", fontWeight: active ? 600 : 400,
                    cursor: "pointer", transition: "all 0.2s",
                    fontFamily: "inherit",
                    WebkitTapHighlightColor: "transparent",
                    minHeight: 44,
                  }}
                >
                  {seat}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* 입장 버튼 */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          whileTap={selected ? { scale: 0.96 } : {}}
          onClick={() => { if (selected) onSelect(selected); }}
          disabled={!selected}
          style={{
            width: "100%", padding: "16px", borderRadius: 14, border: "none",
            background: selected ? "linear-gradient(135deg, #D4A537, #B8860B)" : "rgba(255,255,255,0.06)",
            color: selected ? "#0D0B08" : "rgba(255,255,255,0.2)",
            fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600,
            cursor: selected ? "pointer" : "default",
            transition: "all 0.3s", letterSpacing: "0.02em",
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
            minHeight: 50,
          }}
        >
          입장하기
        </motion.button>
      </motion.div>
    </div>
  );
}
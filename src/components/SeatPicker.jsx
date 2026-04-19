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
      fontFamily: "'DM Sans', 'Pretendard', -apple-system, sans-serif",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ width: "100%", maxWidth: 360 }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🥃</div>
          <div style={{
            fontSize: "clamp(9px, 2.5vw, 11px)", letterSpacing: "0.2em",
            color: "rgba(212,165,55,0.6)", marginBottom: 8,
            fontFamily: "'Cormorant Garamond', serif", textTransform: "uppercase",
          }}>
            오늘, 혼술
          </div>
          <div style={{
            fontSize: "clamp(22px, 6vw, 28px)", fontWeight: 300,
            fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.4,
          }}>
            어디에 앉으셨나요?
          </div>
          <div style={{
            fontSize: "clamp(12px, 3vw, 13px)",
            color: "rgba(255,255,255,0.35)", marginTop: 8, lineHeight: 1.5,
          }}>
            자리를 선택하면 사장님이<br />정확히 도움을 드릴 수 있어요
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, letterSpacing: "0.1em",
            color: "rgba(212,165,55,0.5)", marginBottom: 10,
          }}>
            바 좌석
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
          }}>
            {BAR_SEATS.map((seat, i) => {
              const active = selected === seat;
              return (
                <motion.button
                  key={seat}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
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

        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 11, letterSpacing: "0.1em",
            color: "rgba(212,165,55,0.5)", marginBottom: 10,
          }}>
            테이블 좌석
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}>
            {TABLE_SEATS.map((seat, i) => {
              const active = selected === seat;
              return (
                <motion.button
                  key={seat}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
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

        <motion.button
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
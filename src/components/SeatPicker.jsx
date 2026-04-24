import { useState } from "react";
import { motion } from "framer-motion";
import { useSeatOccupancy } from "../hooks/useSeatOccupancy";

// A-1 ~ A-20, B-1 ~ B-20
const BAR_A = Array.from({ length: 20 }, (_, i) => `A-${i + 1}`);
const BAR_B = Array.from({ length: 20 }, (_, i) => `B-${i + 1}`);

function SeatGrid({ seats, selected, occupiedSeats, onSelect, baseDelay = 0 }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: 6,
    }}>
      {seats.map((seat, i) => {
        const active = selected === seat;
        const occupant = occupiedSeats.get(seat);
        const isOccupied = !!occupant;

        return (
          <motion.button
            key={seat}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: baseDelay + i * 0.015 }}
            whileTap={!isOccupied ? { scale: 0.94 } : {}}
            onClick={() => !isOccupied && onSelect(seat)}
            disabled={isOccupied}
            style={{
              padding: "10px 4px",
              borderRadius: 10,
              background: isOccupied
                ? "rgba(255,255,255,0.02)"
                : active
                ? "rgba(212,165,55,0.15)"
                : "rgba(255,255,255,0.03)",
              border: "1px solid " + (
                isOccupied
                  ? "rgba(255,255,255,0.04)"
                  : active
                  ? "rgba(212,165,55,0.4)"
                  : "rgba(255,255,255,0.06)"
              ),
              color: isOccupied
                ? "rgba(255,255,255,0.2)"
                : active
                ? "#D4A537"
                : "rgba(255,255,255,0.55)",
              fontSize: 11,
              fontWeight: active ? 600 : 500,
              cursor: isOccupied ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
              minHeight: 40,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {isOccupied && (
              <>
                <div style={{
                  position: "absolute", inset: 0,
                  background: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 4px)",
                  pointerEvents: "none",
                }} />
                <span style={{
                  position: "absolute", top: 2, right: 3,
                  fontSize: 9, opacity: 0.5,
                }}>
                  {occupant.avatar}
                </span>
              </>
            )}
            <span style={{ position: "relative" }}>{seat}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

export default function SeatPicker({ onSelect }) {
  const [selected, setSelected] = useState(null);
  const { occupiedSeats } = useSeatOccupancy();

  const totalOccupied = occupiedSeats.size;

  return (
    <div style={{
      minHeight: "100vh", minHeight: "100dvh",
      background: "#0D0B08", color: "#F5E6C8",
      padding: "clamp(20px, 5vw, 32px) clamp(16px, 4vw, 24px)",
      fontFamily: "'Pretendard', -apple-system, sans-serif",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ maxWidth: 430, margin: "0 auto" }}
      >
        {/* 헤더 영역 */}
        <div style={{ textAlign: "center", marginBottom: "clamp(24px, 6vw, 36px)" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ fontSize: "clamp(26px, 6vw, 32px)", marginBottom: "clamp(12px, 3vw, 18px)" }}
          >
            🥃
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              fontSize: "clamp(32px, 10vw, 44px)",
              fontWeight: 700,
              fontFamily: "'Noto Serif KR', serif",
              color: "#F5E6C8",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              marginBottom: "clamp(6px, 2vw, 10px)",
            }}
          >
            오늘, 혼술
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{
              fontSize: "clamp(10px, 2.5vw, 12px)",
              letterSpacing: "0.18em",
              color: "rgba(212,165,55,0.5)",
              fontFamily: "'Noto Serif KR', serif",
              marginBottom: "clamp(18px, 5vw, 28px)",
            }}
          >
            혼술바 소셜 가이드
          </motion.div>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            style={{
              width: 30, height: 1, margin: "0 auto",
              background: "rgba(212,165,55,0.2)",
              marginBottom: "clamp(18px, 5vw, 28px)",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <div style={{
              fontSize: "clamp(18px, 5vw, 22px)",
              fontWeight: 300,
              fontFamily: "'Noto Serif KR', serif",
              color: "#F5E6C8",
              lineHeight: 1.4,
              marginBottom: "clamp(6px, 2vw, 8px)",
            }}>
              어디에 앉으셨나요?
            </div>
            <div style={{
              fontSize: "clamp(10px, 2.8vw, 12px)",
              color: "rgba(255,255,255,0.3)",
              lineHeight: 1.5,
            }}>
              자리를 선택하면 사장님이 정확히 도움을 드릴 수 있어요
            </div>
          </motion.div>
        </div>

        {/* A줄 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 10,
          }}>
            <span style={{
              fontSize: 11, letterSpacing: "0.1em",
              color: "rgba(212,165,55,0.5)",
              fontFamily: "'Noto Serif KR', serif",
            }}>
              A줄 · 1 ~ 20번
            </span>
            {totalOccupied > 0 && (
              <span style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.35)",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "rgba(226,75,74,0.6)",
                }} />
                이용 중
              </span>
            )}
          </div>
          <SeatGrid
            seats={BAR_A}
            selected={selected}
            occupiedSeats={occupiedSeats}
            onSelect={setSelected}
            baseDelay={0.8}
          />
        </div>

        {/* B줄 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 11, letterSpacing: "0.1em",
            color: "rgba(212,165,55,0.5)",
            fontFamily: "'Noto Serif KR', serif",
            marginBottom: 10,
          }}>
            B줄 · 1 ~ 20번
          </div>
          <SeatGrid
            seats={BAR_B}
            selected={selected}
            occupiedSeats={occupiedSeats}
            onSelect={setSelected}
            baseDelay={1.0}
          />
        </div>

        {/* 입장 버튼 */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
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
          {selected ? `${selected} 자리로 입장하기` : "자리를 선택해주세요"}
        </motion.button>

        {/* 접속자 있으면 표시 */}
        {totalOccupied > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            style={{
              marginTop: 14,
              textAlign: "center",
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.05em",
            }}
          >
            지금 <span style={{ color: "rgba(212,165,55,0.7)", fontWeight: 500 }}>{totalOccupied}명</span>의 손님이 이미 계세요
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

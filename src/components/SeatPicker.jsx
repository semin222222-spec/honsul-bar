import { useState } from "react";
import { motion } from "framer-motion";
import { useSeatOccupancy } from "../hooks/useSeatOccupancy";

const BAR_SEATS = ["바 1번석", "바 2번석", "바 3번석", "바 4번석", "바 5번석", "바 6번석"];
const TABLE_SEATS = ["테이블 A", "테이블 B", "테이블 C", "테이블 D"];

export default function SeatPicker({ onSelect }) {
  const [selected, setSelected] = useState(null);
  const { occupiedSeats } = useSeatOccupancy();

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
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ fontSize: "clamp(28px, 7vw, 34px)", marginBottom: "clamp(16px, 4vw, 24px)" }}
          >
            🥃
          </motion.div>

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
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 10,
          }}>
            <span style={{
              fontSize: 11, letterSpacing: "0.1em",
              color: "rgba(212,165,55,0.5)",
            }}>
              바 좌석
            </span>
            {occupiedSeats.size > 0 && (
              <span style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
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
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
          }}>
            {BAR_SEATS.map((seat, i) => {
              const active = selected === seat;
              const occupant = occupiedSeats.get(seat);
              const isOccupied = !!occupant;

              return (
                <motion.button
                  key={seat}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.04 }}
                  whileTap={!isOccupied ? { scale: 0.95 } : {}}
                  onClick={() => !isOccupied && setSelected(seat)}
                  disabled={isOccupied}
                  style={{
                    padding: "14px 8px",
                    borderRadius: 12,
                    background: isOccupied
                      ? "rgba(255,255,255,0.02)"
                      : active
                      ? "rgba(212,165,55,0.12)"
                      : "rgba(255,255,255,0.03)",
                    border: "1px solid " + (
                      isOccupied
                        ? "rgba(255,255,255,0.04)"
                        : active
                        ? "rgba(212,165,55,0.3)"
                        : "rgba(255,255,255,0.06)"
                    ),
                    color: isOccupied
                      ? "rgba(255,255,255,0.2)"
                      : active
                      ? "#D4A537"
                      : "rgba(255,255,255,0.5)",
                    fontSize: "clamp(11px, 3vw, 13px)",
                    fontWeight: active ? 600 : 400,
                    cursor: isOccupied ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                    WebkitTapHighlightColor: "transparent",
                    minHeight: 44,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {isOccupied && (
                    <>
                      {/* 빗금 패턴 */}
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 5px)",
                        pointerEvents: "none",
                      }} />
                      {/* 아바타 작게 표시 */}
                      <span style={{
                        position: "absolute", top: 3, right: 4,
                        fontSize: 10, opacity: 0.5,
                      }}>
                        {occupant.avatar}
                      </span>
                    </>
                  )}
                  <span style={{ position: "relative" }}>
                    {seat.replace("바 ", "")}
                    {isOccupied && (
                      <div style={{
                        fontSize: 8,
                        color: "rgba(255,255,255,0.3)",
                        marginTop: 2,
                        letterSpacing: "0.05em",
                      }}>
                        이용 중
                      </div>
                    )}
                  </span>
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
              const occupant = occupiedSeats.get(seat);
              const isOccupied = !!occupant;

              return (
                <motion.button
                  key={seat}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 + i * 0.04 }}
                  whileTap={!isOccupied ? { scale: 0.95 } : {}}
                  onClick={() => !isOccupied && setSelected(seat)}
                  disabled={isOccupied}
                  style={{
                    padding: "14px 8px",
                    borderRadius: 12,
                    background: isOccupied
                      ? "rgba(255,255,255,0.02)"
                      : active
                      ? "rgba(212,165,55,0.12)"
                      : "rgba(255,255,255,0.03)",
                    border: "1px solid " + (
                      isOccupied
                        ? "rgba(255,255,255,0.04)"
                        : active
                        ? "rgba(212,165,55,0.3)"
                        : "rgba(255,255,255,0.06)"
                    ),
                    color: isOccupied
                      ? "rgba(255,255,255,0.2)"
                      : active
                      ? "#D4A537"
                      : "rgba(255,255,255,0.5)",
                    fontSize: "clamp(11px, 3vw, 13px)",
                    fontWeight: active ? 600 : 400,
                    cursor: isOccupied ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                    WebkitTapHighlightColor: "transparent",
                    minHeight: 44,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {isOccupied && (
                    <>
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 5px)",
                        pointerEvents: "none",
                      }} />
                      <span style={{
                        position: "absolute", top: 3, right: 6,
                        fontSize: 11, opacity: 0.5,
                      }}>
                        {occupant.avatar}
                      </span>
                    </>
                  )}
                  <span style={{ position: "relative" }}>
                    {seat}
                    {isOccupied && (
                      <div style={{
                        fontSize: 8,
                        color: "rgba(255,255,255,0.3)",
                        marginTop: 2,
                        letterSpacing: "0.05em",
                      }}>
                        이용 중
                      </div>
                    )}
                  </span>
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

        {/* 안내: 접속자가 있으면 표시 */}
        {occupiedSeats.size > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            style={{
              marginTop: 16,
              textAlign: "center",
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.05em",
            }}
          >
            지금 <span style={{ color: "rgba(212,165,55,0.7)" }}>{occupiedSeats.size}명</span>의 손님이 이미 계세요
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

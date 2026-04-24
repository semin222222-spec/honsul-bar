import { motion } from "framer-motion";

/**
 * ThankYouScreen
 * - 정산 완료 후 손님에게 보여지는 화면
 * - 닫을 때까지 계속 유지됨
 */
export default function ThankYouScreen({ orders = [], totalAmount = 0, nickname, seat }) {
  return (
    <div style={{
      minHeight: "100vh", minHeight: "100dvh",
      background: "#0D0B08", color: "#F5E6C8",
      display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center",
      padding: "clamp(24px, 6vw, 40px)",
      fontFamily: "'Pretendard', -apple-system, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* 배경 그라디언트 */}
      <div style={{
        position: "absolute", inset: 0,
        background:
          "radial-gradient(ellipse at 30% 30%, rgba(212,165,55,0.08), transparent 50%)," +
          "radial-gradient(ellipse at 70% 70%, rgba(180,120,30,0.06), transparent 50%)",
        pointerEvents: "none",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%", maxWidth: 360, position: "relative",
          textAlign: "center",
        }}
      >
        {/* 메인 이모지 */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: "clamp(72px, 18vw, 96px)",
            marginBottom: "clamp(20px, 5vw, 28px)",
            filter: "drop-shadow(0 4px 20px rgba(212,165,55,0.3))",
          }}
        >
          🥃
        </motion.div>

        {/* THANK YOU */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          style={{
            fontSize: "clamp(10px, 2.5vw, 12px)",
            letterSpacing: "0.35em",
            color: "rgba(212,165,55,0.55)",
            fontFamily: "'Noto Serif KR', serif",
            marginBottom: "clamp(10px, 2.5vw, 14px)",
          }}
        >
          THANK YOU
        </motion.div>

        {/* 메인 메시지 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          style={{
            fontSize: "clamp(22px, 6vw, 28px)",
            fontWeight: 300,
            fontFamily: "'Noto Serif KR', serif",
            color: "#F5E6C8",
            lineHeight: 1.4,
            marginBottom: "clamp(8px, 2vw, 12px)",
          }}
        >
          오늘 밤도<br />
          <span style={{ color: "#D4A537" }}>수고하셨어요</span>
        </motion.div>

        {/* 닉네임 + 자리 */}
        {(nickname || seat) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            style={{
              fontSize: "clamp(11px, 2.8vw, 12px)",
              color: "rgba(255,255,255,0.35)",
              marginBottom: "clamp(28px, 7vw, 40px)",
            }}
          >
            {nickname}{nickname && seat && " · "}{seat && `📍 ${seat}`}
          </motion.div>
        )}

        {/* 구분선 */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          style={{
            width: 60, height: 1, margin: "0 auto",
            background: "rgba(212,165,55,0.3)",
            marginBottom: "clamp(20px, 5vw, 28px)",
          }}
        />

        {/* 영수증 */}
        {orders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(212,165,55,0.15)",
              borderRadius: 16,
              padding: "clamp(18px, 5vw, 24px) clamp(16px, 4vw, 20px)",
              marginBottom: "clamp(20px, 5vw, 28px)",
              textAlign: "left",
            }}
          >
            <div style={{
              fontSize: 10, letterSpacing: "0.2em",
              color: "rgba(212,165,55,0.5)",
              textAlign: "center",
              marginBottom: 16,
              fontFamily: "'Noto Serif KR', serif",
            }}>
              — RECEIPT —
            </div>

            {orders.map((o, i) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.08 }}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 0",
                  borderBottom: i < orders.length - 1 ? "1px dashed rgba(255,255,255,0.06)" : "none",
                  fontSize: "clamp(12px, 3vw, 13px)",
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)" }}>{o.menu_icon}</span>
                  <span>{o.menu_name}</span>
                </span>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>
                  {o.price.toLocaleString()}원
                </span>
              </motion.div>
            ))}

            <div style={{
              marginTop: 14, paddingTop: 14,
              borderTop: "1px solid rgba(212,165,55,0.2)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{
                fontSize: 13, letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.5)",
                fontFamily: "'Noto Serif KR', serif",
              }}>
                총 결제 금액
              </span>
              <span style={{
                fontSize: "clamp(18px, 5vw, 22px)",
                color: "#D4A537",
                fontWeight: 500,
                fontFamily: "'Noto Serif KR', serif",
              }}>
                {totalAmount.toLocaleString()}
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 3 }}>원</span>
              </span>
            </div>
          </motion.div>
        )}

        {/* 마무리 메시지 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          style={{
            fontSize: "clamp(12px, 3vw, 13px)",
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.8,
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          다시 오실 날을<br />
          기다릴게요
        </motion.div>

        {/* 작은 로고 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          style={{
            fontSize: "clamp(9px, 2.2vw, 10px)",
            letterSpacing: "0.3em",
            color: "rgba(212,165,55,0.4)",
            marginTop: "clamp(28px, 7vw, 36px)",
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          오늘, 혼술
        </motion.div>

        {/* 반짝이는 별 효과 */}
        <motion.div
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            position: "absolute",
            top: "5%", right: "8%",
            fontSize: 12,
            color: "rgba(212,165,55,0.4)",
          }}
        >
          ✨
        </motion.div>
        <motion.div
          animate={{
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 4, repeat: Infinity, delay: 1 }}
          style={{
            position: "absolute",
            bottom: "15%", left: "5%",
            fontSize: 10,
            color: "rgba(212,165,55,0.3)",
          }}
        >
          ✨
        </motion.div>
      </motion.div>
    </div>
  );
}

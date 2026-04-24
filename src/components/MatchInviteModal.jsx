import { motion, AnimatePresence } from "framer-motion";
import { Swords, Check, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function MatchInviteModal({ invite, onAccept, onDecline }) {
  const [countdown, setCountdown] = useState(20);

  useEffect(() => {
    if (!invite) return;
    setCountdown(20);
    const iv = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(iv);
          onDecline(invite); // 자동 거절
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [invite, onDecline]);

  return (
    <AnimatePresence>
      {invite && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(10px)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            style={{
              background: "linear-gradient(180deg, rgba(30,22,14,0.98), rgba(15,11,8,0.98))",
              border: "1px solid rgba(212,165,55,0.3)",
              borderRadius: 20,
              padding: "32px 28px 24px",
              maxWidth: 360,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(212,165,55,0.1)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* 반짝이는 배경 */}
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                position: "absolute",
                inset: -40,
                background:
                  "radial-gradient(circle at center, rgba(212,165,55,0.15), transparent 60%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "relative" }}>
              {/* 아이콘 */}
              <motion.div
                initial={{ rotate: -15, scale: 0.5 }}
                animate={{ rotate: [0, -8, 8, 0], scale: 1 }}
                transition={{ rotate: { duration: 1.2, repeat: Infinity }, scale: { duration: 0.3 } }}
                style={{ fontSize: 52, marginBottom: 10 }}
              >
                ⚔️
              </motion.div>

              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.25em",
                  color: "rgba(212,165,55,0.5)",
                  marginBottom: 4,
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                NEW CHALLENGE
              </div>
              <div
                style={{
                  fontSize: 20,
                  color: "#F5E6C8",
                  fontWeight: 300,
                  fontFamily: "'Noto Serif KR', serif",
                  marginBottom: 16,
                }}
              >
                더 나인 대결 신청
              </div>

              {/* 상대방 정보 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 14,
                  marginBottom: 20,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(212,165,55,0.1)",
                    border: "1.5px solid rgba(212,165,55,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  {invite.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#F5E6C8",
                      fontWeight: 500,
                      marginBottom: 2,
                    }}
                  >
                    {invite.nickname}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    {invite.seat}
                  </div>
                </div>
              </div>

              {/* 안내 문구 */}
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.45)",
                  marginBottom: 18,
                  lineHeight: 1.6,
                }}
              >
                9라운드 심리 대결이 시작됩니다.
                <br />
                <strong style={{ color: "rgba(212,165,55,0.8)" }}>
                  1은 9를 잡는다
                </strong>{" "}
                — 행운을 빌어요!
              </div>

              {/* 버튼 */}
              <div style={{ display: "flex", gap: 8 }}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onDecline(invite)}
                  style={{
                    flex: 1,
                    padding: "13px 0",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    minHeight: 48,
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <X size={14} /> 다음에
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onAccept(invite)}
                  style={{
                    flex: 1.4,
                    padding: "13px 0",
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg, #D4A537, #B8860B)",
                    color: "#0D0B08",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    minHeight: 48,
                    WebkitTapHighlightColor: "transparent",
                    letterSpacing: "0.05em",
                  }}
                >
                  <Swords size={14} /> 수락하기
                </motion.button>
              </div>

              {/* 카운트다운 */}
              <div
                style={{
                  marginTop: 14,
                  fontSize: 10,
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: "0.1em",
                }}
              >
                {countdown}초 내에 응답하지 않으면 자동으로 거절됩니다
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useEffect, useState } from "react";
import { motion as Motion } from "framer-motion";
import { WORD_REVEAL_AUTO_NEXT_MS } from "../lib/telestrationsRules";

/**
 * TelestrationsWordReveal
 *   - 자기 단어 크게 표시
 *   - 5초 카운트다운 후 자동 진행
 *   - 자기 단어는 자기만 보기. 다른 사람 단어는 못 봄.
 */
export default function TelestrationsWordReveal({ myInitialWord }) {
  const [secondsLeft, setSecondsLeft] = useState(
    Math.ceil(WORD_REVEAL_AUTO_NEXT_MS / 1000),
  );

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, WORD_REVEAL_AUTO_NEXT_MS - elapsed);
      setSecondsLeft(Math.ceil(left / 1000));
    }, 250);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        padding: "24px clamp(16px, 4vw, 24px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        minHeight: 360,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.25em",
          color: "rgba(176,132,255,0.7)",
        }}
      >
        YOUR WORD
      </div>
      <div
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.6)",
          textAlign: "center",
        }}
      >
        당신이 그릴 단어
      </div>

      <Motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 18, stiffness: 220 }}
        style={{
          padding: "32px 28px",
          background:
            "linear-gradient(135deg, rgba(176,132,255,0.15), rgba(122,232,181,0.08))",
          border: "1px solid rgba(176,132,255,0.4)",
          borderRadius: 18,
          boxShadow: "0 0 40px rgba(176,132,255,0.2)",
          textAlign: "center",
          minWidth: 220,
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: "#F0E8D8",
            fontFamily: "'Noto Serif KR', serif",
            letterSpacing: "0.05em",
          }}
        >
          {myInitialWord || "—"}
        </div>
      </Motion.div>

      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.1em",
          marginTop: 8,
        }}
      >
        {secondsLeft > 0 ? `${secondsLeft}초 후 시작` : "곧 시작..."}
      </div>

      <Motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#B084FF",
        }}
      />

      <div
        style={{
          marginTop: 16,
          padding: "10px 14px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
          textAlign: "center",
          lineHeight: 1.6,
          maxWidth: 280,
        }}
      >
        다른 사람들도 각자의 단어를 받았어요. 곧 그림 그리기가 시작됩니다.
      </div>
    </div>
  );
}

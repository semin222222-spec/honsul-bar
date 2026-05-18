import { useEffect, useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { COUNTDOWN_SECONDS } from "../lib/catchmindRules";

/**
 * CatchmindCountdown
 *
 * 풀스크린 오버레이로 "3 → 2 → 1 → 시작!" 표시.
 * room.started_at 기준 1초 간격으로 자동 진행.
 */
export default function CatchmindCountdown({ startedAt }) {
  const [n, setN] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, COUNTDOWN_SECONDS - Math.floor(elapsed));
      setN(remaining);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [startedAt]);

  const label = n > 0 ? String(n) : "시작!";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,20,16,0.92)",
        backdropFilter: "blur(12px)",
        zIndex: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <AnimatePresence mode="wait">
        <Motion.div
          key={label}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.4, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{
            fontSize: n > 0 ? 140 : 72,
            fontWeight: 900,
            color: "#FFD23F",
            textShadow: "0 0 40px rgba(255,210,63,0.5)",
            fontFamily:
              n > 0
                ? "'JetBrains Mono', monospace"
                : "'Noto Serif KR', serif",
          }}
        >
          {label}
        </Motion.div>
      </AnimatePresence>
    </div>
  );
}

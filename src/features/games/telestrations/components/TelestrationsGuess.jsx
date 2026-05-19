import { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { Send } from "lucide-react";
import {
  pathsToSvg,
  deserializePaths,
} from "../lib/telestrationsCanvas";

/**
 * TelestrationsGuess
 *   - 직전 step 의 그림을 보고 단어를 추측해서 제출
 *   - 짝수 인원 / 홀수 단계 모두 사용 (단어 입력)
 *   - currentInputEntry.drawing 이 직전 step 그림 (SVG paths JSON)
 *   - currentInputEntry.fromSeatLabel = 그린 사람 좌석
 */
export default function TelestrationsGuess({
  currentInputEntry,
  stepSecondsLeft,
  currentStep,
  totalSteps,
  onSubmit,
  submitting,
}) {
  const [word, setWord] = useState("");

  // step 바뀌면 입력 초기화
  useEffect(() => {
    setWord("");
  }, [currentStep]);

  const drawingSvg = currentInputEntry?.drawing
    ? pathsToSvg(deserializePaths(currentInputEntry.drawing))
    : "";

  const hasDrawing = !!currentInputEntry?.drawing;
  const accent = "#7AE8B5"; // 추측 단계 = 네온 그린
  const timeLow = stepSecondsLeft <= 5;

  const handleSubmit = () => {
    const trimmed = word.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div
      style={{
        padding: "16px clamp(16px, 4vw, 24px) 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* 헤더: step + 타이머 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11,
          letterSpacing: "0.15em",
        }}
      >
        <span style={{ color: `${accent}cc` }}>
          STEP {currentStep + 1}/{totalSteps} · GUESS
        </span>
        <Motion.span
          animate={timeLow ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 0.6, repeat: timeLow ? Infinity : 0 }}
          style={{
            color: timeLow ? "#E24B4A" : "#F0E8D8",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {stepSecondsLeft}초
        </Motion.span>
      </div>

      {/* 안내 */}
      <div
        style={{
          fontSize: 14,
          color: "#F0E8D8",
          fontFamily: "'Noto Serif KR', serif",
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        이 그림은 무엇일까요?
        {currentInputEntry?.fromSeatLabel && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "0.05em",
            }}
          >
            {currentInputEntry.fromSeatLabel} 님이 그린 그림
          </div>
        )}
      </div>

      {/* 그림 표시 */}
      <div
        style={{
          width: "100%",
          aspectRatio: "1",
          maxWidth: 320,
          alignSelf: "center",
          background: "#FAFAF6",
          border: "2px solid rgba(122,232,181,0.4)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 0 30px rgba(122,232,181,0.15)",
        }}
        // 직접 SVG 렌더: drawing_data 는 우리가 만든 JSON 이므로 안전
        dangerouslySetInnerHTML={{
          __html: hasDrawing
            ? drawingSvg
            : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#999;font-size:14px;font-family:'Noto Serif KR',serif">(그림이 없어요)</div>`,
        }}
      />

      {/* 단어 입력 */}
      <input
        type="text"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
        placeholder="한 단어로 입력해주세요"
        maxLength={20}
        autoFocus
        style={{
          padding: "14px 16px",
          background: "rgba(20,18,14,0.85)",
          border: "1px solid rgba(122,232,181,0.4)",
          borderRadius: 12,
          color: "#F0E8D8",
          fontSize: 16,
          fontFamily: "'Noto Serif KR', serif",
          textAlign: "center",
          outline: "none",
        }}
      />

      {/* 제출 */}
      <Motion.button
        whileTap={{ scale: word.trim() && !submitting ? 0.97 : 1 }}
        onClick={handleSubmit}
        disabled={!word.trim() || submitting}
        style={{
          padding: "14px",
          background:
            word.trim() && !submitting
              ? "linear-gradient(135deg, #7AE8B5, #4FC494)"
              : "rgba(255,255,255,0.05)",
          border:
            word.trim() && !submitting
              ? "1px solid rgba(122,232,181,0.6)"
              : "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          color: word.trim() && !submitting ? "#0F0E0D" : "rgba(255,255,255,0.3)",
          fontSize: 14,
          fontWeight: 700,
          cursor: word.trim() && !submitting ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <Send size={14} /> {submitting ? "제출 중..." : "제출하기"}
      </Motion.button>
    </div>
  );
}

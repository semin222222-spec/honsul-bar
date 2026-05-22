import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { C, FONTS } from "./callMyNameTheme";
import { GUESS_MAX_LEN } from "../lib/callMyNameRules";

/**
 * CallMyNameAnswerModal — 정답 입력 (시안 화면 3)
 *  풀스크린 블러 오버레이 + 경고 + 큰 입력창. onSubmit은 결과 객체를 반환한다.
 */
export default function CallMyNameAnswerModal({ onSubmit, onClose }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !!text.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await onSubmit(text);
    setSubmitting(false);
    if (res && !res.ok && res.error) alert(res.error);
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 460,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "24px 18px",
        background: "rgba(5,8,16,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* 시안 글로우 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 50% 30%, rgba(91,229,224,0.15), transparent 60%)",
        }}
      />

      <Motion.div
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 16 }}
        style={{ position: "relative", zIndex: 2 }}
      >
        {/* 인트로 */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 34,
              letterSpacing: "0.08em",
              color: C.cyan,
              textShadow: `0 0 20px ${C.cyanGlow}`,
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            CALL IT!
          </div>
          <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.5 }}>
            내 정체가 누구인 것 같나요?
            <br />
            정확한 이름을 입력해주세요
          </div>
        </div>

        {/* 경고 */}
        <div
          style={{
            background: "rgba(255,61,90,0.08)",
            border: "1px solid rgba(255,61,90,0.25)",
            borderRadius: 12,
            padding: "10px 12px",
            marginBottom: 14,
            fontSize: 11,
            color: C.danger,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          ⚠️ 틀리면 라이프 -1 · 신중하게!
        </div>

        {/* 입력 */}
        <input
          type="text"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, GUESS_MAX_LEN))}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="예: 백설공주"
          maxLength={GUESS_MAX_LEN}
          style={{
            width: "100%",
            background: C.bgInput,
            border: `2px solid rgba(91,229,224,0.4)`,
            color: C.ink,
            padding: 16,
            borderRadius: 14,
            fontSize: 20,
            fontWeight: 800,
            textAlign: "center",
            fontFamily: FONTS.body,
            outline: "none",
            boxShadow: "0 0 0 4px rgba(91,229,224,0.08)",
          }}
        />
        <div
          style={{
            fontSize: 11,
            color: C.muted,
            textAlign: "center",
            marginTop: 12,
            marginBottom: 16,
          }}
        >
          💡 한 글자 차이여도 오답 처리될 수 있어요
        </div>

        {/* 액션 */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 14,
              background: "transparent",
              border: `1px solid ${C.borderBright}`,
              color: C.sub,
              fontWeight: 800,
              fontSize: 13,
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
              minHeight: 50,
            }}
          >
            취소
          </button>
          <Motion.button
            whileTap={{ scale: canSubmit ? 0.97 : 1 }}
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 14,
              border: "none",
              background: canSubmit
                ? `linear-gradient(135deg, ${C.cyanSoft}, ${C.cyanDeep})`
                : "rgba(255,255,255,0.07)",
              color: canSubmit ? "#002a26" : C.muted,
              fontWeight: 900,
              fontSize: 13,
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
              minHeight: 50,
            }}
          >
            {submitting ? "외치는 중..." : "✓ 외치기"}
          </Motion.button>
        </div>
      </Motion.div>
    </Motion.div>
  );
}

import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { LogOut, Check, Dices } from "lucide-react";
import { C, FONTS } from "./exposedTheme";
import { QUESTION_MAX_LEN, START_LIVES } from "../lib/exposedRules";
import { SPICE_META, pickRandomQuestion } from "../data/exposedQuestions";

function fmt(secondsLeft) {
  const s = Math.max(0, Math.ceil(secondsLeft));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** 내 라이프(손가락) 바 */
function LifeBar({ lives }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 10,
      }}
    >
      <span
        style={{
          fontSize: 10,
          color: C.sub,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          marginRight: 4,
        }}
      >
        라이프
      </span>
      {Array.from({ length: START_LIVES }).map((_, i) => {
        const alive = i < lives;
        return (
          <span
            key={i}
            style={{
              fontSize: 20,
              opacity: alive ? 1 : 0.2,
              filter: alive
                ? `drop-shadow(0 0 6px ${C.pinkGlow})`
                : "grayscale(1)",
            }}
          >
            ✋
          </span>
        );
      })}
    </div>
  );
}

/**
 * ExposedQuestionInput — 익명 질문 작성 (시안 화면 2)
 *  입력 1회로 질문 풀을 구성한다. 누가 썼는지는 비밀.
 */
export default function ExposedQuestionInput({
  room,
  secondsLeft,
  me,
  iSubmitted,
  submittedCount,
  onSubmit,
  onLeave,
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const players = room?.players || [];
  const spice = room?.spice_level || "medium";
  const meta = SPICE_META[spice];
  const spiceColor = spice === "mild" ? C.mild : C.medium;
  const urgent = secondsLeft <= 5;
  const lives = Number(me?.lives_remaining ?? START_LIVES);

  const handleSubmit = async () => {
    if (iSubmitted || submitting) return;
    setSubmitting(true);
    const res = await onSubmit(text);
    setSubmitting(false);
    if (!res?.ok && res?.error) alert(res.error);
  };

  const handleSuggest = () => {
    setText(pickRandomQuestion(spice, []));
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: C.bgDeep,
        color: C.ink,
        fontFamily: FONTS.body,
        padding: "max(18px, env(safe-area-inset-top)) 18px 0",
      }}
    >
      {/* 상단 페이즈/타이머 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 12,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: FONTS.display,
              fontSize: 13,
              background: `linear-gradient(135deg, ${C.pinkSoft}, ${C.pinkDeep})`,
              color: "#fff",
              padding: "3px 8px",
              borderRadius: 6,
              letterSpacing: "0.06em",
              fontWeight: 900,
            }}
          >
            PHASE 2
          </span>
          <span
            style={{
              background: `${spiceColor}26`,
              border: `1px solid ${spiceColor}`,
              color: spiceColor,
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {meta.emoji} {meta.name}
          </span>
        </div>
        <Motion.div
          animate={urgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={{ duration: 0.5, repeat: urgent ? Infinity : 0 }}
          style={{
            fontFamily: FONTS.mono,
            fontSize: 22,
            fontWeight: 700,
            color: urgent ? C.danger : C.pinkSoft,
            textShadow: `0 0 16px ${urgent ? C.dangerGlow : C.pinkGlow}`,
          }}
        >
          {fmt(secondsLeft)}
        </Motion.div>
      </div>

      {/* 인트로 */}
      <div style={{ textAlign: "center", margin: "14px 0 10px" }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>🤫</div>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
          익명 질문 작성
        </div>
        <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.5 }}>
          “___ 한 적 있는 사람 접어”
          <br />
          <span style={{ color: C.pinkSoft }}>누가 썼는지는 비밀</span>
        </div>
      </div>

      {!iSubmitted ? (
        <>
          <textarea
            value={text}
            onChange={(e) =>
              setText(e.target.value.slice(0, QUESTION_MAX_LEN))
            }
            placeholder="예: 전 애인한테 술 먹고 연락한 적 있다"
            maxLength={QUESTION_MAX_LEN}
            style={{
              width: "100%",
              background: C.bgInput,
              border: `1.5px solid ${text ? C.pinkSoft : C.borderBright}`,
              color: C.ink,
              padding: 12,
              borderRadius: 12,
              fontSize: 14,
              fontFamily: FONTS.body,
              fontWeight: 600,
              minHeight: 70,
              resize: "none",
              outline: "none",
            }}
          />
          <div
            style={{
              textAlign: "right",
              fontSize: 10,
              color: C.muted,
              fontFamily: FONTS.mono,
              marginTop: 4,
            }}
          >
            {text.length} / {QUESTION_MAX_LEN}
          </div>
          <button
            onClick={handleSuggest}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: `1px dashed ${C.borderBright}`,
              color: C.sub,
              padding: 8,
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
              marginTop: 6,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Dices size={14} /> {meta.name} 질문 랜덤 추천
          </button>
        </>
      ) : (
        <div
          style={{
            background: "rgba(255,42,122,0.08)",
            border: "1px solid rgba(255,42,122,0.25)",
            borderRadius: 14,
            padding: 16,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.pinkSoft,
              letterSpacing: "0.15em",
              marginBottom: 6,
            }}
          >
            ✓ 익명 제출 완료
          </div>
          <div style={{ fontSize: 13, color: C.sub }}>
            다른 참가자를 기다리는 중...
          </div>
        </div>
      )}

      {/* 제출 현황 (카운트만) */}
      <div
        style={{
          marginTop: 12,
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "8px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 10, color: C.sub, letterSpacing: "0.15em" }}>
          📤 제출
        </span>
        <span
          style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.pink, fontWeight: 700 }}
        >
          {submittedCount} / {players.length}
        </span>
      </div>

      {/* 내 라이프 */}
      <div style={{ marginTop: 10 }}>
        <LifeBar lives={lives} />
      </div>

      <div style={{ flex: 1, minHeight: 12 }} />

      {/* 버튼 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          paddingBottom: "max(18px, env(safe-area-inset-bottom))",
          paddingTop: 12,
        }}
      >
        {!iSubmitted && (
          <Motion.button
            whileTap={{ scale: text.trim() && !submitting ? 0.98 : 1 }}
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            style={{
              width: "100%",
              padding: 16,
              border: "none",
              borderRadius: 14,
              background:
                text.trim() && !submitting
                  ? `linear-gradient(135deg, ${C.pinkSoft}, ${C.pinkDeep})`
                  : "rgba(255,255,255,0.07)",
              color: text.trim() && !submitting ? "#fff" : C.muted,
              fontWeight: 900,
              fontSize: 16,
              letterSpacing: "0.04em",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: text.trim() && !submitting ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
              minHeight: 52,
            }}
          >
            <Check size={18} strokeWidth={3} />
            {submitting ? "제출 중..." : "익명 제출"}
          </Motion.button>
        )}
        <button
          onClick={onLeave}
          style={{
            width: "100%",
            padding: 12,
            background: "transparent",
            border: `1px solid ${C.borderBright}`,
            borderRadius: 14,
            color: C.sub,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
            minHeight: 44,
          }}
        >
          <LogOut size={14} />
          나가기
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { LogOut, Check } from "lucide-react";
import { C, FONTS, playerColor } from "./dripBattleTheme";
import { ANSWER_MAX_LEN, TOTAL_ROUNDS } from "../lib/dripBattleRules";
import { splitOnBlank } from "../data/dripBattleQuestions";

function fmt(secondsLeft) {
  const s = Math.max(0, Math.ceil(secondsLeft));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * DripBattleInput — 질문 + 답변 입력 (시안 화면 2)
 */
export default function DripBattleInput({
  room,
  sessionId,
  secondsLeft,
  myAnswer,
  roundAnswers = [],
  onSubmit,
  onLeave,
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const players = room?.players || [];
  const round = room?.current_round || 1;
  const total = room?.total_rounds || TOTAL_ROUNDS;
  const { before, after } = splitOnBlank(room?.current_question || "");
  const urgent = secondsLeft <= 5;
  const submitted = !!myAnswer;
  const authors = new Set(roundAnswers.map((a) => a.session_id));

  const handleSubmit = async () => {
    if (submitted || submitting) return;
    setSubmitting(true);
    const res = await onSubmit(text);
    setSubmitting(false);
    if (!res?.ok && res?.error) alert(res.error);
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
              background: `linear-gradient(135deg, ${C.goldSoft}, ${C.orangeDeep})`,
              color: "#1a0f00",
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
              fontSize: 10,
              color: C.sub,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Round {round}/{total}
          </span>
        </div>
        <Motion.div
          animate={urgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={{ duration: 0.5, repeat: urgent ? Infinity : 0 }}
          style={{
            fontFamily: FONTS.mono,
            fontSize: 24,
            fontWeight: 700,
            color: urgent ? C.danger : C.gold,
            textShadow: `0 0 16px ${urgent ? C.dangerGlow : C.goldGlow}`,
          }}
        >
          {fmt(secondsLeft)}
        </Motion.div>
      </div>

      {/* 질문 카드 */}
      <div
        style={{
          margin: "16px 0 18px",
          textAlign: "center",
          background: "linear-gradient(135deg, #1a1408, #2a1f0a)",
          border: "1px solid rgba(255,182,39,0.3)",
          borderRadius: 20,
          padding: "22px 18px",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: C.gold,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          💬 오늘의 드립
        </div>
        <div
          style={{
            fontSize: 19,
            fontWeight: 700,
            lineHeight: 1.6,
            color: C.ink,
            wordBreak: "keep-all",
          }}
        >
          {before}
          <span
            aria-label="빈칸"
            style={{
              display: "inline-block",
              minWidth: 110,
              height: "1.15em",
              verticalAlign: "bottom",
              margin: "0 6px",
              background: "rgba(255,182,39,0.12)",
              borderBottom: `3px solid ${C.gold}`,
              borderRadius: "3px 3px 0 0",
            }}
          />
          {after}
        </div>
      </div>

      {/* 입력 */}
      {!submitted ? (
        <div>
          <div
            style={{
              fontSize: 10,
              color: C.sub,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>✏️ 빈칸을 가장 웃기게 채워줘 (글자 수 자유)</span>
            <span style={{ color: C.gold }}>익명 제출</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, ANSWER_MAX_LEN))}
            placeholder="자유롭게 길고 웃기게! (최대 50자)"
            maxLength={ANSWER_MAX_LEN}
            style={{
              width: "100%",
              background: C.bgInput,
              border: `1.5px solid ${text ? C.gold : C.borderBright}`,
              color: C.ink,
              padding: 14,
              borderRadius: 14,
              fontSize: 16,
              fontFamily: FONTS.body,
              fontWeight: 600,
              minHeight: 90,
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
            {text.length} / {ANSWER_MAX_LEN}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "rgba(255,182,39,0.08)",
            border: "1px solid rgba(255,182,39,0.25)",
            borderRadius: 14,
            padding: 16,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.gold,
              letterSpacing: "0.15em",
              marginBottom: 6,
            }}
          >
            ✓ 제출 완료
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>
            “{myAnswer.answer_text}”
          </div>
          <div style={{ fontSize: 11, color: C.sub, marginTop: 8 }}>
            다른 참가자를 기다리는 중...
          </div>
        </div>
      )}

      {/* 제출 현황 */}
      <div
        style={{
          marginTop: 16,
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: C.sub,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          📤 제출 현황 ({authors.size}/{players.length})
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6,
          }}
        >
          {players.map((p, i) => {
            const done = authors.has(p.session_id);
            const isMe = p.session_id === sessionId;
            const col = playerColor(i);
            return (
              <div
                key={p.session_id}
                style={{
                  position: "relative",
                  background: done ? "rgba(255,182,39,0.12)" : C.bgInput,
                  border: `1px solid ${
                    isMe ? C.orange : done ? C.gold : C.border
                  }`,
                  borderRadius: 8,
                  padding: "6px 4px",
                  textAlign: "center",
                  fontFamily: FONTS.mono,
                  fontSize: 11,
                  color: done ? C.gold : col.bg,
                  fontWeight: 700,
                }}
              >
                {p.seat_label}
                {done && (
                  <span
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      width: 15,
                      height: 15,
                      background: C.gold,
                      color: "#1a0f00",
                      borderRadius: "50%",
                      fontSize: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 14 }} />

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
        {!submitted && (
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
                  ? `linear-gradient(135deg, ${C.goldSoft}, ${C.orangeDeep})`
                  : "rgba(255,255,255,0.07)",
              color: text.trim() && !submitting ? "#1a0f00" : C.muted,
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
            {submitting ? "제출 중..." : "제출 완료"}
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

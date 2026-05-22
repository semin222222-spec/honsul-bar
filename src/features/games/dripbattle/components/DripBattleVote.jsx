import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { C, FONTS } from "./dripBattleTheme";
import { TOTAL_ROUNDS } from "../lib/dripBattleRules";
import { splitOnBlank } from "../data/dripBattleQuestions";

function fmt(secondsLeft) {
  const s = Math.max(0, Math.ceil(secondsLeft));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * DripBattleVote — 익명 투표 (시안 화면 3)
 *  각 답변을 "완성 문장(질문 + 답변)"으로 표시. 답변 부분만 골드 강조.
 *  본인 답변은 점선 + 흐림(투표 불가).
 */
export default function DripBattleVote({
  room,
  sessionId,
  secondsLeft,
  roundAnswers = [],
  myVote,
  votedCount,
  onVote,
  onLeave,
}) {
  const [pending, setPending] = useState(false);

  const round = room?.current_round || 1;
  const total = room?.total_rounds || TOTAL_ROUNDS;
  const urgent = secondsLeft <= 5;
  const { before, after } = splitOnBlank(room?.current_question || "");
  const votedId = myVote?.target_answer_id || null;
  const voters = (room?.players || []).length;

  const handleVote = async (answerId, isMine) => {
    if (isMine || votedId || pending) return;
    setPending(true);
    const res = await onVote(answerId);
    setPending(false);
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
            PHASE 3
          </span>
          <span
            style={{
              fontSize: 10,
              color: C.sub,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Round {round}/{total} · 투표
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

      {/* 미니 질문 + 프롬프트 */}
      <div style={{ textAlign: "center", margin: "14px 0 4px" }}>
        <div
          style={{
            background: "rgba(255,182,39,0.05)",
            border: "1px solid rgba(255,182,39,0.15)",
            borderRadius: 12,
            padding: 10,
            marginBottom: 14,
            fontSize: 12,
            color: C.sub,
            lineHeight: 1.5,
          }}
        >
          “{before}
          <span style={{ color: C.gold, fontWeight: 700 }}>____</span>
          {after}”
        </div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 26,
            letterSpacing: "0.04em",
          }}
        >
          가장 <span style={{ color: C.gold }}>웃긴 답</span>은?
        </div>
        <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
          탭해서 투표 · 익명
        </div>
      </div>

      {/* 투표 카드 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 14,
        }}
      >
        {roundAnswers.length === 0 && (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: C.muted,
              fontSize: 13,
              background: C.bgCard,
              border: `1px dashed ${C.borderBright}`,
              borderRadius: 14,
            }}
          >
            제출된 답변이 없어요.
          </div>
        )}
        {roundAnswers.map((a, i) => {
          const isMine = a.session_id === sessionId;
          const selected = votedId === a.id;
          const locked = !!votedId || pending;
          return (
            <Motion.div
              key={a.id}
              whileTap={{ scale: isMine || locked ? 1 : 0.98 }}
              onClick={() => handleVote(a.id, isMine)}
              style={{
                position: "relative",
                background: selected
                  ? "linear-gradient(135deg, rgba(255,182,39,0.12), rgba(255,107,53,0.06))"
                  : C.bgCard,
                border: `2px ${isMine ? "dashed" : "solid"} ${
                  selected ? C.gold : C.border
                }`,
                borderRadius: 16,
                padding: "14px 14px 26px",
                cursor: isMine || locked ? "default" : "pointer",
                opacity: isMine ? 0.45 : 1,
                boxShadow: selected
                  ? "0 0 0 4px rgba(255,182,39,0.15), 0 0 30px rgba(255,182,39,0.3)"
                  : "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  right: 12,
                  fontFamily: FONTS.mono,
                  fontSize: 10,
                  color: C.muted,
                  letterSpacing: "0.1em",
                }}
              >
                #{i + 1}
              </span>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: C.ink,
                  lineHeight: 1.5,
                  wordBreak: "keep-all",
                }}
              >
                {before}
                <span
                  style={{
                    background: "rgba(255,182,39,0.18)",
                    borderBottom: `2px solid ${C.gold}`,
                    color: C.goldSoft,
                    fontWeight: 800,
                    padding: "0 4px",
                  }}
                >
                  {a.answer_text}
                </span>
                {after}
              </div>
              {isMine && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 8,
                    right: 12,
                    background: C.muted,
                    color: "#fff",
                    padding: "3px 10px",
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  내 답변
                </span>
              )}
              {selected && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 8,
                    right: 12,
                    background: C.gold,
                    color: "#1a0f00",
                    padding: "3px 10px",
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                  }}
                >
                  ✓ 투표
                </span>
              )}
            </Motion.div>
          );
        })}
      </div>

      {/* 진행률 */}
      <div
        style={{
          marginTop: 14,
          background: C.bgCard,
          borderRadius: 10,
          padding: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: C.sub,
        }}
      >
        <span>투표 완료</span>
        <span>
          <span
            style={{ fontFamily: FONTS.mono, color: C.gold, fontWeight: 700 }}
          >
            {votedCount}
          </span>{" "}
          / {voters}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 12 }} />

      <div
        style={{
          paddingBottom: "max(18px, env(safe-area-inset-bottom))",
          paddingTop: 12,
        }}
      >
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

import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { C, FONTS } from "./exposedTheme";
import { START_LIVES } from "../lib/exposedRules";
import { SPICE_META } from "../data/exposedQuestions";

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
 * ExposedVote — 익명 투표 (시안 화면 3)
 *  큰 질문 카드 → 접어(진실) / 패스(아니다). 내 표는 로컬에만, 남에게 안 보인다.
 */
export default function ExposedVote({
  room,
  secondsLeft,
  me,
  myVote,
  iVoted,
  votedCount,
  onVote,
  onLeave,
}) {
  const [pending, setPending] = useState(false);

  const spice = room?.spice_level || "medium";
  const meta = SPICE_META[spice];
  const spiceColor = spice === "mild" ? C.mild : C.medium;
  const urgent = secondsLeft <= 5;
  const question = room?.current_question || "";
  const lives = Number(me?.lives_remaining ?? START_LIVES);
  const voters = (room?.players || []).filter(
    (p) => p.status !== "penalty",
  ).length;
  const locked = iVoted || pending;

  const handleVote = async (vote) => {
    if (locked) return;
    setPending(true);
    const res = await onVote(vote);
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
          flexShrink: 0,
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
            PHASE 3
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

      {/* 질문 히어로 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          margin: "16px 0",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: C.pinkSoft,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          🃏 오늘의 질문
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #1f0a1f 0%, #2a0a2e 100%)",
            border: "2px solid rgba(255,42,122,0.4)",
            borderRadius: 20,
            padding: "28px 20px",
            width: "100%",
            boxShadow:
              "0 0 40px rgba(255,42,122,0.3), inset 0 0 30px rgba(255,42,122,0.08)",
          }}
        >
          <div
            style={{
              fontSize: 32,
              color: C.pinkSoft,
              lineHeight: 0.3,
              fontFamily: "serif",
              marginBottom: 14,
            }}
          >
            &ldquo;
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.4,
              wordBreak: "keep-all",
            }}
          >
            {question}
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 11,
              color: C.muted,
              letterSpacing: "0.06em",
            }}
          >
            — 익명의 누군가
          </div>
          <div style={{ marginTop: 6, fontSize: 9, color: spiceColor }}>
            {meta.emoji} {meta.name}
          </div>
        </div>
      </div>

      {/* 진행률 */}
      <div
        style={{
          background: C.bgCard,
          borderRadius: 10,
          padding: "8px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 10,
          color: C.sub,
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <span>🤫 투표 진행 · 익명</span>
        <span>
          <span
            style={{ fontFamily: FONTS.mono, color: C.pinkSoft, fontWeight: 700 }}
          >
            {votedCount}
          </span>{" "}
          / {voters}
        </span>
      </div>

      {/* 투표 버튼 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 10,
          flexShrink: 0,
        }}
      >
        <VoteButton
          emoji="✋"
          label="접어"
          sub="진실"
          color={C.pink}
          chosen={myVote === "fold"}
          locked={locked}
          onClick={() => handleVote("fold")}
        />
        <VoteButton
          emoji="🙅"
          label="패스"
          sub="아니다"
          color={C.purple}
          chosen={myVote === "pass"}
          locked={locked}
          onClick={() => handleVote("pass")}
        />
      </div>

      {iVoted && (
        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: C.sub,
            marginBottom: 8,
          }}
        >
          ✓ 투표 완료 · 결과를 기다리는 중...
        </div>
      )}

      {/* 내 라이프 */}
      <div style={{ flexShrink: 0 }}>
        <LifeBar lives={lives} />
      </div>

      <div
        style={{
          paddingBottom: "max(18px, env(safe-area-inset-bottom))",
          paddingTop: 10,
          flexShrink: 0,
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

/** 접어 / 패스 버튼 (선택 시 강조). 내 표만 알 뿐, 남의 선택은 표시하지 않는다. */
function VoteButton({ emoji, label, sub, color, chosen, locked, onClick }) {
  return (
    <Motion.button
      whileTap={{ scale: locked ? 1 : 0.97 }}
      onClick={onClick}
      disabled={locked}
      style={{
        padding: "16px 12px",
        borderRadius: 16,
        border: `2px solid ${chosen ? color : C.borderBright}`,
        background: chosen
          ? `linear-gradient(135deg, ${color}26, ${color}0d)`
          : C.bgCard,
        color: C.ink,
        cursor: locked ? "default" : "pointer",
        textAlign: "center",
        opacity: locked && !chosen ? 0.5 : 1,
        fontFamily: "inherit",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ fontSize: 30, display: "block", marginBottom: 4 }}>
        {emoji}
      </span>
      <span style={{ fontSize: 14, fontWeight: 800, color }}>{label}</span>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>
    </Motion.button>
  );
}

import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { LogOut, Check } from "lucide-react";
import { C, FONTS, playerColor } from "./exposedTheme";

function fmt(secondsLeft) {
  const s = Math.max(0, Math.ceil(secondsLeft));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * ExposedVote — 질문 보고 다른 참가자 1명 지목 (시안 화면 3 대체)
 *  내 지목은 로컬에만, 남에게 안 보인다. 자기 자신은 지목 불가.
 */
export default function ExposedVote({
  room,
  sessionId,
  secondsLeft,
  myVoteTarget,
  iVoted,
  votedCount,
  onVote,
  onLeave,
}) {
  const [pending, setPending] = useState(false);

  const players = room?.players || [];
  const round = room?.current_round || 1;
  const question = room?.current_question || "";
  const urgent = secondsLeft <= 5;
  const locked = iVoted || pending;
  const others = players
    .map((p, i) => ({ ...p, _i: i }))
    .filter((p) => p.session_id !== sessionId);

  const handleVote = async (p) => {
    if (locked) return;
    setPending(true);
    const res = await onVote(p.session_id, p.seat_label);
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
            ROUND {round}
          </span>
          <span
            style={{
              fontSize: 10,
              color: C.sub,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            지목 · 익명
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

      {/* 질문 카드 */}
      <div style={{ textAlign: "center", margin: "16px 0 8px", flexShrink: 0 }}>
        <div
          style={{
            fontSize: 10,
            color: C.pinkSoft,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          🃏 오늘의 질문
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #1f0a1f 0%, #2a0a2e 100%)",
            border: "2px solid rgba(255,42,122,0.4)",
            borderRadius: 20,
            padding: "24px 18px",
            boxShadow:
              "0 0 40px rgba(255,42,122,0.3), inset 0 0 30px rgba(255,42,122,0.08)",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.45,
              wordBreak: "keep-all",
            }}
          >
            {question}
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
          margin: "8px 0",
          flexShrink: 0,
        }}
      >
        <span>🤫 한 명을 지목하세요 (자기 자신 제외)</span>
        <span>
          <span
            style={{ fontFamily: FONTS.mono, color: C.pinkSoft, fontWeight: 700 }}
          >
            {votedCount}
          </span>{" "}
          / {players.length}
        </span>
      </div>

      {/* 지목 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          paddingBottom: 8,
        }}
      >
        {others.map((p) => {
          const chosen = myVoteTarget === p.session_id;
          const col = playerColor(p._i);
          return (
            <Motion.button
              key={p.session_id}
              whileTap={{ scale: locked ? 1 : 0.97 }}
              onClick={() => handleVote(p)}
              disabled={locked}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 12px",
                borderRadius: 14,
                border: `2px solid ${chosen ? C.pink : C.border}`,
                background: chosen
                  ? "linear-gradient(135deg, rgba(255,42,122,0.18), rgba(255,42,122,0.05))"
                  : C.bgCard,
                color: C.ink,
                cursor: locked ? "default" : "pointer",
                opacity: locked && !chosen ? 0.45 : 1,
                boxShadow: chosen
                  ? `0 0 0 4px rgba(255,42,122,0.15), 0 0 24px ${C.pinkGlow}`
                  : "none",
                fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent",
                position: "relative",
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: col.bg,
                  color: col.fg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 12,
                  fontFamily: FONTS.mono,
                  flexShrink: 0,
                  border: "2px solid rgba(255,255,255,0.15)",
                }}
              >
                {p.seat_label}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, textAlign: "left" }}>
                {p.seat_label} 자리
              </span>
              {chosen && (
                <span
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    width: 22,
                    height: 22,
                    background: C.pink,
                    color: "#fff",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
            </Motion.button>
          );
        })}
      </div>

      {iVoted && (
        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: C.sub,
            margin: "4px 0 8px",
          }}
        >
          ✓ 지목 완료 · 결과를 기다리는 중...
        </div>
      )}

      <div style={{ flex: 1, minHeight: 8 }} />

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

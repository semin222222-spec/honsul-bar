import { useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { LogOut, ChevronRight } from "lucide-react";
import { C, FONTS, playerColor } from "./callMyNameTheme";
import { INITIAL_LIVES } from "../lib/callMyNameRules";

function vibrate(ms = 200) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(ms);
    } catch {
      /* 미지원 무시 */
    }
  }
}

function Hearts({ lives, size = 20 }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
        <span
          key={i}
          style={{
            fontSize: size,
            opacity: i < lives ? 1 : 0.2,
            filter: i < lives ? "none" : "grayscale(1)",
          }}
        >
          ❤️
        </span>
      ))}
    </div>
  );
}

const CONFETTI = [
  { left: "10%", color: "#5BE5E0", delay: 0 },
  { left: "22%", color: "#FFB627", delay: 0.3 },
  { left: "35%", color: "#7FECE8", delay: 0.6 },
  { left: "48%", color: "#FF6B35", delay: 0.9 },
  { left: "61%", color: "#5BE5E0", delay: 0.2 },
  { left: "74%", color: "#FFB627", delay: 0.8 },
  { left: "87%", color: "#7FECE8", delay: 0.4 },
  { left: "16%", color: "#FF6B35", delay: 1.1 },
  { left: "40%", color: "#5BE5E0", delay: 1.5 },
  { left: "65%", color: "#FFB627", delay: 1.8 },
];

/**
 * CallMyNameResult — 정답 성공/실패/벌칙/게임종료 (시안 화면 4·5 + 종료)
 *
 * mode:
 *  - 'solved'   : 정답 성공. 폭죽 + "?→정답" 리빌. (해당 플레이어만, 다른 사람은 게임 계속)
 *  - 'fail'     : 오답(라이프 남음). 빨강 깜빡임 + 정답 비공개 + "계속 추리". (일시 오버레이)
 *  - 'penalty'  : 라이프 0. 게임 오버 + 정체 공개 + 벌칙.
 *  - 'finished' : 전원 종료. 모두의 정체 공개 요약.
 */
export default function CallMyNameResult({
  mode,
  keyword,
  seat,
  lives = 0,
  guess,
  players = [],
  onContinue,
  onLeave,
  dismissLeftMs,
}) {
  useEffect(() => {
    if (mode === "solved" || mode === "fail" || mode === "penalty") vibrate(200);
  }, [mode]);

  // ── 정답 성공 ─────────────────────────────
  if (mode === "solved") {
    return (
      <div
        style={{
          position: "relative",
          minHeight: "100%",
          overflow: "hidden",
          color: C.ink,
          fontFamily: FONTS.body,
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(91,229,224,0.25), transparent 60%)," +
            "radial-gradient(ellipse at 50% 80%, rgba(255,182,39,0.1), transparent 60%)," +
            C.bgBase,
        }}
      >
        {/* 폭죽 */}
        {CONFETTI.map((c, i) => (
          <Motion.span
            key={i}
            initial={{ y: -30, opacity: 1, rotate: 0 }}
            animate={{ y: 760, opacity: 0, rotate: 720 }}
            transition={{
              duration: 3,
              delay: c.delay,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              position: "absolute",
              top: 0,
              left: c.left,
              width: 8,
              height: 14,
              background: c.color,
              borderRadius: 2,
              pointerEvents: "none",
            }}
          />
        ))}

        <div
          style={{
            position: "relative",
            zIndex: 2,
            minHeight: "100%",
            padding: "max(28px, env(safe-area-inset-top)) 18px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            gap: 16,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <Motion.div
              animate={{ y: [0, -15, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              style={{ fontSize: 70, marginBottom: 8, display: "inline-block" }}
            >
              🎉
            </Motion.div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 56,
                letterSpacing: "0.08em",
                background: `linear-gradient(135deg, ${C.cyanSoft}, ${C.cyanDeep})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: `0 0 40px ${C.cyanGlow}`,
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              CORRECT!
            </div>
            <div
              style={{
                fontSize: 13,
                color: C.ink,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              정답!
            </div>
          </div>

          {/* ?→정답 리빌 */}
          <Motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 14 }}
            style={{
              background:
                "linear-gradient(135deg, rgba(91,229,224,0.18), rgba(43,201,194,0.08))",
              border: `2px solid ${C.cyan}`,
              borderRadius: 24,
              padding: 22,
              textAlign: "center",
              boxShadow: `0 0 60px rgba(91,229,224,0.4), inset 0 0 30px rgba(91,229,224,0.05)`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: C.cyan,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              내 정체는
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 28,
                color: C.muted,
                letterSpacing: "0.2em",
                marginBottom: 4,
              }}
            >
              ?
            </div>
            <div style={{ fontSize: 14, color: C.cyan, margin: "4px 0" }}>▼</div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: C.ink,
                textShadow: `0 0 20px ${C.cyanGlow}`,
                lineHeight: 1.1,
              }}
            >
              {keyword}
            </div>
            <div
              style={{
                marginTop: 12,
                display: "inline-block",
                background: "rgba(91,229,224,0.15)",
                border: `1px solid ${C.cyan}`,
                color: C.cyan,
                padding: "4px 12px",
                borderRadius: 8,
                fontFamily: FONTS.mono,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {seat}
            </div>
          </Motion.div>

          <div
            style={{
              textAlign: "center",
              fontSize: 13,
              color: C.ink,
              lineHeight: 1.6,
            }}
          >
            🥃 다음 사람한테 한 잔 받기!
            <br />
            <span style={{ fontSize: 11, color: C.sub }}>
              다른 참가자가 추리를 끝낼 때까지 기다려요
            </span>
          </div>

          <button onClick={onLeave} style={secondaryBtn}>
            <LogOut size={14} /> 끝내기
          </button>
        </div>
      </div>
    );
  }

  // ── 게임 종료 요약 ─────────────────────────
  if (mode === "finished") {
    const dismissSec =
      dismissLeftMs != null ? Math.max(0, Math.ceil(dismissLeftMs / 1000)) : null;
    return (
      <div
        style={{
          minHeight: "100%",
          color: C.ink,
          fontFamily: FONTS.body,
          background:
            "radial-gradient(ellipse at 50% 25%, rgba(91,229,224,0.18), transparent 60%)," +
            C.bgDeep,
          display: "flex",
          flexDirection: "column",
          padding: "max(28px, env(safe-area-inset-top)) 18px 24px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <Motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 13 }}
            style={{ fontSize: 60, marginBottom: 10 }}
          >
            🕵️
          </Motion.div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 46,
              letterSpacing: "0.06em",
              color: C.cyan,
              textShadow: `0 0 24px ${C.cyanGlow}`,
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            GAME OVER
          </div>
          <div style={{ fontSize: 13, color: C.sub }}>
            모두의 정체 공개! 수고하셨어요 🥃
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            flex: 1,
            overflowY: "auto",
          }}
        >
          {players.map((p, i) => {
            const col = playerColor(i);
            const solved = p.status === "solved";
            return (
              <div
                key={p.session_id}
                style={{
                  background: C.bgCard,
                  border: `1px solid ${solved ? C.cyan : "rgba(255,61,90,0.3)"}`,
                  borderRadius: 14,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: col.bg,
                    color: col.fg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 11,
                    fontFamily: FONTS.mono,
                    flexShrink: 0,
                  }}
                >
                  {p.seat_label}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: C.sub }}>
                    {p.seat_label} 자리 · {p.identity_category || "?"}
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.1 }}>
                    {p.identity_keyword || "?"}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: solved ? C.cyan : C.danger,
                    whiteSpace: "nowrap",
                  }}
                >
                  {solved ? "✓ 정답" : "💀 벌칙"}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={onLeave}
          style={{
            ...primaryBtn,
            marginTop: 16,
          }}
        >
          로비로 나가기{dismissSec != null ? ` (${dismissSec})` : ""}
        </button>
      </div>
    );
  }

  // ── 오답(fail) / 벌칙(penalty) — 빨강 화면 ──
  const isPenalty = mode === "penalty";
  return (
    <div
      style={{
        minHeight: "100%",
        position: "relative",
        overflow: "hidden",
        color: C.ink,
        fontFamily: FONTS.body,
        background: "radial-gradient(ellipse at center, #2a0510 0%, #050810 70%)",
      }}
    >
      {/* 빨강 플래시 (다른 게임 벌칙과 통일) */}
      <Motion.div
        animate={{ opacity: [0.3, 0.9, 0.3] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(180deg, rgba(255,61,90,0.25), transparent 30%, transparent 70%, rgba(255,61,90,0.25))",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "100%",
          padding: "max(24px, env(safe-area-inset-top)) 18px 24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* 상단 */}
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <Motion.div
            animate={{ rotate: [-10, 10, -10] }}
            transition={{ duration: 0.4, repeat: Infinity }}
            style={{ fontSize: 56, marginBottom: 6, display: "inline-block" }}
          >
            {isPenalty ? "🚨" : "💥"}
          </Motion.div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 52,
              color: C.danger,
              letterSpacing: "0.08em",
              lineHeight: 1,
              textShadow: `0 0 20px ${C.danger}, 0 0 40px rgba(255,61,90,0.5)`,
              marginBottom: 4,
            }}
          >
            {isPenalty ? "GAME OVER" : "WRONG!"}
          </div>
          <div
            style={{
              color: C.ink,
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {isPenalty ? "라이프 소진 · 벌칙!" : "아쉽게도 오답"}
          </div>
        </div>

        {/* 비교 카드 */}
        <div
          style={{
            background: "rgba(0,0,0,0.5)",
            border: `2px solid ${C.danger}`,
            borderRadius: 20,
            padding: "18px 16px",
            textAlign: "center",
            backdropFilter: "blur(10px)",
            boxShadow: "0 0 40px rgba(255,61,90,0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 10,
              paddingBottom: 10,
              borderBottom: "1px dashed rgba(255,255,255,0.1)",
            }}
          >
            <span style={rowLabel}>당신의 답변</span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                flex: 1,
                textAlign: "left",
                color: C.danger,
                textDecoration: "line-through",
                textDecorationColor: "rgba(255,61,90,0.4)",
                wordBreak: "break-all",
              }}
            >
              {guess || "—"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={rowLabel}>실제 정답</span>
            <span
              style={{
                flex: 1,
                textAlign: "left",
                fontWeight: 800,
                color: isPenalty ? C.ink : C.sub,
                fontSize: isPenalty ? 22 : 16,
              }}
            >
              {isPenalty ? keyword : "아직 비밀 🤫"}
            </span>
          </div>

          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 10,
                color: C.sub,
                letterSpacing: "0.2em",
                marginBottom: 4,
              }}
            >
              YOUR SEAT
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 40,
                color: C.ink,
                letterSpacing: "0.06em",
                lineHeight: 1,
                textShadow: "0 0 20px rgba(255,61,90,0.5)",
              }}
            >
              {seat}
            </div>
          </div>
        </div>

        {/* 벌칙(penalty) 또는 라이프(fail) */}
        {isPenalty ? (
          <div
            style={{
              background: "linear-gradient(135deg, #1a0810, #2a0a18)",
              border: "1px solid rgba(255,61,90,0.4)",
              borderRadius: 16,
              padding: 14,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: C.danger,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              ⚡ 벌칙
            </div>
            <div style={{ fontSize: 28, margin: "2px 0" }}>🥃</div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>
              데킬라 1잔!
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "linear-gradient(135deg, #1a0810, #2a0a18)",
              border: "1px solid rgba(255,61,90,0.3)",
              borderRadius: 16,
              padding: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: C.sub,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              남은 라이프
            </span>
            <Hearts lives={lives} />
          </div>
        )}

        {/* 액션 */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onLeave} style={{ ...secondaryBtn, flex: 1 }}>
            끝내기
          </button>
          {!isPenalty && (
            <button
              onClick={onContinue}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                border: "none",
                background: "#fff",
                color: "#050810",
                fontWeight: 900,
                fontSize: 14,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent",
                minHeight: 50,
              }}
            >
              계속 추리
              <ChevronRight size={16} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const rowLabel = {
  fontSize: 10,
  color: C.sub,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  width: 56,
  textAlign: "left",
  lineHeight: 1.3,
};

const primaryBtn = {
  width: "100%",
  padding: 16,
  border: "none",
  borderRadius: 14,
  background: `linear-gradient(135deg, ${C.cyanSoft}, ${C.cyanDeep})`,
  color: "#002a26",
  fontWeight: 900,
  fontSize: 15,
  letterSpacing: "0.04em",
  cursor: "pointer",
  boxShadow: `0 10px 30px -10px ${C.cyanGlow}`,
  fontFamily: "inherit",
  WebkitTapHighlightColor: "transparent",
  minHeight: 52,
};

const secondaryBtn = {
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
  minHeight: 48,
};

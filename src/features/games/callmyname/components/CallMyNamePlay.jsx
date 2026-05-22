import { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { C, FONTS, playerColor } from "./callMyNameTheme";
import { INITIAL_LIVES } from "../lib/callMyNameRules";
import CallMyNameAnswerModal from "./CallMyNameAnswerModal";
import CallMyNameResult from "./CallMyNameResult";

/**
 * CallMyNamePlay — 게임 메인 (시안 화면 2)
 *
 * 자유 플레이: 내 정체는 "?"로 블라인드, 다른 사람 정체는 크게 노출, 하단 FAB로 정답 시도.
 * me.status(solved/penalty)와 일시 오답(fail)은 CallMyNameResult로 전환해 보여준다.
 */
export default function CallMyNamePlay({
  room,
  sessionId,
  me,
  others = [],
  onSubmitGuess,
  onLeave,
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  // 일시 오답 오버레이 { kind:'fail', guess, lives }
  const [failOverlay, setFailOverlay] = useState(null);
  // RPC 반환 직후 즉시 전환용 (realtime 도착 전 깜빡임 방지)
  const [localTerminal, setLocalTerminal] = useState(null); // 'solved' | 'penalty'

  const players = room?.players || [];
  const lives = me?.lives_remaining ?? INITIAL_LIVES;

  const solved = me?.status === "solved" || localTerminal === "solved";
  const penalty = me?.status === "penalty" || localTerminal === "penalty";

  const handleSubmit = async (text) => {
    const res = await onSubmitGuess(text);
    if (!res || !res.ok) return res;
    setShowAnswer(false);
    if (res.correct) {
      setLocalTerminal("solved");
    } else if (res.status === "penalty") {
      setLocalTerminal("penalty");
    } else {
      setFailOverlay({ kind: "fail", guess: res.guess, lives: res.lives_remaining });
    }
    return res;
  };

  // ── 결과 전환 (성공 / 벌칙 / 일시 오답) ──
  if (solved) {
    return (
      <CallMyNameResult
        mode="solved"
        keyword={me?.identity_keyword}
        seat={me?.seat_label}
        onLeave={onLeave}
      />
    );
  }
  if (penalty) {
    return (
      <CallMyNameResult
        mode="penalty"
        keyword={me?.identity_keyword}
        seat={me?.seat_label}
        guess={failOverlay?.guess}
        onLeave={onLeave}
      />
    );
  }
  if (failOverlay) {
    return (
      <CallMyNameResult
        mode="fail"
        seat={me?.seat_label}
        guess={failOverlay.guess}
        lives={failOverlay.lives}
        onContinue={() => setFailOverlay(null)}
        onLeave={onLeave}
      />
    );
  }

  // ── 게임 보드 ──
  return (
    <div
      style={{
        minHeight: "100%",
        background: C.bgDeep,
        color: C.ink,
        fontFamily: FONTS.body,
        padding: "max(18px, env(safe-area-inset-top)) 18px 110px",
      }}
    >
      {/* 상단: 자유 추리 + 라이프 */}
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
              background: `linear-gradient(135deg, ${C.cyanSoft}, ${C.cyanDeep})`,
              color: "#002a26",
              padding: "3px 8px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.06em",
            }}
          >
            자유 추리
          </span>
          <span style={{ fontSize: 11, color: C.sub }}>
            Yes/No 질문으로 알아내요
          </span>
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
            <span
              key={i}
              style={{
                fontSize: 14,
                opacity: i < lives ? 1 : 0.2,
                filter: i < lives ? "none" : "grayscale(1)",
              }}
            >
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* 내 정체 카드 (블라인드) */}
      <div
        style={{
          margin: "14px 0 16px",
          position: "relative",
          overflow: "hidden",
          textAlign: "center",
          borderRadius: 20,
          padding: "18px 16px",
          border: "2px solid rgba(91,229,224,0.4)",
          background:
            "radial-gradient(circle at 50% 30%, rgba(91,229,224,0.2), transparent 60%)," +
            "linear-gradient(135deg, #0a1a1f 0%, #0d1322 100%)",
          boxShadow:
            "0 0 30px rgba(91,229,224,0.2), inset 0 0 30px rgba(91,229,224,0.05)",
        }}
      >
        {/* 사선 격자 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent 0 12px, rgba(91,229,224,0.04) 12px 13px)",
          }}
        />
        <div
          style={{
            position: "relative",
            fontSize: 10,
            color: C.cyan,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          🕵️ 내 정체
        </div>
        <Motion.div
          animate={{
            textShadow: [
              `0 0 20px ${C.cyanGlow}, 0 0 40px ${C.cyanGlow}`,
              `0 0 30px ${C.cyanGlow}, 0 0 60px ${C.cyanGlow}, 0 0 80px ${C.cyanGlow}`,
              `0 0 20px ${C.cyanGlow}, 0 0 40px ${C.cyanGlow}`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "relative",
            fontFamily: FONTS.display,
            fontSize: 90,
            color: C.cyan,
            lineHeight: 1,
          }}
        >
          ?
        </Motion.div>
        <div
          style={{
            position: "relative",
            marginTop: 6,
            fontSize: 11,
            color: C.muted,
          }}
        >
          질문해서 알아내세요!
        </div>
      </div>

      {/* 다른 참가자 정체 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 10,
          letterSpacing: "0.12em",
          color: C.sub,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: C.cyan,
              boxShadow: `0 0 8px ${C.cyan}`,
              display: "inline-block",
            }}
          />
          다른 참가자의 정체
        </span>
        <span style={{ color: C.muted }}>자유 대화</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {others.map((p) => {
          const idx = players.findIndex((x) => x.session_id === p.session_id);
          const col = playerColor(idx);
          const isSolved = p.status === "solved";
          const isPenalty = p.status === "penalty";
          return (
            <div
              key={p.session_id}
              style={{
                position: "relative",
                overflow: "hidden",
                background: isSolved ? "rgba(91,229,224,0.06)" : C.bgCard,
                border: `1px solid ${
                  isSolved
                    ? C.cyan
                    : isPenalty
                      ? "rgba(255,61,90,0.4)"
                      : C.border
                }`,
                borderRadius: 14,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: isSolved ? 0.75 : 1,
              }}
            >
              {/* 좌측 컬러 바 */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: 3,
                  background: col.bg,
                }}
              />
              <div
                style={{
                  width: 38,
                  height: 38,
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
                  border: "2px solid rgba(255,255,255,0.15)",
                }}
              >
                {p.seat_label}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: C.sub, marginBottom: 1 }}>
                  {p.seat_label} 자리
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: isSolved ? C.cyan : C.ink,
                    letterSpacing: "-0.3px",
                    lineHeight: 1.1,
                    wordBreak: "keep-all",
                  }}
                >
                  {p.identity_keyword || "?"}
                </div>
              </div>
              {isSolved && (
                <span
                  style={{
                    background: C.cyan,
                    color: "#002a26",
                    fontSize: 9,
                    padding: "3px 7px",
                    borderRadius: 6,
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}
                >
                  ✓ 정답
                </span>
              )}
              {isPenalty && (
                <span
                  style={{
                    color: C.danger,
                    fontSize: 10,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  💀 벌칙
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 나가기 (FAB 위 흐름) */}
      <button
        onClick={onLeave}
        style={{
          width: "100%",
          marginTop: 14,
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
        <LogOut size={14} /> 나가기
      </button>

      {/* 정답 외치기 FAB */}
      <div
        style={{
          position: "fixed",
          bottom: "max(20px, env(safe-area-inset-bottom))",
          left: 18,
          right: 18,
          zIndex: 30,
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        <Motion.button
          onClick={() => setShowAnswer(true)}
          whileTap={{ scale: 0.98 }}
          animate={{
            boxShadow: [
              `0 10px 40px -10px ${C.cyanGlow}, 0 0 0 4px rgba(91,229,224,0.15), inset 0 1px 0 rgba(255,255,255,0.4)`,
              `0 10px 40px -5px ${C.cyanGlow}, 0 0 0 8px rgba(91,229,224,0.1), inset 0 1px 0 rgba(255,255,255,0.4)`,
              `0 10px 40px -10px ${C.cyanGlow}, 0 0 0 4px rgba(91,229,224,0.15), inset 0 1px 0 rgba(255,255,255,0.4)`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: "100%",
            background: `linear-gradient(135deg, ${C.cyanSoft}, ${C.cyanDeep})`,
            color: "#002a26",
            border: "none",
            padding: 16,
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: "0.08em",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span style={{ fontSize: 20 }}>📣</span>
          정답 외치기!
        </Motion.button>
      </div>

      <AnimatePresence>
        {showAnswer && (
          <CallMyNameAnswerModal
            onSubmit={handleSubmit}
            onClose={() => setShowAnswer(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

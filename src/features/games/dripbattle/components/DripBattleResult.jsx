import { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { LogOut, Play, ChevronRight } from "lucide-react";
import { C, FONTS } from "./dripBattleTheme";
import { BEST_REVEAL_MS, TOTAL_ROUNDS } from "../lib/dripBattleRules";

/**
 * DripBattleResult — 1등 발표(시안 화면 4) → 꼴등 벌칙(시안 화면 5) → 게임 종료
 *
 * room.status:
 *  - phase_result: best 연출 → (탭/자동) → penalty 연출
 *  - finished:     게임 종료 요약
 */
export default function DripBattleResult({
  room,
  isHost,
  onNextRound,
  onLeave,
  dismissLeftMs,
}) {
  const result = room?.last_round_result || {};
  const ranking = result.ranking || [];
  const best = result.best || null;
  const worst = result.worst || null;
  const round = room?.current_round || 1;
  const total = room?.total_rounds || TOTAL_ROUNDS;
  const isLastRound = round >= total;
  const finished = room?.status === "finished";

  // status가 phase_result로 진입할 때마다 컴포넌트가 새로 마운트되므로
  // view는 자연히 'best'부터 시작한다. (별도 리셋 effect 불필요)
  const [view, setView] = useState("best"); // 'best' | 'penalty'
  const [advancing, setAdvancing] = useState(false);

  // best → penalty 자동 전환 (worst 있을 때만)
  useEffect(() => {
    if (finished || view !== "best" || !worst) return;
    const id = setTimeout(() => setView("penalty"), BEST_REVEAL_MS);
    return () => clearTimeout(id);
  }, [finished, view, worst]);

  // 꼴등 화면 진동
  useEffect(() => {
    if (finished || view !== "penalty") return;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(200);
      } catch {
        /* 미지원 무시 */
      }
    }
  }, [finished, view]);

  const handleNext = async () => {
    if (advancing) return;
    setAdvancing(true);
    const res = await onNextRound();
    setAdvancing(false);
    if (!res?.ok && res?.error) alert(res.error);
  };

  const nextLabel = isLastRound ? "게임 종료" : "다음 라운드";

  // ── 게임 종료 화면 ─────────────────────────
  if (finished) {
    const dismissSec =
      dismissLeftMs != null ? Math.max(0, Math.ceil(dismissLeftMs / 1000)) : null;
    return (
      <div
        style={{
          minHeight: "100%",
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(255,182,39,0.18), transparent 60%), " +
            C.bgDeep,
          color: C.ink,
          fontFamily: FONTS.body,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "40px 24px",
        }}
      >
        <Motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 13 }}
          style={{ fontSize: 64, marginBottom: 12 }}
        >
          🎉
        </Motion.div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 48,
            letterSpacing: "0.06em",
            color: C.gold,
            textShadow: `0 0 24px ${C.goldGlow}`,
            marginBottom: 6,
          }}
        >
          GAME OVER
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 22 }}>
          {total}라운드 드립 배틀 종료! 수고하셨어요 🥃
        </div>

        {best && (
          <div
            style={{
              width: "100%",
              maxWidth: 340,
              background:
                "linear-gradient(135deg, rgba(255,182,39,0.15), rgba(255,107,53,0.05))",
              border: `1px solid ${C.gold}`,
              borderRadius: 16,
              padding: 16,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: C.gold,
                letterSpacing: "0.2em",
                marginBottom: 6,
              }}
            >
              👑 마지막 라운드 베스트 드립
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.3 }}>
              “{best.answer_text}”
            </div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 8 }}>
              {best.seat_label} 자리 · {best.votes}표
            </div>
          </div>
        )}

        <button
          onClick={onLeave}
          style={{
            width: "100%",
            maxWidth: 340,
            padding: 16,
            border: "none",
            borderRadius: 14,
            background: `linear-gradient(135deg, ${C.goldSoft}, ${C.orangeDeep})`,
            color: "#1a0f00",
            fontWeight: 900,
            fontSize: 15,
            cursor: "pointer",
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
            minHeight: 52,
          }}
        >
          나가기{dismissSec != null ? ` (${dismissSec})` : ""}
        </button>
      </div>
    );
  }

  // ── 1등 발표 화면 ─────────────────────────
  if (view === "best" || !worst) {
    const runnerUps = ranking.filter(
      (r) => !best || r.answer_id !== best.answer_id,
    );
    return (
      <div
        style={{
          minHeight: "100%",
          color: C.ink,
          fontFamily: FONTS.body,
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(255,182,39,0.2), transparent 60%), " +
            "radial-gradient(ellipse at 50% 80%, rgba(255,107,53,0.1), transparent 60%), " +
            C.bgBase,
        }}
      >
        {/* 빛 점 배경 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.4,
            backgroundSize: "30px 30px",
            backgroundImage:
              `radial-gradient(circle at 10% 20%, ${C.gold} 0%, transparent 1%),` +
              `radial-gradient(circle at 80% 30%, ${C.orange} 0%, transparent 1%),` +
              `radial-gradient(circle at 50% 70%, ${C.goldSoft} 0%, transparent 1%),` +
              `radial-gradient(circle at 20% 90%, ${C.orangeSoft} 0%, transparent 1%)`,
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
          {/* 왕관 */}
          <div style={{ textAlign: "center" }}>
            <Motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                fontSize: 60,
                marginBottom: 8,
                filter: `drop-shadow(0 0 20px ${C.goldGlow})`,
              }}
            >
              👑
            </Motion.div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 44,
                letterSpacing: "0.06em",
                color: C.gold,
                textShadow: `0 0 20px ${C.gold}, 0 0 40px ${C.goldGlow}`,
                lineHeight: 1,
              }}
            >
              BEST DRIP
            </div>
            <div
              style={{
                color: C.ink,
                fontSize: 12,
                letterSpacing: "0.15em",
                marginTop: 2,
              }}
            >
              베스트 드립상 · Round {round}/{total}
            </div>
          </div>

          {/* 우승 카드 */}
          {best ? (
            <Motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 14 }}
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,182,39,0.15), rgba(255,107,53,0.05))",
                border: `2px solid ${C.gold}`,
                borderRadius: 20,
                padding: 18,
                textAlign: "center",
                boxShadow: "0 0 40px rgba(255,182,39,0.3)",
              }}
            >
              <div
                style={{
                  fontSize: 36,
                  color: C.gold,
                  lineHeight: 0.6,
                  marginBottom: 10,
                  fontFamily: "serif",
                }}
              >
                &ldquo;
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>
                {best.answer_text}
              </div>
              <div
                style={{
                  width: 30,
                  height: 2,
                  background: C.gold,
                  margin: "12px auto",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    background: "rgba(255,182,39,0.15)",
                    border: `1px solid ${C.gold}`,
                    color: C.gold,
                    padding: "4px 12px",
                    borderRadius: 8,
                    fontFamily: FONTS.mono,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {best.seat_label}
                </span>
                <span style={{ fontSize: 11, color: C.sub }}>
                  <span
                    style={{ color: C.gold, fontWeight: 700, fontSize: 14 }}
                  >
                    {best.votes}
                  </span>{" "}
                  표 획득
                </span>
              </div>
            </Motion.div>
          ) : (
            <div
              style={{
                textAlign: "center",
                color: C.sub,
                fontSize: 14,
                padding: 24,
              }}
            >
              제출된 답변이 없었어요 😅
            </div>
          )}

          {/* 다른 답변 */}
          {runnerUps.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: C.sub,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                다른 답변
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {runnerUps.slice(0, 3).map((r) => (
                  <div
                    key={r.answer_id}
                    style={{
                      background: C.bgCard,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: FONTS.mono,
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.sub,
                        flexShrink: 0,
                      }}
                    >
                      {r.rank}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.ink,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.answer_text}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: C.muted,
                          display: "flex",
                          gap: 6,
                        }}
                      >
                        <span style={{ fontFamily: FONTS.mono, color: C.sub }}>
                          {r.seat_label}
                        </span>
                        <span>· {r.votes}표</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 액션 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {worst ? (
              <button
                onClick={() => setView("penalty")}
                style={primaryBtn}
              >
                꼴등 발표 보기
                <ChevronRight size={18} strokeWidth={3} />
              </button>
            ) : isHost ? (
              <button onClick={handleNext} disabled={advancing} style={primaryBtn}>
                <Play size={16} fill="currentColor" />
                {advancing ? "진행 중..." : nextLabel}
              </button>
            ) : (
              <div style={waitBox}>방장이 다음 라운드를 진행합니다</div>
            )}
            <button onClick={onLeave} style={secondaryBtn}>
              <LogOut size={14} /> 끝내기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 꼴등 벌칙 화면 ─────────────────────────
  return (
    <div
      style={{
        minHeight: "100%",
        color: C.ink,
        fontFamily: FONTS.body,
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at center, #2a0510 0%, #050810 70%)",
      }}
    >
      {/* 빨강 플래시 */}
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
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <Motion.div
            animate={{ rotate: [-10, 10, -10] }}
            transition={{ duration: 0.4, repeat: Infinity }}
            style={{ fontSize: 60, marginBottom: 8, display: "inline-block" }}
          >
            🚨
          </Motion.div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 52,
              color: C.danger,
              letterSpacing: "0.08em",
              lineHeight: 1,
              textShadow: `0 0 20px ${C.danger}, 0 0 40px rgba(255,61,90,0.5)`,
              marginBottom: 6,
            }}
          >
            FLOP!
          </div>
          <div
            style={{
              color: C.ink,
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            노잼 드립 적발
          </div>
        </div>

        {/* 당첨자 */}
        <div
          style={{
            background: "rgba(0,0,0,0.4)",
            border: `2px solid ${C.danger}`,
            borderRadius: 20,
            padding: "20px 16px",
            textAlign: "center",
            backdropFilter: "blur(10px)",
            boxShadow: "0 0 40px rgba(255,61,90,0.3)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.sub,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            벌칙 당첨
          </div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 56,
              color: C.ink,
              letterSpacing: "0.06em",
              lineHeight: 1,
              textShadow: "0 0 20px rgba(255,61,90,0.5)",
              marginBottom: 8,
            }}
          >
            {worst.seat_label}
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13,
              color: C.sub,
              fontStyle: "italic",
            }}
          >
            “{worst.answer_text}”
          </div>
          <div
            style={{
              fontSize: 10,
              color: C.danger,
              marginTop: 6,
              fontFamily: FONTS.mono,
            }}
          >
            {worst.votes}표
          </div>
        </div>

        {/* 벌칙 */}
        <div
          style={{
            background: "linear-gradient(135deg, #1a1408, #2a1f0a)",
            border: "1px solid rgba(255,182,39,0.4)",
            borderRadius: 18,
            padding: 14,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.gold,
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

        {/* 액션 */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onLeave} style={{ ...secondaryBtn, flex: 1 }}>
            끝내기
          </button>
          {isHost ? (
            <button
              onClick={handleNext}
              disabled={advancing}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                border: "none",
                background: "#fff",
                color: "#050810",
                fontWeight: 900,
                fontSize: 14,
                cursor: advancing ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent",
                minHeight: 50,
              }}
            >
              <Play size={15} fill="currentColor" />
              {advancing ? "진행 중..." : nextLabel}
            </button>
          ) : (
            <div style={{ ...waitBox, flex: 1 }}>방장 대기 중...</div>
          )}
        </div>
      </div>
    </div>
  );
}

const primaryBtn = {
  width: "100%",
  padding: 16,
  border: "none",
  borderRadius: 14,
  background: `linear-gradient(135deg, ${C.goldSoft}, ${C.orangeDeep})`,
  color: "#1a0f00",
  fontWeight: 900,
  fontSize: 16,
  letterSpacing: "0.04em",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  boxShadow: `0 10px 30px -10px ${C.goldGlow}`,
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

const waitBox = {
  width: "100%",
  padding: 14,
  borderRadius: 14,
  background: "rgba(255,255,255,0.04)",
  border: `1px solid ${C.border}`,
  color: C.sub,
  fontSize: 12,
  fontWeight: 600,
  textAlign: "center",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
};

import { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { Play, LogOut, RotateCcw } from "lucide-react";
import { C, FONTS } from "./exposedTheme";
import { buildResultRows } from "../lib/exposedRules";

/**
 * ExposedResult — 득표수 공개 + 최다 득표자(벌칙자) 네온 발표 → 다음 질문 / 게임 종료
 *
 * room.status:
 *  - phase_result : 결과 막대 + 벌칙자(top_seats) 화려한 발표
 *  - finished     : 게임 종료 요약 (자동 만료)
 *
 * ★ 익명성: 누가 누구를 찍었는지는 절대 표시하지 않는다. 자리별 '득표수'만.
 */
export default function ExposedResult({
  room,
  isHost,
  onNextQuestion,
  onEndGame,
  onRestart,
  onLeave,
}) {
  const result = room?.last_round_result || {};
  const counts = Array.isArray(result.counts) ? result.counts : [];
  const topSeats = Array.isArray(result.top_seats) ? result.top_seats : [];
  const topVotes = result.top_votes || 0;
  const finished = room?.status === "finished";

  const rows = buildResultRows(room?.players || [], counts);
  const maxC = Math.max(topVotes, 1);
  const hasVictim = topSeats.length > 0 && topVotes > 0;

  const [advancing, setAdvancing] = useState(false);

  // 벌칙자 발표 진동
  useEffect(() => {
    if (finished || !hasVictim) return;
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      try {
        navigator.vibrate(200);
      } catch {
        /* 미지원 무시 */
      }
    }
  }, [finished, hasVictim]);

  const runAction = async (fn) => {
    if (advancing) return;
    setAdvancing(true);
    const res = await fn();
    setAdvancing(false);
    if (res && !res.ok && res.error) alert(res.error);
  };

  // 끝내기: 방장이면 전원 GAME OVER(finished), 아니면 본인만 로비로
  const handleQuit = () => {
    if (isHost) runAction(onEndGame);
    else onLeave();
  };

  // ── 게임 종료 화면 ─────────────────────────
  if (finished) {
    return (
      <div
        style={{
          minHeight: "100%",
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(255,42,122,0.18), transparent 60%), " +
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
          🎭
        </Motion.div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 48,
            letterSpacing: "0.06em",
            color: C.pinkSoft,
            textShadow: `0 0 24px ${C.pinkGlow}`,
            marginBottom: 6,
          }}
        >
          GAME OVER
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 22 }}>
          익명 폭로전 종료! 비밀은 비밀로 🤫
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            width: "100%",
            maxWidth: 340,
          }}
        >
          <button onClick={onLeave} style={{ ...secondaryBtn, flex: 1 }}>
            나가기
          </button>
          {isHost && (
            <button
              onClick={() => runAction(onRestart)}
              disabled={advancing}
              style={{ ...primaryBtn, flex: 1, width: "auto" }}
            >
              <RotateCcw size={15} strokeWidth={2.5} />
              {advancing ? "준비 중..." : "한 판 더"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── 결과 + 벌칙자 발표 ─────────────────────────
  return (
    <div
      style={{
        minHeight: "100%",
        color: C.ink,
        fontFamily: FONTS.body,
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 50% 25%, rgba(255,42,122,0.25), transparent 60%), " +
          C.bgBase,
      }}
    >
      {/* 벌칙자 있을 때 빨강 플래시 (다른 게임 벌칙과 통일) */}
      {hasVictim && (
        <Motion.div
          animate={{ opacity: [0.25, 0.7, 0.25] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(180deg, rgba(255,42,122,0.22), transparent 30%, transparent 70%, rgba(255,42,122,0.22))",
          }}
        />
      )}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "100%",
          padding: "max(24px, env(safe-area-inset-top)) 18px 24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        {/* 미니 질문 */}
        <div
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,42,122,0.2)",
            borderRadius: 12,
            padding: 10,
            fontSize: 12,
            color: C.sub,
            textAlign: "center",
            backdropFilter: "blur(8px)",
          }}
        >
          “{room?.current_question || ""}”
        </div>

        {/* 벌칙자 발표 */}
        {hasVictim ? (
          <div style={{ textAlign: "center" }}>
            <Motion.div
              animate={{ rotate: [-12, 12, -12] }}
              transition={{ duration: 0.4, repeat: Infinity }}
              style={{ fontSize: 52, marginBottom: 6, display: "inline-block" }}
            >
              💀
            </Motion.div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 52,
                color: C.danger,
                letterSpacing: "0.1em",
                lineHeight: 1,
                textShadow: `0 0 20px ${C.danger}, 0 0 40px rgba(255,61,90,0.5)`,
                marginBottom: 10,
              }}
            >
              EXPOSED
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "center",
              }}
            >
              {topSeats.map((seat, i) => (
                <Motion.div
                  key={`${seat}-${i}`}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 12, delay: 0.05 * i }}
                  style={{
                    fontFamily: FONTS.display,
                    fontSize: 48,
                    color: "#fff",
                    letterSpacing: "0.04em",
                    lineHeight: 1,
                    padding: "10px 18px",
                    borderRadius: 16,
                    border: `2px solid ${C.danger}`,
                    background: "rgba(0,0,0,0.5)",
                    boxShadow: `0 0 30px ${C.dangerGlow}`,
                    textShadow: "0 0 20px rgba(255,61,90,0.6)",
                  }}
                >
                  {seat}
                </Motion.div>
              ))}
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                color: C.pinkSoft,
                fontWeight: 700,
              }}
            >
              🥃 최다 득표 · 데킬라 한 잔!
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 6 }}>🤝</div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 28,
                color: C.sub,
                letterSpacing: "0.06em",
              }}
            >
              지목 없음
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              아무도 지목받지 않았어요
            </div>
          </div>
        )}

        {/* 득표 막대 */}
        <div
          style={{
            background: "rgba(0,0,0,0.4)",
            borderRadius: 16,
            padding: 14,
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,42,122,0.2)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {rows.map((r) => {
            const isTop = hasVictim && topSeats.includes(r.seat_label);
            const w = (r.votes / maxC) * 100;
            return (
              <div
                key={r.seat_label}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 11,
                    color: isTop ? C.pinkSoft : C.sub,
                    width: 42,
                    fontWeight: isTop ? 800 : 600,
                  }}
                >
                  {r.seat_label}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 22,
                    background: C.bgInput,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <Motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${r.votes > 0 ? Math.max(w, 12) : 0}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{
                      height: "100%",
                      borderRadius: 8,
                      background: isTop
                        ? `linear-gradient(90deg, ${C.pinkDeep}, ${C.pink})`
                        : `linear-gradient(90deg, ${C.purpleDeep}, ${C.purple})`,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 13,
                    color: "#fff",
                    fontWeight: 800,
                    width: 18,
                    textAlign: "right",
                  }}
                >
                  {r.votes}
                </span>
              </div>
            );
          })}
          <div
            style={{
              textAlign: "center",
              fontSize: 10,
              color: C.muted,
              marginTop: 2,
            }}
          >
            🤫 누가 찍었는지는 비밀
          </div>
        </div>

        {/* 액션 */}
        {isHost ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleQuit} style={{ ...secondaryBtn, flex: 1 }}>
              <LogOut size={14} /> 끝내기
            </button>
            <button
              onClick={() => runAction(onNextQuestion)}
              disabled={advancing}
              style={{ ...primaryBtn, flex: 1, width: "auto" }}
            >
              <Play size={16} fill="currentColor" />
              {advancing ? "진행 중..." : "다음 질문"}
            </button>
          </div>
        ) : (
          <div style={waitBox}>방장이 다음 질문을 고르는 중...</div>
        )}
      </div>
    </div>
  );
}

const primaryBtn = {
  width: "100%",
  padding: 14,
  border: "none",
  borderRadius: 14,
  background: `linear-gradient(135deg, ${C.pinkSoft}, ${C.pinkDeep})`,
  color: "#fff",
  fontWeight: 900,
  fontSize: 15,
  letterSpacing: "0.04em",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  boxShadow: `0 10px 30px -10px ${C.pinkGlow}`,
  fontFamily: "inherit",
  WebkitTapHighlightColor: "transparent",
  minHeight: 50,
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

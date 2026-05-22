import { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { Play, LogOut, ChevronRight, RotateCcw } from "lucide-react";
import { C, FONTS } from "./exposedTheme";
import { PENALTY_REVEAL_MS, START_LIVES, mySafety } from "../lib/exposedRules";

/** 라이프(손가락) 인라인 표시 */
function Fingers({ lives, size = 18 }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: START_LIVES }).map((_, i) => {
        const alive = i < lives;
        return (
          <span
            key={i}
            style={{
              fontSize: size,
              opacity: alive ? 1 : 0.2,
              filter: alive ? "none" : "grayscale(1)",
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
 * ExposedResult — 결과(시안 화면 4) → 벌칙 EXPOSED(시안 화면 5) → 게임 종료
 *
 * room.status:
 *  - phase_result : 다수결 그래프 → (탈락 있으면 자동/탭) → EXPOSED 벌칙 연출
 *  - finished     : 게임 종료 요약 (자동 만료)
 *
 * ★ 익명성: 누가 무엇을 골랐는지 절대 표시하지 않는다. 집계 숫자 + 내 라이프만.
 *   내 안전/-1 은 "내 표(myVote) + outcome" 으로만 계산한다(남의 표를 보지 않음).
 */
export default function ExposedResult({
  room,
  isHost,
  me,
  myVote,
  onNextQuestion,
  onEndGame,
  onRestart,
  onLeave,
}) {
  const result = room?.last_round_result || {};
  const foldCount = result.fold_count || 0;
  const passCount = result.pass_count || 0;
  const outcome = result.outcome || "tie";
  const minorityCount = result.minority_count || 0;
  const eliminatedSeats = Array.isArray(result.eliminated_seats)
    ? result.eliminated_seats
    : [];
  const isEliminated = eliminatedSeats.length > 0;
  const finished = room?.status === "finished";

  const lives = Number(me?.lives_remaining ?? START_LIVES);
  const safety = mySafety(myVote, outcome);

  // status가 phase_result로 진입할 때마다 컴포넌트가 새로 마운트 → view는 'result'부터.
  const [view, setView] = useState("result"); // 'result' | 'penalty'
  const [advancing, setAdvancing] = useState(false);

  // 탈락 있으면 result → penalty 자동 전환
  useEffect(() => {
    if (finished || view !== "result" || !isEliminated) return;
    const id = setTimeout(() => setView("penalty"), PENALTY_REVEAL_MS);
    return () => clearTimeout(id);
  }, [finished, view, isEliminated]);

  // 벌칙 화면 진동
  useEffect(() => {
    if (finished || view !== "penalty") return;
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
  }, [finished, view]);

  const runAction = async (fn) => {
    if (advancing) return;
    setAdvancing(true);
    const res = await fn();
    setAdvancing(false);
    if (res && !res.ok && res.error) alert(res.error);
  };

  // 끝내기: 방장이면 전원에게 GAME OVER(finished), 아니면 본인만 로비로
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
        <button
          onClick={onLeave}
          style={{
            width: "100%",
            maxWidth: 340,
            padding: 16,
            border: "none",
            borderRadius: 14,
            background: `linear-gradient(135deg, ${C.pinkSoft}, ${C.pinkDeep})`,
            color: "#fff",
            fontWeight: 900,
            fontSize: 15,
            cursor: "pointer",
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
            minHeight: 52,
          }}
        >
          로비로 나가기
        </button>
      </div>
    );
  }

  // ── 벌칙 EXPOSED 화면 ─────────────────────────
  if (view === "penalty" && isEliminated) {
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
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <Motion.div
              animate={{ rotate: [-12, 12, -12] }}
              transition={{ duration: 0.4, repeat: Infinity }}
              style={{ fontSize: 56, marginBottom: 8, display: "inline-block" }}
            >
              💀
            </Motion.div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 56,
                color: C.danger,
                letterSpacing: "0.1em",
                lineHeight: 1,
                textShadow: `0 0 20px ${C.danger}, 0 0 40px rgba(255,61,90,0.5)`,
                marginBottom: 6,
              }}
            >
              EXPOSED
            </div>
            <div
              style={{
                color: C.ink,
                fontSize: 12,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              거짓말쟁이 발각!
            </div>
          </div>

          {/* 당첨 자리 */}
          <div
            style={{
              background: "rgba(0,0,0,0.5)",
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
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "center",
              }}
            >
              {eliminatedSeats.map((seat, i) => (
                <div
                  key={`${seat}-${i}`}
                  style={{
                    fontFamily: FONTS.display,
                    fontSize: 56,
                    color: C.ink,
                    letterSpacing: "0.04em",
                    lineHeight: 1,
                    textShadow: "0 0 20px rgba(255,61,90,0.5)",
                  }}
                >
                  {seat}
                </div>
              ))}
            </div>
          </div>

          {/* 벌칙 (골드 톤) */}
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
            <div style={{ fontSize: 18, fontWeight: 800 }}>데킬라 1잔!</div>
          </div>

          {/* 액션 */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleQuit} style={{ ...secondaryBtn, flex: 1 }}>
              끝내기
            </button>
            {isHost ? (
              <button
                onClick={() => runAction(onRestart)}
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
                <RotateCcw size={15} strokeWidth={2.5} />
                {advancing ? "준비 중..." : "한 판 더"}
              </button>
            ) : (
              <div style={{ ...waitBox, flex: 1 }}>방장 대기 중...</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── 결과(다수결 그래프) 화면 ─────────────────────────
  const maxC = Math.max(foldCount, passCount, 1);
  const foldW = (foldCount / maxC) * 100;
  const passW = (passCount / maxC) * 100;
  const isTie = outcome === "tie";
  const noLoser = isTie || minorityCount === 0; // 동률 또는 만장일치 → 아무도 -1 X
  const foldTruth = outcome === "fold_majority";
  const passTruth = outcome === "pass_majority";

  const safetyMsg =
    safety === "draw"
      ? "🤝 무승부 · 안전"
      : safety === "safe"
        ? "✓ 안전! · 다수파였어요"
        : safety === "lost"
          ? "💀 -1 · 소수파였어요"
          : "결과 공개";
  const safetyColor =
    safety === "lost" ? C.danger : safety === "unknown" ? C.sub : C.mild;

  return (
    <div
      style={{
        minHeight: "100%",
        color: C.ink,
        fontFamily: FONTS.body,
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 50% 30%, rgba(255,42,122,0.25), transparent 60%), " +
          C.bgBase,
      }}
    >
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

        {/* 결과 헤더 */}
        <div style={{ textAlign: "center" }}>
          <Motion.div
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            style={{ fontSize: 48, marginBottom: 6, display: "inline-block" }}
          >
            {noLoser ? "🤝" : "😏"}
          </Motion.div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 24,
              color: C.sub,
              letterSpacing: "0.08em",
            }}
          >
            결과 공개
          </div>
        </div>

        {/* 좌우 그래프 */}
        <div
          style={{
            background: "rgba(0,0,0,0.4)",
            borderRadius: 16,
            padding: 14,
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,42,122,0.2)",
          }}
        >
          <SplitRow
            label="✋ 접어"
            tag={isTie ? "" : foldTruth ? "진실" : "거짓"}
            fillColor={`linear-gradient(90deg, ${C.pinkDeep}, ${C.pink})`}
            width={foldW}
            count={foldCount}
          />
          <SplitRow
            label="🙅 패스"
            tag={isTie ? "" : passTruth ? "진실" : "거짓"}
            fillColor={`linear-gradient(90deg, ${C.purpleDeep}, ${C.purple})`}
            width={passW}
            count={passCount}
          />
        </div>

        {/* 거짓말 콜아웃 */}
        <div
          style={{
            background: noLoser
              ? "rgba(255,255,255,0.04)"
              : "linear-gradient(135deg, rgba(255,61,90,0.15), rgba(255,42,122,0.05))",
            border: `1px solid ${noLoser ? C.borderBright : C.danger}`,
            borderRadius: 14,
            padding: 12,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 30, marginBottom: 4 }}>
            {noLoser ? "🤝" : "🎭"}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.4 }}>
            {isTie ? (
              <>무승부! · 아무도 -1 없음</>
            ) : minorityCount === 0 ? (
              <>모두 같은 선택! · 아무도 -1 없음</>
            ) : (
              <>
                <b style={{ color: C.danger }}>{minorityCount}명이 거짓말!</b>
                <br />
                소수파 라이프 -1
              </>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>
            🤫 누구인지는 비밀
          </div>
        </div>

        {/* 내 상태 */}
        <div
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,42,122,0.3)",
            borderRadius: 14,
            padding: 12,
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: C.sub,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              내 라이프
            </span>
            <Fingers lives={lives} />
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: safetyColor,
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            {safetyMsg}
          </div>
        </div>

        {/* 액션 */}
        {isEliminated ? (
          <button onClick={() => setView("penalty")} style={primaryBtn}>
            벌칙 결과 보기
            <ChevronRight size={18} strokeWidth={3} />
          </button>
        ) : isHost ? (
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

function SplitRow({ label, tag, fillColor, width, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: C.sub, width: 64 }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: 24,
          background: C.bgInput,
          borderRadius: 8,
          overflow: "hidden",
          margin: "0 8px",
        }}
      >
        <Motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(width, count > 0 ? 18 : 0)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            height: "100%",
            borderRadius: 8,
            background: fillColor,
            display: "flex",
            alignItems: "center",
            paddingLeft: 8,
            fontWeight: 800,
            fontSize: 12,
            color: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          {tag}
        </Motion.div>
      </div>
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: 13,
          color: "#fff",
          fontWeight: 800,
          width: 22,
          textAlign: "right",
        }}
      >
        {count}
      </span>
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

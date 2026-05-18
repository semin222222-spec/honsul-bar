import { motion as Motion } from "framer-motion";
import { Trophy, RotateCcw, LogOut } from "lucide-react";
import { RESULT_AUTO_DISMISS_MS } from "../lib/shieldRules";

const COLORS = {
  bgBase: "#0F0E0D",
  bgCard: "#1A1816",
  ink: "#F0E8D8",
  gold: "#C9A66B",
  danger: "#E5443C",
  dangerBright: "#FF5C52",
};

/**
 * ShieldResult — 6단계 BOOM / 최종 결과
 *
 * 우승자 + 탈락자 리스트 + 카운트다운 후 자동 dismiss.
 */
export default function ShieldResult({
  room,
  sessionId,
  isHost,
  onRestart,
  onLeave,
  dismissLeftMs,
}) {
  const players = room?.players || [];
  const lastEliminated = room?.last_eliminated;
  const winner = players.find((p) => p.status === "alive");
  const losers = players
    .filter((p) => p.status === "dead")
    .sort((a, b) => (a.eliminated_round || 0) - (b.eliminated_round || 0));

  const dismissSeconds = dismissLeftMs != null
    ? Math.max(0, Math.ceil(dismissLeftMs / 1000))
    : Math.ceil(RESULT_AUTO_DISMISS_MS / 1000);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: COLORS.bgBase,
        color: COLORS.ink,
        fontFamily: "'Pretendard Variable', 'Pretendard', system-ui",
        padding: "24px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* BOOM 배경 */}
      <Motion.div
        aria-hidden
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.6, 1.2, 1.0], opacity: [0, 0.18, 0.0] }}
        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.6 }}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 35%, rgba(229,68,60,0.5), transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* BOOM 헤더 */}
      <Motion.div
        initial={{ scale: 0.6, opacity: 0, y: -10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 12, stiffness: 180 }}
        style={{
          textAlign: "center",
          marginBottom: 18,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontSize: 13,
            letterSpacing: "0.3em",
            color: COLORS.dangerBright,
            marginBottom: 6,
            fontWeight: 700,
          }}
        >
          💥 BOOM!
        </div>
        {lastEliminated && (
          <>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                fontFamily: "'Noto Serif KR', serif",
                color: COLORS.dangerBright,
                marginBottom: 6,
              }}
            >
              {lastEliminated.seat_label} 손님 폭발!
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(240,232,216,0.55)",
                lineHeight: 1.5,
              }}
            >
              초성{" "}
              <span
                style={{
                  fontFamily: "'Black Han Sans', 'Noto Serif KR', serif",
                  color: COLORS.dangerBright,
                  fontSize: 16,
                }}
              >
                {lastEliminated.initials}
              </span>{" "}
              에서 시간 초과
            </div>
          </>
        )}
      </Motion.div>

      {/* 우승자 */}
      {winner && (
        <Motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            background: `linear-gradient(135deg, ${COLORS.gold}20, ${COLORS.gold}05)`,
            border: `1px solid ${COLORS.gold}66`,
            borderRadius: 16,
            padding: "20px 16px",
            textAlign: "center",
            marginBottom: 18,
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.3em",
              color: COLORS.gold,
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            WINNER
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              fontFamily: "'Noto Serif KR', serif",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: COLORS.ink,
            }}
          >
            <Trophy size={24} color={COLORS.gold} fill={COLORS.gold} />
            {winner.seat_label} 손님
            {winner.session_id === sessionId && (
              <span
                style={{
                  fontSize: 12,
                  color: COLORS.gold,
                  fontWeight: 700,
                }}
              >
                (나)
              </span>
            )}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "rgba(240,232,216,0.55)",
            }}
          >
            🍻 모두에게 한 잔 사세요!
          </div>
        </Motion.div>
      )}

      {/* 탈락자 리스트 */}
      {losers.length > 0 && (
        <div
          style={{
            background: COLORS.bgCard,
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 16,
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "rgba(240,232,216,0.4)",
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            탈락자 · 데킬라 🥃
          </div>
          {losers.map((p, idx) => {
            const isMe = p.session_id === sessionId;
            return (
              <div
                key={p.session_id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  fontSize: 13,
                  color: isMe ? COLORS.dangerBright : "rgba(240,232,216,0.7)",
                  borderBottom:
                    idx < losers.length - 1
                      ? "1px solid rgba(240,232,216,0.05)"
                      : "none",
                }}
              >
                <span>
                  {p.left_mid_game ? "🚪" : "💀"} {p.seat_label} 손님
                  {isMe && (
                    <span style={{ fontSize: 10, marginLeft: 4 }}>(나)</span>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: "rgba(240,232,216,0.5)",
                  }}
                >
                  R{p.eliminated_round || "?"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* 자동 만료 카운트 */}
      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          color: "rgba(240,232,216,0.4)",
          marginBottom: 12,
          fontFamily: "'JetBrains Mono', monospace",
          position: "relative",
          zIndex: 2,
        }}
      >
        {dismissSeconds}초 후 자동으로 방이 정리돼요
      </div>

      {/* 액션 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          position: "relative",
          zIndex: 2,
        }}
      >
        {isHost && (
          <Motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onRestart}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: 12,
              background: `linear-gradient(135deg, ${COLORS.danger}, #B83328)`,
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              fontFamily: "inherit",
              boxShadow: "0 6px 16px rgba(229,68,60,0.3)",
            }}
          >
            <RotateCcw size={16} /> 한 판 더!
          </Motion.button>
        )}
        <button
          onClick={onLeave}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid rgba(240,232,216,0.15)",
            borderRadius: 12,
            background: "transparent",
            color: "rgba(240,232,216,0.65)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            fontFamily: "inherit",
          }}
        >
          <LogOut size={14} /> 로비로 나가기
        </button>
      </div>
    </div>
  );
}

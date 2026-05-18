import { motion as Motion } from "framer-motion";
import { LogOut, RotateCcw } from "lucide-react";

const COLORS = {
  bgBase: "#1A1410",
  bgCard: "#261E18",
  ink: "#F5E6C8",
  inkMute: "rgba(245,230,200,0.55)",
  gold: "#FFD23F",
  goldBright: "#FFE08A",
  pink: "#FF6B9D",
  green: "#4ADE80",
  red: "#F87171",
};

/**
 * CatchmindResult
 *
 * 단순 랭킹 화면 — 메달 + 점수 (양수 골드, 0 회색, 음수 빨강).
 */
export default function CatchmindResult({
  room,
  sessionId,
  isHost,
  onRestart,
  onLeave,
}) {
  const ranked = [...(room?.players || [])].sort(
    (a, b) => (b.score || 0) - (a.score || 0),
  );
  const winner = ranked[0];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: COLORS.bgBase,
        color: COLORS.ink,
        fontFamily: "'Plus Jakarta Sans', system-ui",
        padding: "32px 20px 20px",
      }}
    >
      {/* 헤더 */}
      <Motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: "center", marginBottom: 12 }}
      >
        <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 4 }}>🏆</div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.25em",
            color: COLORS.gold,
            marginBottom: 8,
          }}
        >
          GAME FINISHED
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          게임 종료!
        </div>
        <div
          style={{
            fontSize: 13,
            color: COLORS.inkMute,
            marginTop: 4,
          }}
        >
          {winner?.seat_label
            ? `${winner.seat_label} 손님 우승`
            : "최종 랭킹"}
        </div>
      </Motion.div>

      {/* 랭킹 리스트 */}
      <Motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        style={{
          background: COLORS.bgCard,
          border: "1px solid rgba(245,230,200,0.08)",
          borderRadius: 16,
          padding: 8,
          margin: "16px 0",
        }}
      >
        {ranked.map((p, idx) => (
          <RankRow
            key={p.session_id}
            rank={idx + 1}
            player={p}
            isMe={p.session_id === sessionId}
            isFirst={idx === 0}
            isSecond={idx === 1}
            isThird={idx === 2}
          />
        ))}
      </Motion.div>

      <div style={{ flex: 1 }} />

      {/* 액션 버튼 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isHost && (
          <Motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onRestart}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: 12,
              background: `linear-gradient(135deg, ${COLORS.gold}, #E5B82E)`,
              color: "#1A1410",
              fontWeight: 800,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              fontFamily: "inherit",
              boxShadow: "0 6px 16px rgba(255,210,63,0.3)",
            }}
          >
            <RotateCcw size={16} /> 한 판 더!
          </Motion.button>
        )}
        <Motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onLeave}
          style={{
            width: "100%",
            padding: "14px",
            border: "1px solid rgba(245,230,200,0.2)",
            borderRadius: 12,
            background: "rgba(245,230,200,0.06)",
            color: COLORS.ink,
            fontSize: 14,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            fontFamily: "inherit",
          }}
        >
          <LogOut size={14} /> 나가기
        </Motion.button>
      </div>
    </div>
  );
}

function RankRow({ rank, player, isMe, isFirst, isSecond, isThird }) {
  const score = player.score || 0;
  const isPositive = score > 0;
  const isZero = score === 0;
  const isNegative = score < 0;

  let bg = "transparent";
  if (isFirst)
    bg = "linear-gradient(135deg, rgba(255,210,63,0.18), transparent)";
  else if (isSecond)
    bg = "linear-gradient(135deg, rgba(192,192,192,0.12), transparent)";
  else if (isThird)
    bg = "linear-gradient(135deg, rgba(205,127,50,0.12), transparent)";

  let medal = null;
  if (rank === 1) medal = "🥇";
  else if (rank === 2) medal = "🥈";
  else if (rank === 3) medal = "🥉";

  const scoreColor = isPositive
    ? isFirst
      ? COLORS.goldBright
      : COLORS.gold
    : isNegative
      ? COLORS.red
      : COLORS.inkMute;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 12px",
        borderRadius: 10,
        background: bg,
        borderTop:
          rank === 1 ? "none" : "1px solid rgba(245,230,200,0.06)",
      }}
    >
      <div
        style={{
          width: 36,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {medal ? (
          <span style={{ fontSize: 28 }}>{medal}</span>
        ) : (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: 15,
              color: COLORS.inkMute,
            }}
          >
            {rank}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 700,
            fontSize: 15,
            color: isMe ? COLORS.pink : COLORS.ink,
          }}
        >
          {player.seat_label} 손님
          {isMe && (
            <span
              style={{
                fontSize: 10,
                marginLeft: 6,
                color: COLORS.pink,
                fontWeight: 800,
              }}
            >
              (나)
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 900,
          fontSize: isFirst ? 28 : 22,
          color: scoreColor,
        }}
      >
        {isPositive && "+"}
        {isZero ? "0" : score}점
      </div>
    </div>
  );
}

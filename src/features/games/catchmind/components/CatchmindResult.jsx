import { motion as Motion } from "framer-motion";
import { Trophy, LogOut, RotateCcw } from "lucide-react";

const COLORS = {
  bgBase: "#1A1410",
  bgCard: "#261E18",
  ink: "#F5E6C8",
  gold: "#FFD23F",
  pink: "#FF6B9D",
  orange: "#FF8552",
  green: "#4ADE80",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
};

/**
 * CatchmindResult
 *
 * 4단계: 최종 결과. 포디움 + 4등 이하 리스트 + 액션
 */
export default function CatchmindResult({
  room,
  sessionId,
  isHost,
  onRestart,
  onLeave,
}) {
  const players = [...(room?.players || [])].sort(
    (a, b) => (b.score || 0) - (a.score || 0),
  );
  const winner = players[0];
  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: COLORS.bgBase,
        color: COLORS.ink,
        fontFamily: "'Plus Jakarta Sans', system-ui",
        padding: "24px 20px",
      }}
    >
      {/* 우승자 헤더 */}
      <Motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          textAlign: "center",
          marginBottom: 24,
        }}
      >
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
            fontSize: 26,
            fontWeight: 900,
            fontFamily: "'Noto Serif KR', serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Trophy size={26} color={COLORS.gold} fill={COLORS.gold} />
          {winner?.seat_label} 손님 우승!
        </div>
      </Motion.div>

      {/* 포디움 (2-1-3 순서) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr 1fr",
          alignItems: "flex-end",
          gap: 8,
          marginBottom: 28,
        }}
      >
        {[top3[1], top3[0], top3[2]].map((p, idx) => {
          if (!p) return <div key={idx} />;
          const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
          const heights = { 1: 130, 2: 100, 3: 80 };
          const color =
            rank === 1 ? COLORS.gold : rank === 2 ? COLORS.silver : COLORS.bronze;
          const isMe = p.session_id === sessionId;
          return (
            <Motion.div
              key={p.session_id}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 + idx * 0.1, duration: 0.4 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isMe ? COLORS.pink : COLORS.ink,
                  marginBottom: 4,
                }}
              >
                {p.seat_label}
                {isMe && (
                  <span style={{ fontSize: 9, marginLeft: 3 }}>(나)</span>
                )}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color,
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: 6,
                }}
              >
                {p.score || 0}
              </div>
              <div
                style={{
                  width: "100%",
                  height: heights[rank],
                  background: `linear-gradient(180deg, ${color}40, ${color}10)`,
                  border: `1px solid ${color}`,
                  borderRadius: "8px 8px 0 0",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  paddingTop: 8,
                  fontSize: 22,
                  fontWeight: 900,
                  color,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {rank}
              </div>
            </Motion.div>
          );
        })}
      </div>

      {/* 4등 이하 */}
      {rest.length > 0 && (
        <div
          style={{
            background: COLORS.bgCard,
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "rgba(245,230,200,0.4)",
              marginBottom: 6,
            }}
          >
            기타 참가자
          </div>
          {rest.map((p, idx) => {
            const isMe = p.session_id === sessionId;
            return (
              <div
                key={p.session_id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "5px 0",
                  fontSize: 13,
                  color: isMe ? COLORS.pink : "rgba(245,230,200,0.7)",
                }}
              >
                <span>
                  {idx + 4}등 · {p.seat_label} 손님
                  {isMe && (
                    <span style={{ fontSize: 10, marginLeft: 4 }}>(나)</span>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                  }}
                >
                  {p.score || 0}
                </span>
              </div>
            );
          })}
        </div>
      )}

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
        <button
          onClick={onLeave}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid rgba(245,230,200,0.15)",
            borderRadius: 12,
            background: "transparent",
            color: "rgba(245,230,200,0.65)",
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

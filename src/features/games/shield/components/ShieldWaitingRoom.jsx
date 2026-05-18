import { motion as Motion } from "framer-motion";
import { Crown, LogOut, Play, Users } from "lucide-react";
import { MAX_PLAYERS, MIN_PLAYERS, TURN_SECONDS } from "../lib/shieldRules";

const COLORS = {
  bgBase: "#0F0E0D",
  bgCard: "#1A1816",
  ink: "#F0E8D8",
  gold: "#C9A66B",
  danger: "#E5443C",
  dangerBright: "#FF5C52",
};

/**
 * ShieldWaitingRoom — 2단계 대기실
 */
export default function ShieldWaitingRoom({
  room,
  isHost,
  sessionId,
  onLeave,
  onStart,
}) {
  const players = room?.players || [];
  const slots = Array.from({ length: MAX_PLAYERS }).map(
    (_, i) => players[i] || null,
  );
  const canStart = isHost && players.length >= MIN_PLAYERS;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: COLORS.bgBase,
        color: COLORS.ink,
        fontFamily: "'Pretendard Variable', 'Pretendard', system-ui",
        padding: "20px 20px 12px",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: COLORS.danger,
            marginBottom: 6,
          }}
        >
          WAITING ROOM
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            fontFamily: "'Noto Serif KR', serif",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          👑 {room?.host_seat_label} 손님의 방
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(240,232,216,0.5)",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Users size={12} /> {players.length}/{MAX_PLAYERS}
          </span>
        </div>
      </div>

      {/* 슬롯 그리드 2×4 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {slots.map((p, idx) => (
          <Slot
            key={idx}
            player={p}
            isHost={p && room?.host_session_id === p.session_id}
            isMe={p && p.session_id === sessionId}
          />
        ))}
      </div>

      {/* 게임 규칙 */}
      <div
        style={{
          background: "rgba(229,68,60,0.06)",
          border: "1px solid rgba(229,68,60,0.18)",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 24,
          fontSize: 12,
          lineHeight: 1.8,
          color: "rgba(240,232,216,0.75)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            color: COLORS.danger,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          게임 규칙
        </div>
        · 차례당 <strong>{TURN_SECONDS}초</strong>, 초성 단어 입으로 외치기
        <br />· PASS 누르면 다음 사람 (시계방향)
        <br />· 시간 초과 → 폭발 💥, 다음 사람 새 초성으로 시작
        <br />· 마지막 1명까지 진행 (토너먼트)
        <br />· 폭발한 사람 벌칙: 데킬라 1잔 🥃
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isHost ? (
          <Motion.button
            whileTap={canStart ? { scale: 0.97 } : undefined}
            onClick={canStart ? onStart : undefined}
            disabled={!canStart}
            style={{
              width: "100%",
              padding: "16px",
              border: "none",
              borderRadius: 14,
              background: canStart
                ? `linear-gradient(135deg, ${COLORS.danger}, #B83328)`
                : "rgba(240,232,216,0.08)",
              color: canStart ? "#fff" : "rgba(240,232,216,0.35)",
              fontWeight: 800,
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: canStart ? "pointer" : "not-allowed",
              boxShadow: canStart
                ? "0 8px 20px rgba(229,68,60,0.35)"
                : "none",
              WebkitTapHighlightColor: "transparent",
              fontFamily: "inherit",
            }}
          >
            <Play size={18} fill="currentColor" /> 게임 시작
          </Motion.button>
        ) : (
          <div
            style={{
              padding: "16px",
              textAlign: "center",
              fontSize: 14,
              color: "rgba(240,232,216,0.55)",
              background: "rgba(240,232,216,0.04)",
              border: "1px solid rgba(240,232,216,0.08)",
              borderRadius: 14,
            }}
          >
            방장이 시작하기를 기다리는 중...
          </div>
        )}

        <button
          onClick={onLeave}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid rgba(240,232,216,0.18)",
            borderRadius: 12,
            background: "transparent",
            color: "rgba(240,232,216,0.6)",
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
          <LogOut size={14} /> 나가기
        </button>
      </div>
    </div>
  );
}

function Slot({ player, isHost, isMe }) {
  if (!player) {
    return (
      <div
        style={{
          aspectRatio: "1 / 0.7",
          border: "2px dashed rgba(240,232,216,0.12)",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(240,232,216,0.25)",
          fontSize: 12,
        }}
      >
        빈 자리
      </div>
    );
  }
  return (
    <Motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        aspectRatio: "1 / 0.7",
        background: isMe
          ? "linear-gradient(135deg, rgba(229,68,60,0.18), rgba(229,68,60,0.05))"
          : COLORS.bgCard,
        border: `1px solid ${
          isMe ? "rgba(229,68,60,0.45)" : "rgba(240,232,216,0.1)"
        }`,
        borderRadius: 12,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: isMe ? COLORS.dangerBright : COLORS.ink,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {isHost && <Crown size={12} color={COLORS.gold} fill={COLORS.gold} />}
        {player.seat_label} 손님
      </div>
      {isMe && (
        <div style={{ fontSize: 10, color: COLORS.dangerBright, fontWeight: 600 }}>
          (나)
        </div>
      )}
    </Motion.div>
  );
}

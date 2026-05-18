import { motion as Motion } from "framer-motion";
import { Crown, LogOut, Play, Users } from "lucide-react";
import { MAX_PLAYERS, MIN_PLAYERS, ROUND_SECONDS } from "../lib/catchmindRules";

const COLORS = {
  bgBase: "#1A1410",
  bgCard: "#261E18",
  ink: "#F5E6C8",
  gold: "#FFD23F",
  pink: "#FF6B9D",
};

/**
 * CatchmindWaitingRoom
 *
 * 2단계: 참여자 슬롯 + 방장 시작 버튼
 */
export default function CatchmindWaitingRoom({
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
        fontFamily: "'Plus Jakarta Sans', system-ui",
        padding: "20px 20px 12px",
      }}
    >
      {/* 헤더 */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: "rgba(255,210,63,0.6)",
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
              color: "rgba(245,230,200,0.5)",
            }}
          >
            <Users size={12} style={{ verticalAlign: "middle" }} />{" "}
            {players.length}/{MAX_PLAYERS}
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
          background: "rgba(255,210,63,0.05)",
          border: "1px solid rgba(255,210,63,0.15)",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 24,
          fontSize: 12,
          lineHeight: 1.8,
          color: "rgba(245,230,200,0.75)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            color: COLORS.gold,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          게임 규칙
        </div>
        · 라운드당 <strong>{ROUND_SECONDS}초</strong>, 참여자 수만큼 라운드
        진행
        <br />· 정답 빨리 맞힐수록 점수 ↑ (50~200점)
        <br />· 출제자는 정답자 1명당 +20점 보너스
        <br />· 출제자 패스: 게임당 1회 (-30점)
        <br />· 글자 수 따라 힌트 자동 공개 (40/25/10초)
      </div>

      <div style={{ flex: 1 }} />

      {/* 하단 버튼 */}
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
                ? `linear-gradient(135deg, ${COLORS.gold}, #E5B82E)`
                : "rgba(245,230,200,0.08)",
              color: canStart ? "#1A1410" : "rgba(245,230,200,0.35)",
              fontWeight: 800,
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: canStart ? "pointer" : "not-allowed",
              boxShadow: canStart
                ? "0 8px 20px rgba(255,210,63,0.3)"
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
              color: "rgba(245,230,200,0.55)",
              background: "rgba(245,230,200,0.04)",
              border: "1px solid rgba(245,230,200,0.08)",
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
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: 12,
            background: "transparent",
            color: "#F87171",
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
          border: "2px dashed rgba(245,230,200,0.12)",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(245,230,200,0.25)",
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
          ? "linear-gradient(135deg, rgba(255,107,157,0.15), rgba(255,107,157,0.05))"
          : COLORS.bgCard,
        border: `1px solid ${
          isMe ? "rgba(255,107,157,0.4)" : "rgba(245,230,200,0.1)"
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
          color: isMe ? COLORS.pink : COLORS.ink,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {isHost && <Crown size={12} color={COLORS.gold} fill={COLORS.gold} />}
        {player.seat_label} 손님
      </div>
      {isMe && (
        <div
          style={{
            fontSize: 10,
            color: COLORS.pink,
            fontWeight: 600,
          }}
        >
          (나)
        </div>
      )}
    </Motion.div>
  );
}

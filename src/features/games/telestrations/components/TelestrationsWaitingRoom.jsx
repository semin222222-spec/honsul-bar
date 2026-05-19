import { motion as Motion } from "framer-motion";
import { LogOut, Play, Users, Crown } from "lucide-react";
import { MIN_PLAYERS, MAX_PLAYERS } from "../lib/telestrationsRules";

/**
 * TelestrationsWaitingRoom
 *   - player 목록 (방장 표시, 내 좌석 강조)
 *   - 방장 only: "시작하기" 버튼
 *   - 모두: "나가기"
 */
export default function TelestrationsWaitingRoom({
  room,
  sessionId,
  isHost,
  onStartGame,
  onLeaveRoom,
  loading,
}) {
  const players = room?.players || [];
  const count = players.length;
  const canStart = isHost && count >= MIN_PLAYERS;

  return (
    <div
      style={{
        padding: "16px clamp(16px, 4vw, 24px) 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: "rgba(176,132,255,0.7)",
            marginBottom: 6,
          }}
        >
          WAITING ROOM
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 300,
            color: "#F5E6C8",
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          {room?.host_seat_label} 님의 방
        </div>
      </div>

      <div
        style={{
          padding: "14px 16px",
          background:
            "linear-gradient(135deg, rgba(176,132,255,0.08), rgba(255,255,255,0.02))",
          border: "1px solid rgba(176,132,255,0.2)",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.7)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Users size={14} />
          {count}/{MAX_PLAYERS}명
        </div>
        <div
          style={{
            fontSize: 11,
            color:
              count >= MIN_PLAYERS
                ? "rgba(122,232,181,0.9)"
                : "rgba(212,165,55,0.7)",
          }}
        >
          {count >= MIN_PLAYERS
            ? "시작 가능!"
            : `최소 ${MIN_PLAYERS}명 필요 (${MIN_PLAYERS - count}명 더)`}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {players.map((p) => {
          const isMe = p.session_id === sessionId;
          const isRoomHost = p.session_id === room?.host_session_id;
          return (
            <div
              key={p.session_id}
              style={{
                padding: "10px 14px",
                background: isMe
                  ? "rgba(212,165,55,0.1)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  isMe
                    ? "rgba(212,165,55,0.35)"
                    : "rgba(255,255,255,0.06)"
                }`,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 13,
                fontFamily: "'Noto Serif KR', serif",
                color: isMe ? "#D4A537" : "#F0E8D8",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                {isRoomHost && (
                  <Crown size={12} style={{ color: "#D4A537" }} />
                )}
                {p.seat_label}
              </span>
              {isMe && (
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(212,165,55,0.8)",
                    letterSpacing: "0.1em",
                  }}
                >
                  나
                </span>
              )}
            </div>
          );
        })}

        {/* 빈 슬롯 표시 */}
        {Array.from({ length: Math.max(0, MIN_PLAYERS - count) }).map(
          (_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                padding: "10px 14px",
                background: "rgba(255,255,255,0.02)",
                border: "1px dashed rgba(255,255,255,0.08)",
                borderRadius: 10,
                fontSize: 12,
                color: "rgba(255,255,255,0.3)",
                fontFamily: "'Noto Serif KR', serif",
                textAlign: "center",
              }}
            >
              빈 자리
            </div>
          ),
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <Motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onLeaveRoom}
          disabled={loading}
          style={{
            flex: 1,
            padding: "12px",
            background: "rgba(226,75,74,0.08)",
            border: "1px solid rgba(226,75,74,0.25)",
            borderRadius: 10,
            color: "rgba(255,180,180,0.85)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <LogOut size={13} /> 나가기
        </Motion.button>

        {isHost && (
          <Motion.button
            whileTap={{ scale: canStart ? 0.97 : 1 }}
            onClick={canStart ? onStartGame : undefined}
            disabled={!canStart || loading}
            style={{
              flex: 2,
              padding: "12px",
              background: canStart
                ? "linear-gradient(135deg, #B084FF, #8c5fdb)"
                : "rgba(255,255,255,0.05)",
              border: canStart
                ? "1px solid rgba(176,132,255,0.6)"
                : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              color: canStart ? "#0F0E0D" : "rgba(255,255,255,0.3)",
              fontSize: 13,
              fontWeight: 700,
              cursor: canStart ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Play size={13} /> 시작하기
          </Motion.button>
        )}

        {!isHost && (
          <div
            style={{
              flex: 2,
              padding: "12px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              color: "rgba(255,255,255,0.5)",
              fontSize: 12,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            방장이 시작하기를 누르길 기다려요
          </div>
        )}
      </div>
    </div>
  );
}

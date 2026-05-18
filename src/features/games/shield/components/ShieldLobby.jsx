import { motion as Motion } from "framer-motion";
import { Plus, Users, Loader2, AlertTriangle } from "lucide-react";
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
 * ShieldLobby — 1단계 로비
 */
export default function ShieldLobby({
  rooms,
  loading,
  onCreate,
  onJoin,
  onCloseGame,
  mySeat,
}) {
  const waitingRooms = rooms.filter((r) => r.status === "waiting");
  const inGameRooms = rooms.filter((r) => r.status === "playing");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: COLORS.bgBase,
        color: COLORS.ink,
        fontFamily: "'Pretendard Variable', 'Pretendard', system-ui",
      }}
    >
      {/* 헤더 */}
      <div style={{ padding: "20px 20px 8px" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: COLORS.danger,
            marginBottom: 6,
          }}
        >
          5초 쉴드
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            fontFamily: "'Noto Serif KR', serif",
            color: COLORS.ink,
            marginBottom: 4,
          }}
        >
          💣 초성 폭탄 돌리기
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(240,232,216,0.5)",
            lineHeight: 1.6,
          }}
        >
          {TURN_SECONDS}초 안에 초성 단어 외치기 · {MIN_PLAYERS}~{MAX_PLAYERS}명
        </div>
      </div>

      {/* 벌칙 경고 */}
      <div style={{ padding: "8px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            background: "rgba(229,68,60,0.08)",
            border: "1px solid rgba(229,68,60,0.3)",
            borderRadius: 12,
            color: COLORS.dangerBright,
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>{TURN_SECONDS}초</strong> 안에 외치지 못하면 폭발 💥
            <span style={{ color: "rgba(255,200,200,0.7)" }}>
              {" "}
              · 벌칙: 데킬라 1잔
            </span>
          </span>
        </div>
      </div>

      {/* 새 방 만들기 */}
      <div style={{ padding: "12px 20px" }}>
        <Motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onCreate}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px 20px",
            border: "none",
            borderRadius: 14,
            background: `linear-gradient(135deg, ${COLORS.danger}, #B83328)`,
            color: "#fff",
            fontWeight: 800,
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: loading ? "wait" : "pointer",
            boxShadow: "0 8px 22px rgba(229,68,60,0.35)",
            WebkitTapHighlightColor: "transparent",
            fontFamily: "inherit",
          }}
        >
          {loading ? (
            <Loader2 size={18} />
          ) : (
            <Plus size={18} strokeWidth={3} />
          )}
          새 방 만들기
        </Motion.button>
      </div>

      {/* 방 목록 */}
      <div style={{ padding: "12px 20px 24px", flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.15em",
            color: "rgba(240,232,216,0.5)",
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>현재 매장의 방 ({rooms.length})</span>
        </div>

        {rooms.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 12px",
              color: "rgba(240,232,216,0.35)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            아직 열린 방이 없어요.
            <br />첫 방을 만들어보세요!
          </div>
        )}

        {waitingRooms.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                color: "#4ADE80",
                marginBottom: 8,
              }}
            >
              모집 중
            </div>
            {waitingRooms.map((r) => (
              <RoomCard
                key={r.id}
                room={r}
                onJoin={onJoin}
                disabled={loading}
                mySeat={mySeat}
              />
            ))}
          </div>
        )}

        {inGameRooms.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                color: "rgba(240,232,216,0.4)",
                marginBottom: 8,
              }}
            >
              게임 중
            </div>
            {inGameRooms.map((r) => (
              <RoomCard
                key={r.id}
                room={r}
                onJoin={onJoin}
                disabled
                mySeat={mySeat}
              />
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          padding: "12px 20px 20px",
          borderTop: "1px solid rgba(240,232,216,0.06)",
        }}
      >
        <button
          onClick={onCloseGame}
          style={{
            width: "100%",
            padding: "12px",
            background: "transparent",
            border: "1px solid rgba(240,232,216,0.15)",
            borderRadius: 12,
            color: "rgba(240,232,216,0.55)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}

function RoomCard({ room, onJoin, disabled, mySeat }) {
  const players = room.players || [];
  const full = players.length >= MAX_PLAYERS;
  const inGame = room.status !== "waiting";
  const imIn = !!mySeat && players.some((p) => p.seat_label === mySeat);
  const clickable = !disabled && (imIn || (!inGame && !full));

  return (
    <Motion.div
      whileTap={clickable ? { scale: 0.98 } : undefined}
      onClick={() => clickable && onJoin(room.id)}
      style={{
        background: imIn
          ? "linear-gradient(135deg, rgba(229,68,60,0.15), rgba(229,68,60,0.04))"
          : COLORS.bgCard,
        border: imIn
          ? "1px solid rgba(229,68,60,0.45)"
          : "1px solid rgba(240,232,216,0.08)",
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 10,
        cursor: clickable ? "pointer" : "default",
        opacity: inGame && !imIn ? 0.45 : 1,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>
          👑 {room.host_seat_label} 손님의 방
        </div>
        <div
          style={{
            fontSize: 11,
            color: full ? COLORS.danger : "#4ADE80",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Users size={11} /> {players.length}/{MAX_PLAYERS}
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(240,232,216,0.5)",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        {players.map((p) => (
          <span
            key={p.session_id}
            style={{
              padding: "2px 8px",
              borderRadius: 999,
              background:
                p.seat_label === mySeat
                  ? "rgba(229,68,60,0.2)"
                  : "rgba(240,232,216,0.08)",
              color: p.seat_label === mySeat ? COLORS.dangerBright : "inherit",
            }}
          >
            {p.seat_label}
          </span>
        ))}
      </div>
      {imIn && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: COLORS.dangerBright,
            fontWeight: 700,
            textAlign: "right",
          }}
        >
          내 방 · 다시 들어가기 →
        </div>
      )}
      {!imIn && !inGame && !full && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: COLORS.gold,
            fontWeight: 600,
            textAlign: "right",
          }}
        >
          입장하기 →
        </div>
      )}
      {!imIn && full && !inGame && (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: COLORS.danger,
            textAlign: "right",
          }}
        >
          정원 마감
        </div>
      )}
      {!imIn && inGame && (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: "rgba(240,232,216,0.4)",
            textAlign: "right",
          }}
        >
          게임 진행 중
        </div>
      )}
    </Motion.div>
  );
}

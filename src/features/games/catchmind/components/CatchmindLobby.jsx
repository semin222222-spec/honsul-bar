import { motion as Motion } from "framer-motion";
import { Plus, Users, Loader2 } from "lucide-react";
import { MAX_PLAYERS, MIN_PLAYERS } from "../lib/catchmindRules";

const COLORS = {
  bgBase: "#1A1410",
  bgCard: "#261E18",
  ink: "#F5E6C8",
  gold: "#FFD23F",
  pink: "#FF6B9D",
  orange: "#FF8552",
  green: "#4ADE80",
  red: "#F87171",
};

/**
 * CatchmindLobby
 *
 * 1단계: 매장의 활성 방 목록 + "새 방 만들기"
 */
export default function CatchmindLobby({
  rooms,
  loading,
  onCreate,
  onJoin,
  onCloseGame,
  mySeat,
}) {
  const waitingRooms = rooms.filter((r) => r.status === "waiting");
  const inGameRooms = rooms.filter((r) =>
    ["playing", "transition", "countdown"].includes(r.status),
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: COLORS.bgBase,
        color: COLORS.ink,
        fontFamily: "'Plus Jakarta Sans', system-ui",
      }}
    >
      {/* 헤더 */}
      <div style={{ padding: "20px 20px 8px" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: "rgba(255,210,63,0.6)",
            marginBottom: 6,
          }}
        >
          CATCH MIND
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
          🎨 캐치마인드
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(245,230,200,0.5)",
            lineHeight: 1.6,
          }}
        >
          그림 그리고 단어 맞히기 · {MIN_PLAYERS}~{MAX_PLAYERS}명 · 80초/라운드
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
            background: `linear-gradient(135deg, ${COLORS.gold}, #E5B82E)`,
            color: "#1A1410",
            fontWeight: 800,
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: loading ? "wait" : "pointer",
            boxShadow: "0 8px 20px rgba(255,210,63,0.3)",
            WebkitTapHighlightColor: "transparent",
            fontFamily: "inherit",
          }}
        >
          {loading ? (
            <Loader2 size={18} className="spin" />
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
            color: "rgba(245,230,200,0.5)",
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
              color: "rgba(245,230,200,0.35)",
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
                color: COLORS.green,
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
                color: "rgba(245,230,200,0.4)",
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

      {/* 닫기 */}
      <div
        style={{
          padding: "12px 20px 20px",
          borderTop: "1px solid rgba(245,230,200,0.06)",
        }}
      >
        <button
          onClick={onCloseGame}
          style={{
            width: "100%",
            padding: "12px",
            background: "transparent",
            border: "1px solid rgba(245,230,200,0.15)",
            borderRadius: 12,
            color: "rgba(245,230,200,0.55)",
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
  // 내 좌석이 이 방에 있으면 진행 중이어도 재참여 가능 (새로고침 복구)
  const imIn = !!mySeat && players.some((p) => p.seat_label === mySeat);
  const clickable = !disabled && (imIn || (!inGame && !full));
  return (
    <Motion.div
      whileTap={clickable ? { scale: 0.98 } : undefined}
      onClick={() => clickable && onJoin(room.id)}
      style={{
        background: imIn
          ? "linear-gradient(135deg, rgba(255,107,157,0.12), rgba(255,107,157,0.04))"
          : COLORS.bgCard,
        border: imIn
          ? "1px solid rgba(255,107,157,0.4)"
          : "1px solid rgba(245,230,200,0.08)",
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
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: COLORS.ink,
          }}
        >
          👑 {room.host_seat_label} 손님의 방
        </div>
        <div
          style={{
            fontSize: 11,
            color: full ? COLORS.red : COLORS.green,
            fontWeight: 600,
          }}
        >
          <Users size={11} style={{ verticalAlign: "middle" }} />{" "}
          {players.length}/{MAX_PLAYERS}
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(245,230,200,0.5)",
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
                  ? "rgba(255,107,157,0.2)"
                  : "rgba(245,230,200,0.08)",
              color: p.seat_label === mySeat ? COLORS.pink : "inherit",
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
            color: COLORS.pink,
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
            color: COLORS.red,
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
            color: "rgba(245,230,200,0.4)",
            textAlign: "right",
          }}
        >
          게임 진행 중
        </div>
      )}
    </Motion.div>
  );
}

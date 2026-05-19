import { motion as Motion } from "framer-motion";
import { Plus, Users, Clock } from "lucide-react";
import { MIN_PLAYERS, MAX_PLAYERS } from "../lib/telestrationsRules";

/**
 * TelestrationsLobby
 *   - 활성 방 목록 표시
 *   - "새 방 만들기" 버튼
 *   - 빈 상태 안내
 */
export default function TelestrationsLobby({
  rooms,
  onCreateRoom,
  onJoinRoom,
  loading,
}) {
  const waitingRooms = (rooms || []).filter((r) => r.status === "waiting");
  const playingRooms = (rooms || []).filter(
    (r) => r.status === "word_reveal" || r.status === "playing",
  );

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
          TELESTRATIONS
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 300,
            color: "#F5E6C8",
            fontFamily: "'Noto Serif KR', serif",
            marginBottom: 4,
          }}
        >
          그림 전화기
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.5,
          }}
        >
          {MIN_PLAYERS}~{MAX_PLAYERS}명이서 그림을 돌려가며 한 줄로 이어가요.
          내 단어가 끝에는 어떻게 변할까?
        </div>
      </div>

      <Motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onCreateRoom}
        disabled={loading}
        style={{
          padding: "16px",
          background:
            "linear-gradient(135deg, rgba(176,132,255,0.18), rgba(122,232,181,0.12))",
          border: "1px solid rgba(176,132,255,0.4)",
          borderRadius: 14,
          color: "#F0E8D8",
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Plus size={18} /> 새 방 만들기
      </Motion.button>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.15em",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          모집 중인 방
        </div>

        {waitingRooms.length === 0 && playingRooms.length === 0 && (
          <div
            style={{
              padding: 24,
              background: "rgba(255,255,255,0.03)",
              border: "1px dashed rgba(255,255,255,0.08)",
              borderRadius: 12,
              textAlign: "center",
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            아직 모집 중인 방이 없어요. 새 방을 만들어보세요!
          </div>
        )}

        {waitingRooms.map((room) => {
          const count = (room.players || []).length;
          const full = count >= MAX_PLAYERS;
          return (
            <Motion.button
              key={room.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => !full && onJoinRoom(room.id)}
              disabled={full || loading}
              style={{
                padding: "14px 16px",
                background: "rgba(20,18,14,0.6)",
                border: "1px solid rgba(212,165,55,0.25)",
                borderRadius: 12,
                color: "#F0E8D8",
                cursor: full || loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: full ? 0.5 : 1,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "'Noto Serif KR', serif",
                  }}
                >
                  {room.host_seat_label} 님의 방
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.5)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Users size={11} /> {count}/{MAX_PLAYERS}명
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: full
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(176,132,255,0.18)",
                  color: full ? "rgba(255,255,255,0.4)" : "#B084FF",
                  border: full
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "1px solid rgba(176,132,255,0.35)",
                }}
              >
                {full ? "정원 마감" : "참여하기"}
              </div>
            </Motion.button>
          );
        })}

        {playingRooms.length > 0 && (
          <>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.15em",
                color: "rgba(255,255,255,0.3)",
                marginTop: 8,
              }}
            >
              진행 중
            </div>
            {playingRooms.map((room) => (
              <div
                key={room.id}
                style={{
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <span>
                  {room.host_seat_label} 님의 방 · {room.players?.length ?? 0}명
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    color: "rgba(122,232,181,0.7)",
                  }}
                >
                  <Clock size={11} /> 진행 중
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

import { motion as Motion } from "framer-motion";
import { Plus, Users, LogIn } from "lucide-react";
import { C, FONTS } from "./dripBattleTheme";
import { MAX_PLAYERS, MIN_PLAYERS } from "../lib/dripBattleRules";

/**
 * DripBattleLobby — 방 목록 + 방 만들기 (매장 스코프, 방코드 없음)
 *  라이어/캐치마인드 로비와 동일한 발견 방식.
 */
export default function DripBattleLobby({
  rooms = [],
  loading,
  onCreate,
  onJoin,
  mySeat,
}) {
  const openRooms = rooms.filter((r) => r.status === "waiting");
  const liveRooms = rooms.filter((r) => r.status !== "waiting");

  return (
    <div
      style={{
        minHeight: "100%",
        background: C.bgDeep,
        color: C.ink,
        fontFamily: FONTS.body,
        padding: "max(24px, env(safe-area-inset-top)) 20px 24px",
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 20% 10%, rgba(255,107,53,0.06), transparent), radial-gradient(ellipse 60% 40% at 80% 90%, rgba(255,182,39,0.05), transparent)",
      }}
    >
      {/* 헤더 */}
      <div style={{ textAlign: "center", padding: "8px 0 18px" }}>
        <span
          style={{
            display: "inline-block",
            padding: "3px 10px",
            border: `1px solid ${C.gold}`,
            borderRadius: 100,
            fontSize: 10,
            letterSpacing: "0.2em",
            color: C.gold,
            marginBottom: 10,
          }}
        >
          단체 게임
        </span>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 48,
            letterSpacing: "0.08em",
            lineHeight: 1,
            background: `linear-gradient(135deg, ${C.goldSoft}, ${C.orangeDeep})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: C.gold,
            marginBottom: 6,
          }}
        >
          DRIP BATTLE
        </div>
        <div style={{ fontSize: 12, color: C.sub }}>
          {MIN_PLAYERS}~{MAX_PLAYERS}명 · 빈칸을 가장 웃기게 채우기
        </div>
      </div>

      {/* 방 만들기 */}
      <Motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onCreate}
        disabled={loading}
        style={{
          width: "100%",
          background: `linear-gradient(135deg, ${C.goldSoft}, ${C.orangeDeep})`,
          border: "none",
          color: "#1a0f00",
          fontWeight: 900,
          fontSize: 16,
          padding: 16,
          borderRadius: 14,
          cursor: loading ? "wait" : "pointer",
          letterSpacing: "0.04em",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: `0 10px 30px -10px ${C.goldGlow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
          fontFamily: "inherit",
          WebkitTapHighlightColor: "transparent",
          minHeight: 52,
        }}
      >
        <Plus size={18} strokeWidth={3} />
        {mySeat ? `${mySeat} 자리로 방 만들기` : "방 만들기"}
      </Motion.button>

      {/* 열린 방 목록 */}
      <div style={{ marginTop: 22 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: C.sub,
            }}
          >
            모집 중인 방
          </span>
          <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.gold }}>
            {openRooms.length}
          </span>
        </div>

        {openRooms.length === 0 && liveRooms.length === 0 && (
          <div
            style={{
              padding: "28px 16px",
              textAlign: "center",
              fontSize: 13,
              color: C.muted,
              background: C.bgCard,
              border: `1px dashed ${C.borderBright}`,
              borderRadius: 14,
              lineHeight: 1.6,
            }}
          >
            아직 열린 방이 없어요.
            <br />
            위에서 방을 만들어 친구들을 모아보세요!
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {openRooms.map((r) => {
            const count = (r.players || []).length;
            const full = count >= MAX_PLAYERS;
            return (
              <Motion.div
                key={r.id}
                whileTap={{ scale: full ? 1 : 0.98 }}
                onClick={() => !full && onJoin(r.id)}
                style={{
                  background: `linear-gradient(135deg, ${C.bgCard}, rgba(255,182,39,0.05))`,
                  border: `1px solid rgba(255,182,39,0.25)`,
                  borderRadius: 14,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: full ? "not-allowed" : "pointer",
                  opacity: full ? 0.5 : 1,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    🎤 {r.host_seat_label} 자리의 방
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.sub,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 2,
                    }}
                  >
                    <Users size={11} />
                    {count}/{MAX_PLAYERS}명 모집 중
                  </div>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: full ? "rgba(255,255,255,0.06)" : C.gold,
                    color: full ? C.muted : "#1a0f00",
                    fontSize: 12,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {full ? (
                    "가득 참"
                  ) : (
                    <>
                      <LogIn size={13} strokeWidth={2.5} /> 입장
                    </>
                  )}
                </span>
              </Motion.div>
            );
          })}

          {liveRooms.map((r) => (
            <div
              key={r.id}
              style={{
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: 0.55,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  🎤 {r.host_seat_label} 자리의 방
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  게임 진행 중
                </div>
              </div>
              <span
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  color: C.muted,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                진행 중
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: 22,
          padding: "12px 14px",
          background: "rgba(255,182,39,0.06)",
          border: "1px solid rgba(255,182,39,0.15)",
          borderRadius: 12,
          fontSize: 11,
          color: C.sub,
          lineHeight: 1.7,
          textAlign: "center",
        }}
      >
        같은 매장 손님끼리 즐기는 게임이에요. 한 명이 방을 만들면
        <br />
        나머지는 이 화면에서 바로 입장할 수 있어요.
      </div>
    </div>
  );
}

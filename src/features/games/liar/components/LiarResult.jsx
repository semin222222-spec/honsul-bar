import { motion as Motion } from "framer-motion";
import { LogOut, RotateCw } from "lucide-react";

const COLORS = {
  bgBase: "#0F0E0D",
  bgCard: "#1A1816",
  ink: "#F0E8D8",
  gold: "#C9A66B",
  liar: "#9D7AE0",
  liarBright: "#B395E8",
  citizen: "#6FBF7F",
  citizenBright: "#8FD49F",
};

/**
 * LiarResult — 8단계 최종 결과
 *
 *  - 시민 승리: 그린+골드
 *  - 라이어 승리: 보라+골드
 *  - 30초 자동 만료 → onLeave
 *  - 한 판 더 / 로비로 나가기
 */
export default function LiarResult({
  room,
  sessionId,
  isHost,
  onRestart,
  onLeave,
  dismissLeftMs,
}) {
  const players = room?.players || [];
  const result = room?.vote_result || {};
  const liarSessionId = room?.liar_session_id;
  const liar = players.find((p) => p.session_id === liarSessionId);
  const citizenWin = !!result.citizen_win;
  const isTie = !!result.is_tie;

  const accent = citizenWin ? COLORS.citizen : COLORS.liar;
  const accentBright = citizenWin ? COLORS.citizenBright : COLORS.liarBright;

  const seconds = dismissLeftMs != null ? Math.ceil(dismissLeftMs / 1000) : 30;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: COLORS.bgBase,
        color: COLORS.ink,
        fontFamily: "'Pretendard Variable', 'Pretendard', system-ui",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 배경 글로우 */}
      <Motion.div
        animate={{ opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 30%, ${accent}33, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      {/* 헤더 */}
      <div
        style={{
          padding: "32px 20px 12px",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14 }}
          style={{
            fontSize: 64,
            marginBottom: 8,
            filter: `drop-shadow(0 0 24px ${accent}99)`,
          }}
        >
          {citizenWin ? "🎉" : "🎭"}
        </Motion.div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.25em",
            color: accent,
            marginBottom: 6,
          }}
        >
          GAME OVER
        </div>
        <div
          style={{
            fontSize: 28,
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 900,
            background: `linear-gradient(135deg, ${accentBright}, ${COLORS.gold})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: accentBright,
            marginBottom: 10,
          }}
        >
          {citizenWin ? "시민 승리!" : "라이어 승리!"}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "rgba(240,232,216,0.65)",
            lineHeight: 1.5,
            padding: "0 12px",
          }}
        >
          {citizenWin && liar
            ? `라이어 ${liar.seat_label} 손님을 잡았어요!`
            : isTie
              ? `투표가 갈렸어요. ${liar?.seat_label || "—"} 손님이 라이어였어요!`
              : `${liar?.seat_label || "—"} 손님이 라이어였어요!`}
        </div>
      </div>

      {/* 진실 공개 박스 */}
      <div style={{ padding: "16px 20px", position: "relative", zIndex: 1 }}>
        <div
          style={{
            background: COLORS.bgCard,
            border: `1px solid ${accent}40`,
            borderRadius: 14,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.25em",
              color: "rgba(240,232,216,0.5)",
              marginBottom: 10,
            }}
          >
            진실 공개
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              paddingBottom: 10,
              borderBottom: "1px solid rgba(240,232,216,0.06)",
            }}
          >
            <div style={{ fontSize: 12, color: "rgba(240,232,216,0.6)" }}>
              라이어
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: COLORS.liarBright,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              🎭 {liar?.seat_label || "—"} 손님
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 12, color: "rgba(240,232,216,0.6)" }}>
              정답 단어
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: COLORS.gold,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              {room?.answer_word || "—"}
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  color: "rgba(240,232,216,0.5)",
                  fontWeight: 500,
                }}
              >
                · {room?.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 투표 결과 */}
      <div style={{ padding: "0 20px 12px", position: "relative", zIndex: 1 }}>
        <div
          style={{
            background: "rgba(240,232,216,0.03)",
            border: "1px solid rgba(240,232,216,0.06)",
            borderRadius: 12,
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.25em",
              color: "rgba(240,232,216,0.5)",
              marginBottom: 8,
            }}
          >
            투표 결과
          </div>
          {players.map((p) => {
            const votes = result.vote_count?.[p.session_id] || 0;
            const accused = result.accused_session_id === p.session_id;
            return (
              <div
                key={p.session_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  fontSize: 13,
                  color: accused
                    ? COLORS.liarBright
                    : "rgba(240,232,216,0.75)",
                  fontWeight: accused ? 700 : 500,
                }}
              >
                <span>
                  {p.seat_label}
                  {p.session_id === liarSessionId && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: "rgba(157,122,224,0.18)",
                        color: COLORS.liarBright,
                        letterSpacing: "0.1em",
                      }}
                    >
                      LIAR
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {votes}표
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 벌칙 */}
      <div style={{ padding: "0 20px 16px", position: "relative", zIndex: 1 }}>
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            background: `linear-gradient(135deg, ${accent}22, ${accent}08)`,
            border: `1px solid ${accent}44`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 32 }}>🥃</div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                color: accent,
                marginBottom: 2,
              }}
            >
              벌칙
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: COLORS.ink,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              데킬라 1잔
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(240,232,216,0.6)",
                marginTop: 2,
              }}
            >
              대상:{" "}
              {citizenWin
                ? `라이어 ${liar?.seat_label || ""}`
                : "시민 전원"}
            </div>
          </div>
        </div>
      </div>

      {/* 자동 만료 안내 */}
      <div
        style={{
          padding: "0 20px 8px",
          fontSize: 11,
          color: "rgba(240,232,216,0.4)",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {seconds}초 후 자동으로 로비로 이동
      </div>

      {/* 버튼 */}
      <div
        style={{
          padding: "12px 20px",
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
          display: "flex",
          gap: 10,
          position: "relative",
          zIndex: 1,
        }}
      >
        <button
          onClick={onLeave}
          style={{
            flex: 1,
            padding: "14px 18px",
            background: "transparent",
            border: "1px solid rgba(240,232,216,0.15)",
            borderRadius: 12,
            color: "rgba(240,232,216,0.7)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
            minHeight: 48,
          }}
        >
          <LogOut size={14} />
          로비로 나가기
        </button>
        {isHost && (
          <Motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onRestart}
            style={{
              flex: 1.2,
              padding: "14px 18px",
              border: "none",
              borderRadius: 12,
              background: `linear-gradient(135deg, ${COLORS.gold}, #B8902F)`,
              color: "#0D0B08",
              fontWeight: 800,
              fontSize: 14,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
              boxShadow: "0 8px 22px rgba(201,166,107,0.35)",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
              minHeight: 48,
            }}
          >
            <RotateCw size={14} strokeWidth={3} />
            한 판 더!
          </Motion.button>
        )}
      </div>
    </div>
  );
}

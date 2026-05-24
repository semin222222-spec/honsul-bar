import { motion as Motion } from "framer-motion";
import { LogOut } from "lucide-react";

const COLORS = {
  bgBase: "#0F0E0D",
  bgCard: "#1A1816",
  ink: "#F0E8D8",
  gold: "#C9A66B",
  liar: "#9D7AE0",
  liarBright: "#B395E8",
};

/**
 * LiarResult — 8단계 정답 공개 (단순화 V2)
 *
 *  - 라이어 좌석 + 정답 단어만 표시
 *  - 30초 자동 만료 → onLeave
 *  - 나가기 버튼만
 */
export default function LiarResult({ room, onLeave, dismissLeftMs }) {
  const players = room?.players || [];
  const liarSessionId = room?.liar_session_id;
  const liar = players.find((p) => p.session_id === liarSessionId);
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
        animate={{ opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 30%, ${COLORS.liar}33, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      {/* 메인 콘텐츠 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14 }}
          style={{
            fontSize: 72,
            marginBottom: 16,
            filter: `drop-shadow(0 0 24px ${COLORS.liar}99)`,
          }}
        >
          📢
        </Motion.div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.25em",
            color: COLORS.liar,
            marginBottom: 6,
          }}
        >
          LIAR · REVEAL
        </div>
        <div
          style={{
            fontSize: 28,
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 900,
            background: `linear-gradient(135deg, ${COLORS.liarBright}, ${COLORS.gold})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: COLORS.liarBright,
            marginBottom: 24,
          }}
        >
          정답 공개
        </div>

        {/* 진실 공개 박스 */}
        <div
          style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.liar}40`,
            borderRadius: 14,
            padding: "18px 20px",
            width: "100%",
            maxWidth: 320,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
              paddingBottom: 12,
              borderBottom: "1px solid rgba(240,232,216,0.06)",
            }}
          >
            <div style={{ fontSize: 12, color: "rgba(240,232,216,0.6)" }}>
              🎭 라이어
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: COLORS.liarBright,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              {liar?.seat_label || "—"} 손님
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
              📝 정답 단어
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: COLORS.gold,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              {room?.answer_word || "—"}
              {room?.category && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    color: "rgba(240,232,216,0.5)",
                    fontWeight: 500,
                  }}
                >
                  · {room.category}
                </span>
              )}
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
        {seconds}초 후 자동으로 종료
      </div>

      {/* 나가기 */}
      <div
        style={{
          padding: "12px 20px",
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onLeave}
          style={{
            width: "100%",
            padding: "16px 18px",
            border: "none",
            borderRadius: 14,
            background: `linear-gradient(135deg, ${COLORS.gold}, #B8902F)`,
            color: "#0D0B08",
            fontSize: 15,
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            boxShadow: "0 8px 22px rgba(201,166,107,0.35)",
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
            minHeight: 52,
          }}
        >
          <LogOut size={16} strokeWidth={2.5} />
          나가기
        </Motion.button>
      </div>
    </div>
  );
}

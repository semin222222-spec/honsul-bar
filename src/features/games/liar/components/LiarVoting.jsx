import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { LogOut, Eye } from "lucide-react";

const COLORS = {
  bgBase: "#0F0E0D",
  ink: "#F0E8D8",
  gold: "#C9A66B",
  liar: "#9D7AE0",
  liarBright: "#B395E8",
};

/**
 * LiarVoting — 7단계 (오프라인 투표 안내)
 *
 * 앱 투표 제거. 술자리에서 손가락으로 가리키는 게 자연스러움.
 * "정답 공개" 버튼 → 결과 화면, "나가기" 버튼 → 즉시 leave.
 */
export default function LiarVoting({ room, onReveal, onLeave }) {
  const [revealing, setRevealing] = useState(false);

  const players = room?.players || [];

  const handleReveal = async () => {
    if (revealing) return;
    setRevealing(true);
    const res = await onReveal?.();
    if (!res?.ok && res?.error) {
      setRevealing(false);
      alert(res.error);
    }
    // 성공 시 status가 finished로 바뀌면서 화면 자체가 갈아끼워짐
  };

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
        animate={{ opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 40%, rgba(157,122,224,0.18), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
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
            fontSize: 80,
            marginBottom: 24,
            filter: "drop-shadow(0 0 28px rgba(157,122,224,0.55))",
          }}
        >
          🗳️
        </Motion.div>

        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.25em",
            color: COLORS.liar,
            marginBottom: 6,
          }}
        >
          LIAR · VOTE TIME
        </div>
        <div
          style={{
            fontSize: 30,
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 900,
            background: `linear-gradient(135deg, ${COLORS.liarBright}, ${COLORS.gold})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: COLORS.liarBright,
            marginBottom: 18,
            lineHeight: 1.2,
          }}
        >
          투표 시간입니다
        </div>

        <div
          style={{
            fontSize: 15,
            color: "rgba(240,232,216,0.75)",
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          다 같이{" "}
          <strong
            style={{
              color: COLORS.liar,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 20,
            }}
          >
            3, 2, 1!
          </strong>{" "}
          외치고
          <br />
          라이어라고 생각하는 사람을
          <br />
          <strong style={{ color: COLORS.gold }}>손가락으로 가리키세요</strong>
        </div>

        {/* 참여자 좌석 표시 (참고용) */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            justifyContent: "center",
            marginBottom: 8,
            maxWidth: 320,
          }}
        >
          {players.map((p) => (
            <span
              key={p.session_id}
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                background: "rgba(240,232,216,0.06)",
                border: "1px solid rgba(240,232,216,0.1)",
                color: "rgba(240,232,216,0.7)",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {p.seat_label}
            </span>
          ))}
        </div>
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
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
            minHeight: 48,
          }}
        >
          <LogOut size={14} />
          나가기
        </button>
        <Motion.button
          whileTap={{ scale: revealing ? 1 : 0.97 }}
          onClick={handleReveal}
          disabled={revealing}
          style={{
            flex: 1.4,
            padding: "14px 18px",
            border: "none",
            borderRadius: 12,
            background: `linear-gradient(135deg, ${COLORS.liar}, #7A56C9)`,
            color: "#fff",
            fontSize: 14,
            fontWeight: 800,
            cursor: revealing ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            boxShadow: `0 8px 22px ${COLORS.liar}55`,
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
            minHeight: 48,
          }}
        >
          <Eye size={14} strokeWidth={2.5} />
          정답 공개
        </Motion.button>
      </div>
    </div>
  );
}

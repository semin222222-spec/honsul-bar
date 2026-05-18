import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { Check, Eye, EyeOff } from "lucide-react";

const COLORS = {
  bgBase: "#0F0E0D",
  ink: "#F0E8D8",
  gold: "#C9A66B",
  liar: "#9D7AE0",
  liarBright: "#B395E8",
  citizen: "#6FBF7F",
  citizenBright: "#8FD49F",
};

/**
 * LiarWordReveal — 3~4단계
 *
 * 내 role에 따라 분기:
 *  - 시민: 그린 톤 + 정답 단어
 *  - 라이어: 보라 톤 + "???"
 *
 * 옆 사람한테 안 보이게 — "탭해서 확인" 게이트 유지.
 */
export default function LiarWordReveal({
  room,
  sessionId,
  onConfirm,
}) {
  const [revealed, setRevealed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const players = room?.players || [];
  const me = players.find((p) => p.session_id === sessionId);
  const isLiar = me?.role === "liar";
  const confirmedCount = players.filter((p) => p.word_confirmed).length;
  const total = players.length;

  const accent = isLiar ? COLORS.liar : COLORS.citizen;
  const accentBright = isLiar ? COLORS.liarBright : COLORS.citizenBright;

  const handleConfirm = async () => {
    if (confirming || me?.word_confirmed) return;
    setConfirming(true);
    const res = await onConfirm();
    setConfirming(false);
    if (!res?.ok && res?.error) alert(res.error);
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
      }}
    >
      {/* 헤더 */}
      <div style={{ padding: "20px 20px 0", textAlign: "center" }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.25em",
            color: accent,
            marginBottom: 4,
          }}
        >
          {isLiar ? "YOU ARE THE LIAR" : "YOU ARE A CITIZEN"}
        </div>
        <div
          style={{
            fontSize: 18,
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 700,
            color: COLORS.ink,
          }}
        >
          {isLiar ? "🎭 라이어" : "👥 시민"}
          <span
            style={{
              fontSize: 13,
              color: "rgba(240,232,216,0.5)",
              fontWeight: 500,
              marginLeft: 6,
            }}
          >
            · 카테고리: {room?.category || "—"}
          </span>
        </div>
      </div>

      {/* 단어 카드 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Motion.div
          onClick={() => setRevealed((v) => !v)}
          whileTap={{ scale: 0.98 }}
          style={{
            width: "100%",
            maxWidth: 320,
            aspectRatio: "5/4",
            borderRadius: 20,
            border: `2px solid ${accent}`,
            background: revealed
              ? isLiar
                ? "linear-gradient(135deg, rgba(157,122,224,0.18), rgba(157,122,224,0.04))"
                : "linear-gradient(135deg, rgba(111,191,127,0.18), rgba(111,191,127,0.04))"
              : "rgba(240,232,216,0.03)",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            WebkitTapHighlightColor: "transparent",
            boxShadow: revealed ? `0 12px 40px rgba(0,0,0,0.4)` : "none",
          }}
        >
          {!revealed ? (
            <>
              <Eye size={32} color={accent} />
              <div
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  color: accentBright,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                탭해서 단어 확인
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "rgba(240,232,216,0.5)",
                  textAlign: "center",
                  padding: "0 20px",
                  lineHeight: 1.5,
                }}
              >
                옆 사람한테 안 보이게
                <br />혼자만 확인해주세요
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  color: accent,
                  marginBottom: 12,
                }}
              >
                {isLiar ? "당신의 역할" : "정답 단어"}
              </div>
              {isLiar ? (
                <>
                  <div
                    style={{
                      fontSize: 28,
                      fontFamily: "'Noto Serif KR', serif",
                      fontWeight: 900,
                      color: accentBright,
                      letterSpacing: "0.02em",
                      textShadow: `0 4px 24px ${accent}66`,
                      lineHeight: 1.2,
                      padding: "0 16px",
                      textAlign: "center",
                    }}
                  >
                    🎭 라이어 입니다
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 12,
                      color: "rgba(220,200,255,0.7)",
                      lineHeight: 1.5,
                      padding: "0 24px",
                      textAlign: "center",
                    }}
                  >
                    다른 사람 설명 듣고
                    <br />
                    들키지 마세요!
                  </div>
                </>
              ) : (
                <div
                  style={{
                    fontSize: 36,
                    fontFamily: "'Noto Serif KR', serif",
                    fontWeight: 900,
                    color: accentBright,
                    letterSpacing: "0.02em",
                    textShadow: `0 4px 24px ${accent}66`,
                    lineHeight: 1.1,
                    padding: "0 16px",
                    textAlign: "center",
                  }}
                >
                  {room?.answer_word || "—"}
                </div>
              )}
              <div
                style={{
                  marginTop: 14,
                  fontSize: 11,
                  color: "rgba(240,232,216,0.5)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <EyeOff size={11} /> 다시 탭하면 가려져요
              </div>
            </>
          )}
        </Motion.div>
      </div>

      {/* 안내 */}
      <div style={{ padding: "0 20px 12px", textAlign: "center" }}>
        <div
          style={{
            fontSize: 12,
            color: "rgba(240,232,216,0.55)",
            lineHeight: 1.6,
          }}
        >
          {isLiar
            ? "정답을 모릅니다. 시민인 척 설명을 듣고 단어를 추리하세요."
            : "라이어가 누군지 모릅니다. 설명을 들으며 어색한 사람을 찾아내세요."}
        </div>
      </div>

      {/* 확인 버튼 */}
      <div
        style={{
          padding: "12px 20px",
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "rgba(240,232,216,0.45)",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          확인 완료: <strong style={{ color: accentBright }}>{confirmedCount}</strong>
          /{total}명
        </div>
        <Motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleConfirm}
          disabled={me?.word_confirmed || confirming}
          style={{
            width: "100%",
            padding: "16px 18px",
            border: "none",
            borderRadius: 14,
            background: me?.word_confirmed
              ? "rgba(240,232,216,0.08)"
              : `linear-gradient(135deg, ${accent}, ${isLiar ? "#7A56C9" : "#4DAA61"})`,
            color: me?.word_confirmed ? "rgba(240,232,216,0.5)" : "#fff",
            fontWeight: 800,
            fontSize: 15,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: me?.word_confirmed ? "default" : "pointer",
            boxShadow: me?.word_confirmed
              ? "none"
              : `0 8px 22px ${accent}55`,
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
            minHeight: 52,
          }}
        >
          <Check size={16} />
          {me?.word_confirmed ? "확인 완료 · 다른 사람 대기 중" : "확인 · 게임 시작"}
        </Motion.button>
      </div>
    </div>
  );
}

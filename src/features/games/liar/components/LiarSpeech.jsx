import { motion as Motion } from "framer-motion";
import { Check, MessageCircle } from "lucide-react";
import {
  SPEECH_SECONDS,
  TOTAL_LAPS,
  getCurrentLap,
} from "../lib/liarRules";

const COLORS = {
  bgBase: "#0F0E0D",
  bgCard: "#1A1816",
  ink: "#F0E8D8",
  gold: "#C9A66B",
  liar: "#9D7AE0",
  liarBright: "#B395E8",
  citizen: "#6FBF7F",
  danger: "#E5443C",
};

/**
 * LiarSpeech — 5~6단계 설명 턴
 *
 *  - 내 차례: 단어 리마인더 + PASS 버튼 활성
 *  - 다른 사람 차례: PASS 잠금
 *  - 15초 카운트다운 (서버 기준)
 */
export default function LiarSpeech({
  room,
  sessionId,
  secondsLeft,
  onPass,
}) {
  const players = room?.players || [];
  const idx = room?.current_speech_index || 0;
  const currentPlayer = players[idx];
  const myTurn = currentPlayer?.session_id === sessionId;
  const me = players.find((p) => p.session_id === sessionId);
  const isLiar = me?.role === "liar";
  const isDanger = secondsLeft <= 3;
  const currentLap = getCurrentLap(players, TOTAL_LAPS);

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
      {/* 헤더 + 카테고리 + 바퀴 */}
      <div style={{ padding: "20px 20px 8px", textAlign: "center" }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.25em",
            color: COLORS.liar,
            marginBottom: 6,
          }}
        >
          LIAR · SPEECH
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "rgba(240,232,216,0.6)",
          }}
        >
          <span>
            카테고리:{" "}
            <strong style={{ color: COLORS.gold }}>
              {room?.category || "—"}
            </strong>
          </span>
          <span
            style={{
              padding: "2px 10px",
              borderRadius: 999,
              background: "rgba(157,122,224,0.15)",
              border: "1px solid rgba(157,122,224,0.3)",
              color: COLORS.liarBright,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            바퀴 {currentLap}/{TOTAL_LAPS}
          </span>
        </div>
      </div>

      {/* 플레이어 스트립 */}
      <div style={{ padding: "8px 16px" }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {players.map((p, i) => {
            const count = p.speech_count || 0;
            const done = count >= TOTAL_LAPS;
            const isCurrent = i === idx;
            return (
              <Motion.div
                key={p.session_id}
                animate={
                  isCurrent
                    ? { boxShadow: ["0 0 0 0 rgba(157,122,224,0.6)", "0 0 0 8px rgba(157,122,224,0)"] }
                    : {}
                }
                transition={isCurrent ? { duration: 1.2, repeat: Infinity } : {}}
                style={{
                  flex: "0 0 auto",
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  border: isCurrent
                    ? `1.5px solid ${COLORS.liar}`
                    : "1px solid rgba(240,232,216,0.1)",
                  background: isCurrent
                    ? "linear-gradient(135deg, rgba(157,122,224,0.2), rgba(157,122,224,0.05))"
                    : done
                      ? "rgba(111,191,127,0.12)"
                      : "rgba(240,232,216,0.04)",
                  color: isCurrent
                    ? COLORS.liarBright
                    : done
                      ? COLORS.citizen
                      : "rgba(240,232,216,0.5)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {done && <Check size={11} />}
                {p.seat_label}
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    opacity: 0.75,
                  }}
                >
                  {count}/{TOTAL_LAPS}
                </span>
              </Motion.div>
            );
          })}
        </div>
      </div>

      {/* 메인 카드 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          gap: 20,
        }}
      >
        {/* 원형 타이머 */}
        <CircularTimer
          secondsLeft={secondsLeft}
          danger={isDanger}
        />

        {/* 현재 차례 안내 */}
        <div style={{ textAlign: "center" }}>
          {myTurn ? (
            <>
              <div
                style={{
                  fontSize: 14,
                  letterSpacing: "0.1em",
                  color: COLORS.liar,
                  marginBottom: 6,
                  fontWeight: 700,
                }}
              >
                당신 차례
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontFamily: "'Noto Serif KR', serif",
                  fontWeight: 800,
                  color: COLORS.ink,
                }}
              >
                입으로 설명하세요
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(240,232,216,0.5)",
                  marginBottom: 4,
                }}
              >
                지금 설명 중
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontFamily: "'Noto Serif KR', serif",
                  fontWeight: 800,
                  color: COLORS.ink,
                }}
              >
                {currentPlayer?.seat_label || "—"} 손님
              </div>
            </>
          )}
        </div>

        {/* 내가 시민이면 단어 리마인더 (모든 차례에서 보임) */}
        {!isLiar && (
          <div
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              background: "rgba(111,191,127,0.1)",
              border: "1px solid rgba(111,191,127,0.3)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                color: COLORS.citizen,
                marginBottom: 2,
              }}
            >
              내 단어
            </div>
            <div
              style={{
                fontSize: 18,
                fontFamily: "'Noto Serif KR', serif",
                fontWeight: 800,
                color: "#8FD49F",
              }}
            >
              {room?.answer_word}
            </div>
          </div>
        )}
        {isLiar && (
          <div
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              background: "rgba(157,122,224,0.1)",
              border: "1px solid rgba(157,122,224,0.3)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                color: COLORS.liar,
                marginBottom: 2,
              }}
            >
              당신은 라이어
            </div>
            <div
              style={{
                fontSize: 18,
                fontFamily: "'Black Han Sans', sans-serif",
                fontWeight: 900,
                color: COLORS.liarBright,
                letterSpacing: "0.05em",
              }}
            >
              ???
            </div>
          </div>
        )}
      </div>

      {/* PASS 버튼 */}
      <div
        style={{
          padding: "12px 20px",
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
        }}
      >
        <Motion.button
          whileTap={myTurn ? { scale: 0.97 } : undefined}
          onClick={myTurn ? onPass : undefined}
          disabled={!myTurn}
          style={{
            width: "100%",
            padding: "16px 18px",
            border: "none",
            borderRadius: 14,
            background: myTurn
              ? `linear-gradient(135deg, ${COLORS.liar}, #7A56C9)`
              : "rgba(240,232,216,0.06)",
            color: myTurn ? "#fff" : "rgba(240,232,216,0.35)",
            fontWeight: 800,
            fontSize: 15,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: myTurn ? "pointer" : "not-allowed",
            boxShadow: myTurn ? `0 8px 22px ${COLORS.liar}55` : "none",
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
            minHeight: 52,
          }}
        >
          <MessageCircle size={16} />
          {myTurn ? "설명 완료 · 다음 사람" : "PASS 잠금"}
        </Motion.button>
      </div>
    </div>
  );
}

function CircularTimer({ secondsLeft, danger }) {
  const max = SPEECH_SECONDS;
  const radius = 56;
  const stroke = 6;
  const circ = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, secondsLeft / max));
  const dash = circ * progress;
  const color = danger ? "#FF5C52" : "#B395E8";
  const display = Math.ceil(secondsLeft);

  return (
    <Motion.div
      animate={
        danger ? { scale: [1, 1.05, 1] } : {}
      }
      transition={
        danger ? { duration: 0.6, repeat: Infinity } : {}
      }
      style={{
        position: "relative",
        width: (radius + stroke) * 2,
        height: (radius + stroke) * 2,
      }}
    >
      <svg
        width={(radius + stroke) * 2}
        height={(radius + stroke) * 2}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          stroke="rgba(240,232,216,0.1)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.25s linear" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 900,
            color: danger ? "#FF5C52" : "#F0E8D8",
            lineHeight: 1,
          }}
        >
          {display}
        </div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "rgba(240,232,216,0.4)",
            marginTop: 4,
          }}
        >
          SEC
        </div>
      </div>
    </Motion.div>
  );
}

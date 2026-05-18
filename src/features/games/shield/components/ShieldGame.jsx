import { motion as Motion } from "framer-motion";
import { LogOut } from "lucide-react";
import {
  TURN_SECONDS,
  DANGER_THRESHOLD,
  countAlive,
} from "../lib/shieldRules";

const COLORS = {
  bgBase: "#0F0E0D",
  bgCard: "#1A1816",
  ink: "#F0E8D8",
  gold: "#C9A66B",
  danger: "#E5443C",
  dangerBright: "#FF5C52",
};

/**
 * ShieldGame — 3~5단계 게임 메인
 *
 * 분기: 내 차례 / 다른 사람 차례 / DANGER(2초 이하)
 *
 * 시간 판정은 useShieldGame에서. 여기서는 표현만.
 */
export default function ShieldGame({
  room,
  sessionId,
  secondsLeft,
  onPass,
  onLeave,
}) {
  const players = room?.players || [];
  const aliveCount = countAlive(players);
  const currentTurnId = room?.current_turn_session_id;
  const isMyTurn = currentTurnId === sessionId;
  const initials = room?.current_initials || "  ";
  const round = room?.current_round || 1;
  const danger = secondsLeft <= DANGER_THRESHOLD;
  const intSecondsLeft = Math.max(0, Math.ceil(secondsLeft));

  const currentTurnPlayer = players.find((p) => p.session_id === currentTurnId);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: COLORS.bgBase,
        color: COLORS.ink,
        fontFamily: "'Pretendard Variable', 'Pretendard', system-ui",
        padding: "16px 16px 12px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* DANGER 배경 펄스 (2초 이하 시) */}
      {danger && (
        <Motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.0, 0.18, 0.0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 40%, rgba(229,68,60,0.55), transparent 65%)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* 상단: 라운드 / 남은 인원 / 타이머 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <Chip>R{round}</Chip>
          <Chip>생존 {aliveCount}/{players.length}</Chip>
        </div>
        <Timer secondsLeft={intSecondsLeft} danger={danger} />
      </div>

      {/* 플레이어 스트립 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 6,
          marginBottom: 12,
          scrollbarWidth: "none",
          position: "relative",
          zIndex: 2,
        }}
      >
        {players.map((p) => {
          const isCurrent = p.session_id === currentTurnId;
          const isDead = p.status === "dead";
          const isMe = p.session_id === sessionId;
          return (
            <Motion.div
              key={p.session_id}
              animate={
                isCurrent && !isDead
                  ? danger
                    ? { scale: [1, 1.06, 1] }
                    : { scale: [1, 1.03, 1] }
                  : { scale: 1 }
              }
              transition={{
                duration: danger ? 0.5 : 1.0,
                repeat: isCurrent && !isDead ? Infinity : 0,
              }}
              style={{
                position: "relative",
                flexShrink: 0,
                minWidth: 64,
                padding: "8px 10px",
                borderRadius: 10,
                background: isDead
                  ? "rgba(240,232,216,0.04)"
                  : isCurrent
                  ? `linear-gradient(135deg, ${COLORS.danger}, #8E2922)`
                  : COLORS.bgCard,
                border: isCurrent
                  ? `1px solid ${COLORS.dangerBright}`
                  : "1px solid rgba(240,232,216,0.08)",
                color: isDead
                  ? "rgba(240,232,216,0.3)"
                  : isCurrent
                  ? "#fff"
                  : COLORS.ink,
                fontSize: 11,
                fontWeight: 700,
                textAlign: "center",
                opacity: isDead ? 0.5 : 1,
                filter: isDead ? "grayscale(0.6)" : undefined,
              }}
            >
              {isCurrent && !isDead && (
                <div
                  style={{
                    position: "absolute",
                    top: -10,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 14,
                    color: COLORS.dangerBright,
                  }}
                >
                  ▼
                </div>
              )}
              <div>{isDead && "💀 "}{p.seat_label}</div>
              {isMe && (
                <div style={{ fontSize: 9, opacity: 0.85, marginTop: 2 }}>
                  (나)
                </div>
              )}
            </Motion.div>
          );
        })}
      </div>

      {/* 폭탄 스테이지 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          position: "relative",
          zIndex: 2,
        }}
      >
        <Motion.div
          animate={
            danger
              ? { rotate: [-6, 6, -6, 6, -6, 6, 0], x: [-2, 2, -2, 2, 0] }
              : { rotate: [0, 4, -4, 0] }
          }
          transition={{
            duration: danger ? 0.4 : 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            fontSize: 64,
            filter: danger
              ? "drop-shadow(0 0 18px rgba(255,92,82,0.7))"
              : "drop-shadow(0 0 10px rgba(229,68,60,0.4))",
          }}
        >
          💣
        </Motion.div>

        <Motion.div
          animate={
            danger
              ? { scale: [1, 1.05, 1], color: ["#FF5C52", "#FFEF8A", "#FF5C52"] }
              : { scale: 1, color: COLORS.ink }
          }
          transition={{
            duration: 0.6,
            repeat: danger ? Infinity : 0,
            ease: "easeInOut",
          }}
          style={{
            fontSize: "clamp(90px, 32vw, 160px)",
            lineHeight: 1,
            fontFamily:
              "'Black Han Sans', 'Noto Serif KR', serif",
            fontWeight: 900,
            letterSpacing: "0.04em",
            textAlign: "center",
            userSelect: "none",
          }}
        >
          {initials}
        </Motion.div>

        <div
          style={{
            fontSize: 13,
            color: danger ? COLORS.dangerBright : "rgba(240,232,216,0.6)",
            textAlign: "center",
            lineHeight: 1.5,
            padding: "0 8px",
          }}
        >
          이 초성으로 시작하는 단어를
          <br />
          <strong>입으로 외치고</strong> PASS!
        </div>
      </div>

      {/* PASS / 잠금 버튼 */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          paddingTop: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {isMyTurn ? (
          <Motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onPass}
            style={{
              width: "100%",
              minHeight: 78,
              padding: "20px",
              border: "none",
              borderRadius: 18,
              background: danger
                ? `linear-gradient(135deg, ${COLORS.dangerBright}, ${COLORS.danger})`
                : `linear-gradient(135deg, ${COLORS.danger}, #B83328)`,
              color: "#fff",
              fontWeight: 900,
              fontSize: 22,
              fontFamily: "'Noto Serif KR', serif",
              letterSpacing: "0.05em",
              cursor: "pointer",
              boxShadow: danger
                ? "0 12px 28px rgba(255,92,82,0.5), inset 0 0 20px rgba(255,255,255,0.15)"
                : "0 12px 26px rgba(229,68,60,0.4)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            💥 외쳤다! PASS 💥
          </Motion.button>
        ) : (
          <div
            style={{
              width: "100%",
              minHeight: 78,
              padding: "16px",
              borderRadius: 18,
              background: "rgba(240,232,216,0.04)",
              border: "1px solid rgba(240,232,216,0.1)",
              color: "rgba(240,232,216,0.55)",
              fontSize: 14,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <div style={{ fontSize: 18 }}>🔒</div>
            <div style={{ fontWeight: 600 }}>
              {currentTurnPlayer?.seat_label || "?"} 손님 차례
            </div>
          </div>
        )}

        <button
          onClick={onLeave}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(240,232,216,0.4)",
            fontSize: 11,
            padding: "8px",
            cursor: "pointer",
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            alignSelf: "center",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <LogOut size={11} /> 게임 포기하고 나가기
        </button>
      </div>
    </div>
  );
}

function Chip({ children }) {
  return (
    <div
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: "rgba(240,232,216,0.08)",
        border: "1px solid rgba(240,232,216,0.1)",
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        color: COLORS.ink,
      }}
    >
      {children}
    </div>
  );
}

function Timer({ secondsLeft, danger }) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, secondsLeft / TURN_SECONDS));
  const dashOffset = c * (1 - progress);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)", display: "block" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(240,232,216,0.1)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={danger ? COLORS.dangerBright : COLORS.gold}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.25s linear, stroke 0.15s linear",
          }}
        />
      </svg>
      <Motion.div
        animate={danger ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.55, repeat: danger ? Infinity : 0 }}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 20,
          fontWeight: 800,
          color: danger ? COLORS.dangerBright : COLORS.ink,
        }}
      >
        {secondsLeft}
      </Motion.div>
    </div>
  );
}

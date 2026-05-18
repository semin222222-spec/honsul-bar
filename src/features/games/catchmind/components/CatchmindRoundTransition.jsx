import { motion as Motion } from "framer-motion";
import { TRANSITION_SECONDS } from "../lib/catchmindRules";

const COLORS = {
  bgBase: "#1A1410",
  bgCard: "#261E18",
  ink: "#F5E6C8",
  gold: "#FFD23F",
  pink: "#FF6B9D",
  green: "#4ADE80",
};

/**
 * CatchmindRoundTransition
 *
 * 라운드 종료 직후 TRANSITION_SECONDS(4초) 표시되는 결과 화면.
 *  - 정답 단어 공개
 *  - 출제자 / 정답자 점수 변동
 */
export default function CatchmindRoundTransition({ room, sessionId }) {
  const result = room?.last_round_result;
  if (!result) return null;

  const players = room?.players || [];
  const scoreChanges = result.score_changes || {};
  const drawerId = result.drawer_session_id;
  const correctSessions = result.correct_sessions || [];

  // 정답자 점수 내림차순으로 정렬
  const correctRanked = correctSessions
    .map((sid) => ({
      sessionId: sid,
      seatLabel: players.find((p) => p.session_id === sid)?.seat_label || "?",
      score: scoreChanges[sid] || 0,
    }))
    .sort((a, b) => b.score - a.score);

  const drawerInfo = {
    seatLabel:
      result.drawer_seat_label ||
      players.find((p) => p.session_id === drawerId)?.seat_label ||
      "?",
    score: result.drawer_bonus || 0,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,20,16,0.95)",
        backdropFilter: "blur(12px)",
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        color: COLORS.ink,
        fontFamily: "'Plus Jakarta Sans', system-ui",
      }}
    >
      <Motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35 }}
        style={{
          width: "100%",
          maxWidth: 380,
          background: COLORS.bgCard,
          borderRadius: 18,
          padding: "24px 22px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.25em",
            color: "rgba(255,210,63,0.6)",
            textAlign: "center",
            marginBottom: 6,
          }}
        >
          ROUND {result.round} 종료
        </div>

        {/* 정답 단어 */}
        <Motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          style={{
            textAlign: "center",
            margin: "8px 0 20px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "rgba(245,230,200,0.55)",
              marginBottom: 6,
            }}
          >
            정답은
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: COLORS.gold,
              fontFamily: "'Noto Serif KR', serif",
              lineHeight: 1.1,
              textShadow: "0 0 20px rgba(255,210,63,0.3)",
            }}
          >
            {result.word}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(245,230,200,0.45)",
              marginTop: 8,
            }}
          >
            ✏️ {drawerInfo.seatLabel} 손님이 그렸어요
          </div>
        </Motion.div>

        {/* 점수 변동 */}
        <div
          style={{
            background: "rgba(245,230,200,0.04)",
            border: "1px solid rgba(245,230,200,0.08)",
            borderRadius: 12,
            padding: "10px 14px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "rgba(245,230,200,0.5)",
              marginBottom: 8,
            }}
          >
            이번 라운드 점수
          </div>

          {/* 출제자 */}
          <ScoreRow
            label={`✏️ 출제자 · ${drawerInfo.seatLabel} 손님`}
            score={drawerInfo.score}
            isMe={drawerId === sessionId}
            note={
              result.reason === "pass"
                ? "패스"
                : `정답자 ${correctSessions.length}명`
            }
          />

          {/* 정답자들 */}
          {correctRanked.map((r, idx) => (
            <ScoreRow
              key={r.sessionId}
              label={`🎯 ${idx + 1}등 · ${r.seatLabel} 손님`}
              score={r.score}
              isMe={r.sessionId === sessionId}
            />
          ))}

          {/* 못 맞춘 사람들 */}
          {players
            .filter(
              (p) =>
                p.session_id !== drawerId &&
                !correctSessions.includes(p.session_id),
            )
            .map((p) => (
              <ScoreRow
                key={p.session_id}
                label={`💤 ${p.seat_label} 손님`}
                score={0}
                isMe={p.session_id === sessionId}
                muted
              />
            ))}
        </div>

        <div
          style={{
            marginTop: 14,
            textAlign: "center",
            fontSize: 11,
            color: "rgba(245,230,200,0.4)",
          }}
        >
          {TRANSITION_SECONDS}초 후 다음 라운드...
        </div>
      </Motion.div>
    </div>
  );
}

function ScoreRow({ label, score, isMe, note, muted }) {
  const positive = score > 0;
  const negative = score < 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px dashed rgba(245,230,200,0.06)",
        opacity: muted ? 0.55 : 1,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: isMe ? COLORS.pink : COLORS.ink,
          fontWeight: isMe ? 700 : 500,
        }}
      >
        {label}
        {isMe && <span style={{ marginLeft: 4, fontSize: 10 }}>(나)</span>}
        {note && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 10,
              color: "rgba(245,230,200,0.4)",
            }}
          >
            · {note}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          fontFamily: "'JetBrains Mono', monospace",
          color: positive ? COLORS.green : negative ? "#F87171" : "rgba(245,230,200,0.4)",
        }}
      >
        {positive ? "+" : ""}
        {score}
      </div>
    </div>
  );
}

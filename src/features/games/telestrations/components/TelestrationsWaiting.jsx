import { motion as Motion } from "framer-motion";
import { Check, Clock } from "lucide-react";

/**
 * TelestrationsWaiting
 *   - 내가 제출 완료 후 다른 사람 기다리는 화면
 *   - 제출자/미제출자 표시
 *   - status/current_step 변경 시 Modal 이 다음 화면으로 라우팅
 */
export default function TelestrationsWaiting({
  players,
  submittedAuthors,
  sessionId,
  currentStep,
  drawingNow,
}) {
  const total = players.length;
  const submittedCount = submittedAuthors.size;
  const remaining = players.filter(
    (p) => !submittedAuthors.has(p.session_id),
  );

  const stepLabel = drawingNow ? "그리기" : "추측";
  const accent = drawingNow ? "#B084FF" : "#7AE8B5";

  return (
    <div
      style={{
        padding: "24px clamp(16px, 4vw, 24px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        minHeight: 360,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.2em",
          color: `${accent}cc`,
        }}
      >
        WAITING
      </div>

      <Motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: `${accent}22`,
          border: `2px solid ${accent}66`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
          boxShadow: `0 0 30px ${accent}44`,
        }}
      >
        <Check size={28} strokeWidth={3} />
      </Motion.div>

      <div
        style={{
          textAlign: "center",
          fontFamily: "'Noto Serif KR', serif",
          color: "#F0E8D8",
          fontSize: 16,
        }}
      >
        제출 완료!
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
          textAlign: "center",
          lineHeight: 1.6,
          maxWidth: 280,
        }}
      >
        다른 분들이 {stepLabel}을 끝내면 자동으로 다음 단계로 넘어가요
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 320,
          padding: "14px 16px",
          background: "rgba(20,18,14,0.7)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <span style={{ letterSpacing: "0.1em" }}>STEP {currentStep + 1}</span>
          <span>
            {submittedCount} / {total} 명 완료
          </span>
        </div>

        {/* 진행률 바 */}
        <div
          style={{
            height: 4,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <Motion.div
            animate={{ width: `${(submittedCount / Math.max(1, total)) * 100}%` }}
            transition={{ duration: 0.5 }}
            style={{
              height: "100%",
              background: accent,
            }}
          />
        </div>

        {/* 누가 안 냈는지 */}
        {remaining.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 4,
            }}
          >
            {remaining.map((p) => (
              <span
                key={p.session_id}
                style={{
                  fontSize: 10,
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: "rgba(212,165,55,0.1)",
                  color: "rgba(212,165,55,0.85)",
                  border: "1px solid rgba(212,165,55,0.25)",
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                {p.seat_label}
                {p.session_id === sessionId ? " (나)" : ""}
              </span>
            ))}
            <span
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.4)",
                display: "flex",
                alignItems: "center",
                gap: 3,
                marginLeft: 2,
              }}
            >
              <Clock size={11} /> 기다리는 중
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

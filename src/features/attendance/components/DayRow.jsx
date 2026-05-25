import { motion as Motion } from "framer-motion";
import { T } from "./attendanceTheme";
import {
  kstTime,
  formatCheckOut,
  workMs,
  formatDurationShort,
  formatDurationKo,
  isAbnormal,
} from "../utils/timeCalc";
import { dayNumber, weekdayKo, isWeekend } from "../utils/dateFormat";

// 일별 리스트 행. record 없으면 빈 날(수동 입력 유도).
// now: 진행 중 경과 표시용 현재 시각(ms) — 부모가 틱으로 내려준다(render purity).
export default function DayRow({ entry, onClick, now = 0 }) {
  const { workDate, record } = entry;
  const weekend = isWeekend(workDate);

  const dateBlock = (
    <div style={{ width: 50, textAlign: "center", flexShrink: 0 }}>
      <div
        style={{
          fontFamily: T.fontMono,
          fontSize: 20,
          fontWeight: 800,
          lineHeight: 1,
          color: weekend ? T.danger : T.textPrimary,
        }}
      >
        {dayNumber(workDate)}
      </div>
      <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>
        {weekdayKo(workDate)}
      </div>
    </div>
  );

  // ── 빈 날 ──
  if (!record) {
    return (
      <Motion.div
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        style={{
          ...rowStyle,
          borderStyle: "dashed",
          opacity: 0.55,
          cursor: "pointer",
        }}
      >
        {dateBlock}
        <div
          style={{
            flex: 1,
            color: T.textMuted,
            fontSize: 11,
            fontStyle: "italic",
          }}
        >
          기록 없음 · 탭해서 수동 입력
        </div>
        <div style={{ color: T.textMuted, fontWeight: 800, fontSize: 18 }}>+</div>
      </Motion.div>
    );
  }

  const inProgress = !record.check_out_at;
  const out = formatCheckOut(record.check_in_at, record.check_out_at);
  const ms = workMs(record.check_in_at, record.check_out_at);
  const abnormal = isAbnormal(record.check_in_at, record.check_out_at);
  const modified = record.modified_by_admin;

  // 노트 문구
  let note = "정상 마감";
  let noteWarning = false;
  if (inProgress) {
    const elapsed = now ? now - new Date(record.check_in_at).getTime() : null;
    note = elapsed != null ? `진행 중 · ${formatDurationKo(elapsed)}` : "진행 중";
  } else if (out.nextDay) {
    note = "⚠️ 새벽 퇴근 (다음날)";
    noteWarning = true;
  } else if (abnormal) {
    note = "⚠️ 시간 확인 필요 (24h 초과)";
    noteWarning = true;
  }
  if (modified) note += " · 수정됨";

  return (
    <Motion.div whileTap={{ scale: 0.99 }} onClick={onClick} style={rowStyle}>
      {dateBlock}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            fontSize: 11,
            alignItems: "center",
          }}
        >
          <span style={timeStyle}>{kstTime(record.check_in_at)}</span>
          <span style={{ color: T.textMuted }}>→</span>
          {inProgress ? (
            <span style={{ ...timeStyle, color: T.success }}>근무 중</span>
          ) : (
            <span
              style={{
                ...timeStyle,
                color: out.nextDay ? T.warning : T.textPrimary,
              }}
            >
              {out.time}
              {out.nextDay && (
                <sup style={{ fontSize: 8, marginLeft: 1 }}>+1</sup>
              )}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 9,
            marginTop: 2,
            color: noteWarning ? T.warning : T.textMuted,
          }}
        >
          {note}
        </div>
      </div>
      <div
        style={{
          fontFamily: T.fontMono,
          fontWeight: 800,
          fontSize: 14,
          color: inProgress ? T.success : T.gold,
          flexShrink: 0,
        }}
      >
        {inProgress ? "진행" : formatDurationShort(ms)}
      </div>
    </Motion.div>
  );
}

const rowStyle = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  padding: "10px 12px",
  marginBottom: 6,
  display: "flex",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
};

const timeStyle = {
  fontFamily: T.fontMono,
  color: T.textPrimary,
  fontWeight: 700,
};

import { T } from "./attendanceTheme";
import { formatDurationShort } from "../utils/timeCalc";

// 월별 요약 카드 (총 근무시간 / 근무일수 / 일평균)
export default function MonthlySummary({ totalMs, days, avgMs }) {
  const rows = [
    { label: "📊 총 근무시간", value: formatDurationShort(totalMs), big: true },
    { label: "📅 근무일수", value: `${days}일` },
    { label: "⏱ 일평균", value: days > 0 ? formatDurationShort(avgMs) : "—" },
  ];

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(212,165,55,0.1), rgba(226,150,75,0.04))",
        border: "1px solid rgba(212,165,55,0.25)",
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
      }}
    >
      {rows.map((r, i) => (
        <div
          key={r.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 0",
            borderTop: i === 0 ? "none" : `1px solid ${T.border}`,
          }}
        >
          <span style={{ fontSize: 11, color: T.textSecondary }}>{r.label}</span>
          <span
            style={{
              fontFamily: T.fontMono,
              fontWeight: 800,
              fontSize: r.big ? 24 : 16,
              color: r.big ? T.gold : T.textPrimary,
            }}
          >
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}

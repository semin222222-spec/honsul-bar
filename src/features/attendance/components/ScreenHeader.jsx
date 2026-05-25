import { ChevronLeft } from "lucide-react";
import { T } from "./attendanceTheme";

// 화면 상단 타이틀 바 (뒤로가기 + 제목/부제목) — 시안 page-title-bar
export default function ScreenHeader({ title, subtitle, onBack }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        paddingBottom: 14,
        borderBottom: `1px solid ${T.border}`,
        marginBottom: 16,
      }}
    >
      <button
        onClick={onBack}
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: T.card,
          border: `1px solid ${T.border}`,
          color: T.textSecondary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          fontFamily: "inherit",
        }}
        aria-label="뒤로"
      >
        <ChevronLeft size={18} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: T.textMuted }}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}

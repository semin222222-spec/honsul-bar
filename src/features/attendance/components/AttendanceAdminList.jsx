import { useState, useMemo } from "react";
import { motion as Motion } from "framer-motion";
import { ChevronRight, Plus } from "lucide-react";
import { T } from "./attendanceTheme";
import ScreenHeader from "./ScreenHeader";
import AddStaffModal from "./AddStaffModal";
import { useMonthlyStoreStats } from "../hooks/useAttendanceStats";
import { formatDurationShort } from "../utils/timeCalc";
import { compareKoreanName, avatarInitial } from "../utils/dateFormat";
import { avatarGradient } from "./attendanceTheme";

// 화면 4 — 관리자 알바 목록 (통계 + 카드 + 추가)
export default function AttendanceAdminList({
  storeId,
  staff,
  openByStaff,
  workingCount,
  busy,
  onAddStaff,
  onSelectStaff,
  onBack,
}) {
  const { hoursByStaff, totalMs } = useMonthlyStoreStats(storeId);
  const [adding, setAdding] = useState(false);

  const sorted = useMemo(
    () => [...staff].sort((a, b) => compareKoreanName(a.name, b.name)),
    [staff],
  );

  const handleAdd = async (name) => {
    const ok = await onAddStaff(name);
    if (ok) setAdding(false);
    return ok;
  };

  return (
    <div>
      <ScreenHeader title="알바 관리" subtitle="👑 관리자 모드" onBack={onBack} />

      {/* 상단 통계 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <StatCard label="이번 달 총 시간" value={formatDurationShort(totalMs)} />
        <StatCard
          label="현재 근무 중"
          value={`${workingCount}명`}
          warning={workingCount > 0}
        />
      </div>

      {/* 섹션 헤더 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "14px 0 8px",
        }}
      >
        <h3
          style={{
            fontSize: 12,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: T.textSecondary,
            fontWeight: 700,
          }}
        >
          전체 알바 ({sorted.length}명)
        </h3>
        <Motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setAdding((v) => !v)}
          style={{
            background: `linear-gradient(135deg, ${T.goldSoft}, ${T.goldDeep})`,
            color: "#1a1206",
            border: "none",
            padding: "5px 10px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 3,
            fontFamily: "inherit",
          }}
        >
          <Plus size={13} /> 알바 추가
        </Motion.button>
      </div>

      {sorted.length === 0 && !adding && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: T.textMuted,
            fontSize: 12,
          }}
        >
          아직 등록된 알바가 없어요. <br />[+ 알바 추가]로 시작하세요.
        </div>
      )}

      {sorted.map((s, i) => {
        const open = openByStaff.get(s.id);
        const hours = hoursByStaff.get(s.id) || 0;
        return (
          <Motion.div
            key={s.id}
            whileTap={{ scale: 0.99 }}
            onClick={() => onSelectStaff(s)}
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: 12,
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: avatarGradient(i),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 14,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {avatarInitial(s.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}
              >
                {s.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.textMuted,
                  display: "flex",
                  gap: 8,
                  marginTop: 2,
                }}
              >
                {open ? (
                  <span style={{ color: T.success, fontWeight: 700 }}>
                    ● 근무 중
                  </span>
                ) : (
                  <span>퇴근</span>
                )}
                {s.hired_at && <span>· 입사 {formatHired(s.hired_at)}</span>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontFamily: T.fontMono,
                  fontSize: 14,
                  fontWeight: 800,
                  color: T.gold,
                }}
              >
                {formatDurationShort(hours)}
              </div>
              <div style={{ fontSize: 9, color: T.textMuted }}>이번 달</div>
            </div>
            <ChevronRight size={16} color={T.textMuted} />
          </Motion.div>
        );
      })}

      {adding && (
        <AddStaffModal
          onAdd={handleAdd}
          onCancel={() => setAdding(false)}
          busy={busy}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, warning }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: T.textSecondary,
          letterSpacing: 1,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: T.fontMono,
          fontSize: 22,
          fontWeight: 800,
          color: warning ? T.warning : T.goldSoft,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// 'YYYY-MM-DD' → 'YY.MM'
function formatHired(dateStr) {
  const [y, m] = dateStr.split("-");
  return `${y.slice(2)}.${m}`;
}

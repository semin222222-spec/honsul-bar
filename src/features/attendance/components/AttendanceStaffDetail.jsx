import { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Trash2, Loader2, Pencil } from "lucide-react";
import { T } from "./attendanceTheme";
import ScreenHeader from "./ScreenHeader";
import MonthlySummary from "./MonthlySummary";
import DayRow from "./DayRow";
import { useStaffMonth, currentKstMonth } from "../hooks/useAttendanceStats";
import { formatDurationShort } from "../utils/timeCalc";
import { monthLabel, avatarInitial } from "../utils/dateFormat";

// 화면 5 — 알바 상세 (일별/월별)
export default function AttendanceStaffDetail({
  storeId,
  staff,
  openByStaff,
  busy,
  onRenameStaff,
  onRemoveStaff,
  onBack,
  onEdit,
}) {
  const cur = currentKstMonth();
  const [{ year, month }, setYM] = useState({ year: cur.year, month: cur.month });
  const [tab, setTab] = useState("daily");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const startRename = () => {
    setNameInput(staff.name);
    setConfirmDelete(false);
    setRenaming(true);
  };
  const submitRename = async () => {
    if (!nameInput.trim()) return;
    const ok = await onRenameStaff(staff.id, nameInput);
    if (ok) setRenaming(false);
  };

  // 진행 중 경과 표시용 현재 시각 (30초 틱)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(iv);
  }, []);

  const { summary, days, loading } = useStaffMonth(storeId, staff.id, year, month);
  const working = openByStaff.has(staff.id);

  const isCurrentMonth = year === cur.year && month === cur.month;
  const goPrev = () =>
    setYM(({ year: y, month: m }) =>
      m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 },
    );
  const goNext = () => {
    if (isCurrentMonth) return; // 미래로는 이동 안 함
    setYM(({ year: y, month: m }) =>
      m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 },
    );
  };

  return (
    <div>
      <ScreenHeader title="알바 상세" subtitle="시간 조회/수정" onBack={onBack} />

      {/* 알바 헤더 */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(212,165,55,0.08))",
          border: "1px solid rgba(212,165,55,0.2)",
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${T.goldSoft}, ${T.goldDeep})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 16,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {avatarInitial(staff.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.textPrimary }}>
            {staff.name}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
            📅 {staff.hired_at ? `입사 ${staff.hired_at}` : "입사일 미등록"}
            {working && (
              <span style={{ color: T.success, fontWeight: 700 }}> · 근무 중</span>
            )}
          </div>
        </div>
        <button
          onClick={startRename}
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "rgba(212,165,55,0.1)",
            border: "1px solid rgba(212,165,55,0.3)",
            color: T.gold,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
          aria-label="이름 수정"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => {
            setConfirmDelete(true);
            setRenaming(false);
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "rgba(226,75,74,0.08)",
            border: "1px solid rgba(226,75,74,0.25)",
            color: T.danger,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
          aria-label="알바 비활성"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* 이름 수정 인라인 */}
      {renaming && (
        <Motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: 12,
            marginBottom: 12,
            background: "rgba(212,165,55,0.06)",
            border: "1px solid rgba(212,165,55,0.3)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: T.goldSoft,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            ✏️ 이름 수정
          </div>
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
            placeholder="이름"
            style={{
              width: "100%",
              background: T.input,
              border: `1px solid ${T.borderBright}`,
              color: T.textPrimary,
              padding: 10,
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={() => setRenaming(false)} style={confirmBtn(false)}>
              취소
            </button>
            <button
              onClick={submitRename}
              disabled={busy || !nameInput.trim()}
              style={{
                ...confirmBtn(true),
                background: `linear-gradient(135deg, ${T.goldSoft}, ${T.goldDeep})`,
                color: "#1a1206",
                opacity: busy || !nameInput.trim() ? 0.6 : 1,
              }}
            >
              ✓ 저장
            </button>
          </div>
        </Motion.div>
      )}

      {/* 삭제(비활성) 확인 */}
      {confirmDelete && (
        <Motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: 12,
            marginBottom: 12,
            background: "rgba(226,75,74,0.1)",
            border: "1px solid rgba(226,75,74,0.3)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,180,180,0.95)",
              marginBottom: 4,
              fontWeight: 700,
            }}
          >
            {staff.name} 님을 목록에서 내릴까요?
          </div>
          <div
            style={{
              fontSize: 10,
              color: "rgba(255,180,180,0.7)",
              marginBottom: 8,
              lineHeight: 1.5,
            }}
          >
            기록은 보존되고 목록에서만 숨겨집니다 (비활성 처리).
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setConfirmDelete(false)}
              style={confirmBtn(false)}
            >
              취소
            </button>
            <button
              onClick={async () => {
                const ok = await onRemoveStaff(staff.id);
                if (ok) onBack();
              }}
              disabled={busy}
              style={confirmBtn(true)}
            >
              네, 비활성
            </button>
          </div>
        </Motion.div>
      )}

      {/* 탭 */}
      <div
        style={{
          display: "flex",
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: 4,
          marginBottom: 12,
        }}
      >
        {[
          ["daily", "📅 일별"],
          ["monthly", "📊 월별"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: 8,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              fontFamily: "inherit",
              color: tab === key ? "#1a1206" : T.textSecondary,
              background:
                tab === key
                  ? `linear-gradient(135deg, ${T.goldSoft}, ${T.goldDeep})`
                  : "transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 월 네비게이션 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: "10px 14px",
          marginBottom: 10,
        }}
      >
        <ChevronLeft
          size={18}
          color={T.textSecondary}
          style={{ cursor: "pointer" }}
          onClick={goPrev}
        />
        <span style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
          {monthLabel(year, month)}
        </span>
        <ChevronRight
          size={18}
          color={isCurrentMonth ? T.textMuted : T.textSecondary}
          style={{ cursor: isCurrentMonth ? "default" : "pointer", opacity: isCurrentMonth ? 0.3 : 1 }}
          onClick={goNext}
        />
      </div>

      <MonthlySummary
        totalMs={summary.totalMs}
        days={summary.days}
        avgMs={summary.avgMs}
      />

      {tab === "daily" ? (
        loading ? (
          <Spinner />
        ) : (
          <>
            <div
              style={{
                fontSize: 11,
                color: T.textSecondary,
                letterSpacing: 2,
                textTransform: "uppercase",
                margin: "4px 0 8px",
              }}
            >
              📋 이번 달 기록
            </div>
            {days.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px 0",
                  color: T.textMuted,
                  fontSize: 12,
                }}
              >
                표시할 날짜가 없어요
              </div>
            ) : (
              days.map((entry) => (
                <DayRow
                  key={entry.workDate}
                  entry={entry}
                  now={now}
                  onClick={() => onEdit({ workDate: entry.workDate, record: entry.record })}
                />
              ))
            )}
          </>
        )
      ) : (
        <div
          style={{
            padding: 16,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            fontSize: 12,
            color: T.textSecondary,
            lineHeight: 1.7,
          }}
        >
          <div style={{ color: T.textPrimary, fontWeight: 700, marginBottom: 6 }}>
            {monthLabel(year, month)} 요약
          </div>
          이 달 근무일 <b style={{ color: T.gold }}>{summary.days}일</b>, 총{" "}
          <b style={{ color: T.gold }}>{formatDurationShort(summary.totalMs)}</b>{" "}
          근무했어요.
          <br />
          날짜별 상세는 <b>일별</b> 탭에서 확인/수정할 수 있어요.
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <Motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        style={{ display: "inline-block", color: "rgba(212,165,55,0.4)" }}
      >
        <Loader2 size={28} />
      </Motion.div>
    </div>
  );
}

function confirmBtn(primary) {
  return {
    flex: primary ? 1.5 : 1,
    padding: 8,
    borderRadius: 8,
    border: primary ? "none" : `1px solid ${T.borderBright}`,
    background: primary
      ? "linear-gradient(135deg, #E24B4A, #B03838)"
      : "transparent",
    color: primary ? "#fff" : T.textSecondary,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

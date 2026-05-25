import { useState, useEffect, useMemo } from "react";
import { motion as Motion } from "framer-motion";
import { T } from "./attendanceTheme";
import ScreenHeader from "./ScreenHeader";
import PunchButton from "./PunchButton";
import { compareKoreanName } from "../utils/dateFormat";
import { kstTime, formatDurationKo } from "../utils/timeCalc";

// 화면 2 — 직원 모드 (본인 선택 → 출/퇴근)
export default function AttendanceStaffMode({
  staff,
  openByStaff,
  todayByStaff,
  busy,
  onPunchIn,
  onPunchOut,
  onBack,
}) {
  const sorted = useMemo(
    () => [...staff].sort((a, b) => compareKoreanName(a.name, b.name)),
    [staff],
  );
  // 선택값: 직접 고른 값 우선, 없으면 첫 번째 (effect 없이 파생)
  const [picked, setPicked] = useState("");
  const selectedId = picked || sorted[0]?.id || "";

  // 경과 시간 표시용 현재 시각 (1초 틱)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const open = selectedId ? openByStaff.get(selectedId) : null;
  const today = selectedId ? todayByStaff.get(selectedId) : null;
  const working = !!open;
  const logRecord = open || today;

  const handlePunch = () => {
    if (!selectedId || busy) return;
    if (working) onPunchOut(selectedId);
    else onPunchIn(selectedId);
  };

  return (
    <div>
      <ScreenHeader title="출퇴근" subtitle="직원 모드" onBack={onBack} />

      {sorted.length === 0 ? (
        <EmptyStaff />
      ) : (
        <>
          {/* 본인 선택 */}
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: 12,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: T.textSecondary,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              👤 본인 선택
            </div>
            <select
              value={selectedId}
              onChange={(e) => setPicked(e.target.value)}
              style={{
                width: "100%",
                background: T.input,
                border: `1px solid ${T.borderBright}`,
                color: T.textPrimary,
                padding: 10,
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {sorted.map((s) => (
                <option key={s.id} value={s.id} style={{ color: "#000" }}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 현재 상태 */}
          <div
            style={{
              background: working
                ? "linear-gradient(135deg, rgba(106,176,106,0.12), rgba(106,176,106,0.03))"
                : T.card,
              border: `1px solid ${working ? "rgba(106,176,106,0.3)" : T.borderBright}`,
              borderRadius: 16,
              padding: 16,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            {working ? (
              <>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(0,0,0,0.3)",
                    borderRadius: 100,
                    padding: "4px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.success,
                    marginBottom: 8,
                  }}
                >
                  <Motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: T.success,
                      boxShadow: `0 0 8px ${T.success}`,
                    }}
                  />
                  근무 중
                </div>
                <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 4 }}>
                  출근 시각
                </div>
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 28,
                    fontWeight: 700,
                    color: T.textPrimary,
                    lineHeight: 1,
                  }}
                >
                  {kstTime(open.check_in_at)}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: T.success,
                    fontWeight: 700,
                  }}
                >
                  ⏱ {formatDurationKo(now - new Date(open.check_in_at).getTime())} 경과
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 32, marginBottom: 6 }}>💤</div>
                <div style={{ fontSize: 14, color: T.textSecondary }}>
                  {today?.check_out_at
                    ? "오늘 근무를 마쳤어요"
                    : "아직 출근 전이에요"}
                </div>
              </>
            )}
          </div>

          <PunchButton
            mode={working ? "out" : "in"}
            onClick={handlePunch}
            disabled={busy || !selectedId}
          />

          {/* 오늘 기록 미니 로그 */}
          {logRecord && (
            <div
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: 12,
                marginTop: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: T.textSecondary,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                📋 오늘 ({logRecord.work_date.slice(5).replace("-", "/")})
              </div>
              <LogRow label="🟢 출근" value={kstTime(logRecord.check_in_at)} />
              {logRecord.check_out_at ? (
                <LogRow
                  label="🏠 퇴근"
                  value={kstTime(logRecord.check_out_at)}
                />
              ) : (
                <LogRow
                  label="⏳ 현재까지"
                  value={formatDurationKo(
                    now - new Date(logRecord.check_in_at).getTime(),
                  )}
                  valueColor={T.success}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LogRow({ label, value, valueColor }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 0",
        fontSize: 12,
        borderTop: `1px dashed ${T.border}`,
      }}
    >
      <span style={{ color: T.textSecondary }}>{label}</span>
      <span
        style={{
          fontFamily: T.fontMono,
          color: valueColor || T.textPrimary,
          fontWeight: 700,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyStaff() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🙋</div>
      <div style={{ fontSize: 14, color: T.textSecondary, marginBottom: 4 }}>
        등록된 알바가 없어요
      </div>
      <div style={{ fontSize: 11, color: T.textMuted }}>
        관리자 모드에서 알바를 먼저 추가해주세요
      </div>
    </div>
  );
}

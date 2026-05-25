import { useState, useMemo } from "react";
import { motion as Motion } from "framer-motion";
import { Trash2, AlertTriangle } from "lucide-react";
import { T } from "./attendanceTheme";
import ScreenHeader from "./ScreenHeader";
import TimeInput from "./TimeInput";
import {
  kstParts,
  buildManualTimes,
  workMs,
  formatDurationShort,
} from "../utils/timeCalc";
import { formatKoreanDate } from "../utils/dateFormat";

// 화면 6 — 수동 입력/수정
export default function AttendanceEdit({
  staff,
  workDate,
  record,
  busy,
  onSave,
  onDelete,
  onBack,
}) {
  const init = useMemo(() => {
    if (record) {
      const ci = kstParts(record.check_in_at);
      const co = record.check_out_at ? kstParts(record.check_out_at) : null;
      return {
        date: record.work_date,
        inHH: pad(ci.hour),
        inMM: pad(ci.minute),
        outHH: co ? pad(co.hour) : "",
        outMM: co ? pad(co.minute) : "",
        note: record.note || "",
      };
    }
    return { date: workDate, inHH: "", inMM: "", outHH: "", outMM: "", note: "" };
  }, [record, workDate]);

  const [date, setDate] = useState(init.date);
  const [inHH, setInHH] = useState(init.inHH);
  const [inMM, setInMM] = useState(init.inMM);
  const [outHH, setOutHH] = useState(init.outHH);
  const [outMM, setOutMM] = useState(init.outMM);
  const [note, setNote] = useState(init.note);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 실시간 계산
  const calc = useMemo(() => {
    const ih = toInt(inHH);
    const im = toInt(inMM);
    if (!inRange(ih, 0, 23) || !inRange(im, 0, 59)) return null;

    const hasOut = outHH !== "" || outMM !== "";
    const oh = toInt(outHH);
    const om = toInt(outMM);
    if (hasOut && (!inRange(oh, 0, 23) || !inRange(om, 0, 59))) return null;

    const built = buildManualTimes(
      date,
      ih,
      im,
      hasOut ? oh : NaN,
      hasOut ? om : NaN,
    );
    const ms = workMs(built.checkInAt, built.checkOutAt);
    return { ...built, ms, hasOut };
  }, [date, inHH, inMM, outHH, outMM]);

  const handleSave = async () => {
    setError("");
    if (!date) return setError("출근 날짜를 선택해주세요.");
    const ih = toInt(inHH);
    const im = toInt(inMM);
    if (!inRange(ih, 0, 23) || !inRange(im, 0, 59))
      return setError("출근 시각을 올바르게 입력해주세요 (00:00~23:59).");

    const hasOut = outHH !== "" || outMM !== "";
    const oh = toInt(outHH);
    const om = toInt(outMM);
    if (hasOut && (!inRange(oh, 0, 23) || !inRange(om, 0, 59)))
      return setError("퇴근 시각을 올바르게 입력해주세요 (00:00~23:59).");

    const built = buildManualTimes(date, ih, im, hasOut ? oh : NaN, hasOut ? om : NaN);

    const res = await onSave({
      staffId: staff.id,
      workDate: date,
      checkInAt: built.checkInAt,
      checkOutAt: built.checkOutAt,
      note: note.trim() || null,
      recordId: record?.id || null,
    });
    if (res?.ok) onBack();
    else setError(res?.error || "저장에 실패했어요.");
  };

  return (
    <div>
      <ScreenHeader title="시간 수정" subtitle="수동 입력/수정" onBack={onBack} />

      {/* 헤더 */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(226,150,75,0.06))",
          border: "1px solid rgba(226,150,75,0.2)",
          borderRadius: 14,
          padding: 12,
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 28 }}>✏️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>
            {staff.name} 출퇴근 기록
          </div>
          <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>
            📅 {formatKoreanDate(date)}
          </div>
        </div>
      </div>

      {/* 출근 날짜 */}
      <Section label="📅 출근 날짜">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            width: "100%",
            background: T.input,
            border: `1px solid ${T.borderBright}`,
            color: T.textPrimary,
            padding: 12,
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "inherit",
            colorScheme: "dark",
          }}
        />
      </Section>

      {/* 출근 시각 */}
      <Section label="🟢 출근 시각">
        <TimeInput hh={inHH} mm={inMM} onChange={(h, m) => { setInHH(h); setInMM(m); }} accent="gold" />
      </Section>

      {/* 퇴근 시각 */}
      <Section label="🏠 퇴근 시각 (비우면 '근무 중')">
        <TimeInput hh={outHH} mm={outMM} onChange={(h, m) => { setOutHH(h); setOutMM(m); }} accent="orange" />
      </Section>

      {/* 메모 (선택) */}
      <Section label="📝 메모 (선택 · 수정 사유 등)">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예: 늦게 찍어서 수동 보정"
          style={{
            width: "100%",
            background: T.input,
            border: `1px solid ${T.borderBright}`,
            color: T.textPrimary,
            padding: 10,
            borderRadius: 10,
            fontSize: 13,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </Section>

      {/* 야간 안내 */}
      {calc?.overnight && (
        <div
          style={{
            background: "rgba(226,150,75,0.08)",
            border: "1px solid rgba(226,150,75,0.25)",
            borderRadius: 10,
            padding: 10,
            margin: "10px 0",
            fontSize: 11,
            color: T.warning,
            lineHeight: 1.5,
          }}
        >
          🌙 <b>야간 근무</b> · 퇴근이 출근보다 빠르므로 자동으로 <b>다음날</b>로
          인식해요. 기록 날짜는 출근일(<b>{date}</b>) 기준으로 저장됩니다.
        </div>
      )}

      {/* 계산 결과 */}
      {calc?.hasOut && calc.ms != null && (
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(212,165,55,0.12), rgba(212,165,55,0.03))",
            border: "1px solid rgba(212,165,55,0.3)",
            borderRadius: 14,
            padding: 14,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: T.goldSoft,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            ⏱ 총 근무시간
          </div>
          <div
            style={{
              fontFamily: T.fontMono,
              fontSize: 32,
              fontWeight: 800,
              color: T.textPrimary,
              textShadow: `0 0 20px ${T.goldGlow}`,
              lineHeight: 1,
            }}
          >
            {formatDurationShort(calc.ms)}
          </div>
          {calc.ms > 24 * 60 * 60 * 1000 && (
            <div style={{ marginTop: 6, fontSize: 11, color: T.warning }}>
              ⚠️ 24시간을 넘어요 — 시간을 다시 확인해주세요
            </div>
          )}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 12px",
            background: "rgba(226,75,74,0.1)",
            border: "1px solid rgba(226,75,74,0.3)",
            borderRadius: 10,
            fontSize: 11,
            color: T.danger,
            marginBottom: 12,
          }}
        >
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* 삭제 확인 */}
      {confirmDelete && record && (
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
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            이 기록을 삭제할까요? 되돌릴 수 없어요.
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setConfirmDelete(false)} style={cBtn(false)}>
              취소
            </button>
            <button
              onClick={async () => {
                const ok = await onDelete(record.id);
                if (ok) onBack();
              }}
              disabled={busy}
              style={cBtn(true)}
            >
              네, 삭제
            </button>
          </div>
        </Motion.div>
      )}

      {/* 액션 버튼 */}
      <div style={{ display: "flex", gap: 8 }}>
        {record && (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              background: "rgba(226,75,74,0.1)",
              border: "1px solid rgba(226,75,74,0.3)",
              color: T.danger,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Trash2 size={14} /> 삭제
          </button>
        )}
        <button
          onClick={onBack}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 12,
            background: "transparent",
            border: `1px solid ${T.borderBright}`,
            color: T.textSecondary,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          취소
        </button>
        <Motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={busy}
          style={{
            flex: 1.4,
            padding: 12,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${T.goldSoft}, ${T.goldDeep})`,
            border: "none",
            color: "#1a1206",
            fontWeight: 800,
            fontSize: 13,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.6 : 1,
            fontFamily: "inherit",
          }}
        >
          ✓ 저장
        </Motion.button>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: T.textSecondary,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function cBtn(primary) {
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

function pad(n) {
  return String(n).padStart(2, "0");
}
function toInt(v) {
  if (v === "" || v == null) return NaN;
  return Number(v);
}
function inRange(n, lo, hi) {
  return Number.isInteger(n) && n >= lo && n <= hi;
}

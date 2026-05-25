import { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { Lock } from "lucide-react";
import { T } from "./attendanceTheme";
import ScreenHeader from "./ScreenHeader";
import { kstClock } from "../utils/timeCalc";
import { formatKoreanDateFromInstant } from "../utils/dateFormat";

// 화면 1 — 진입 (직원 / 관리자 선택) + 현재 시각
export default function AttendanceEntry({ onStaff, onAdmin, onBack }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div>
      <ScreenHeader title="근태관리" subtitle="관리 페이지" onBack={onBack} />

      <div style={{ textAlign: "center", padding: "24px 0 20px" }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>⏰</div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 300,
            letterSpacing: 1,
            color: T.textPrimary,
            fontFamily: T.fontDisplay,
          }}
        >
          출퇴근 <span style={{ color: T.gold }}>시스템</span>
        </div>
        <div style={{ color: T.textSecondary, fontSize: 12, marginTop: 4 }}>
          누구로 들어갈래요?
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <EntryCard
          icon="👤"
          iconBg={`linear-gradient(135deg, ${T.goldSoft}, ${T.goldDeep})`}
          title="직원"
          desc="출퇴근 찍기 / 내 기록 보기"
          accent={T.gold}
          onClick={onStaff}
        />
        <EntryCard
          icon="👑"
          iconBg={`linear-gradient(135deg, ${T.orangeSoft}, ${T.orangeDeep})`}
          title="관리자"
          desc="전체 알바 시간 조회 / 수정"
          accent={T.warning}
          lock
          onClick={onAdmin}
        />
      </div>

      <div
        style={{
          marginTop: 24,
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: 14,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: T.textSecondary,
            letterSpacing: 2,
            marginBottom: 4,
          }}
        >
          현재 시각
        </div>
        <div
          style={{
            fontFamily: T.fontMono,
            fontSize: 24,
            fontWeight: 700,
            color: T.goldSoft,
          }}
        >
          {kstClock(now)}
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
          {formatKoreanDateFromInstant(now)}
        </div>
      </div>
    </div>
  );
}

function EntryCard({ icon, iconBg, title, desc, accent, lock, onClick }) {
  return (
    <Motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, ${hexA(accent, 0.1)}, ${hexA(accent, 0.02)})`,
        border: `1px solid ${hexA(accent, 0.3)}`,
        borderRadius: 16,
        padding: 20,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary }}>
          {title}
        </div>
        <div
          style={{ fontSize: 11, color: T.textSecondary, marginTop: 3, lineHeight: 1.5 }}
        >
          {desc}
        </div>
        {lock && (
          <div
            style={{
              fontSize: 9,
              color: T.warning,
              marginTop: 5,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Lock size={10} /> 비밀번호 필요
          </div>
        )}
      </div>
      <span style={{ color: T.textMuted, fontSize: 20 }}>→</span>
    </Motion.button>
  );
}

// "#RRGGBB" + alpha → rgba()
function hexA(hex, a) {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

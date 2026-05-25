import { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { Lock, AlertTriangle } from "lucide-react";
import { T } from "./attendanceTheme";
import ScreenHeader from "./ScreenHeader";
import PinKeypad from "./PinKeypad";
import { useAdminAuth } from "../hooks/useAdminAuth";

// 화면 3 — 관리자 PIN 인증
export default function AttendanceAdminAuth({ onBack, onSuccess }) {
  const { configured, error, locked, lockRemainingSec, submit, clearError } =
    useAdminAuth();
  const [pin, setPin] = useState("");

  // 4자리 채워지면 자동 제출
  useEffect(() => {
    if (pin.length === 4) {
      const ok = submit(pin);
      if (ok) onSuccess();
      else setTimeout(() => setPin(""), 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const onKey = (d) => {
    if (locked || pin.length >= 4) return;
    clearError();
    setPin((p) => (p + d).slice(0, 4));
  };
  const onBackspace = () => setPin((p) => p.slice(0, -1));
  const onClear = () => setPin("");

  return (
    <div>
      <ScreenHeader title="관리자 인증" subtitle="사장님 전용" onBack={onBack} />

      <div style={{ textAlign: "center", padding: "28px 0 22px" }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>🔒</div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 300,
            letterSpacing: 3,
            color: T.gold,
            fontFamily: T.fontDisplay,
            marginBottom: 6,
          }}
        >
          PASSWORD
        </div>
        <div style={{ color: T.textSecondary, fontSize: 12 }}>
          관리자 비밀번호 4자리 입력
        </div>
      </div>

      {!configured ? (
        <Notice
          icon={<AlertTriangle size={14} />}
          color={T.danger}
          text="PIN이 설정되지 않았어요. .env에 VITE_ATTENDANCE_ADMIN_PIN을 추가해주세요."
        />
      ) : (
        <>
          <PinKeypad
            value={pin}
            onKey={onKey}
            onBackspace={onBackspace}
            onClear={onClear}
            disabled={locked}
          />

          {locked && (
            <Notice
              icon={<Lock size={14} />}
              color={T.warning}
              text={`너무 많이 틀렸어요 · ${lockRemainingSec}초 후 다시 시도`}
            />
          )}
          {!locked && error && (
            <Motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Notice icon={<AlertTriangle size={14} />} color={T.danger} text={error} />
            </Motion.div>
          )}
        </>
      )}
    </div>
  );
}

function Notice({ icon, color, text }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: "10px 12px",
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${color}55`,
        borderRadius: 10,
        fontSize: 11,
        color,
        display: "flex",
        alignItems: "center",
        gap: 8,
        lineHeight: 1.5,
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}

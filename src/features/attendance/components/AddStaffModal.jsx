import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { T } from "./attendanceTheme";

// 알바 추가 인라인 폼 (이름만 — 입사일 등은 추후 상세에서)
export default function AddStaffModal({ onAdd, onCancel, busy }) {
  const [name, setName] = useState("");

  const submit = async () => {
    if (!name.trim() || busy) return;
    const ok = await onAdd(name.trim());
    if (ok) setName("");
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        marginTop: 12,
        background:
          "linear-gradient(135deg, rgba(212,165,55,0.1), rgba(212,165,55,0.02))",
        border: `1px dashed ${T.gold}`,
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: T.goldSoft,
          letterSpacing: 1,
          marginBottom: 8,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        + 새 알바 추가
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="이름 입력 (예: 박지훈)"
        style={{
          width: "100%",
          background: T.input,
          border: `1px solid ${T.borderBright}`,
          color: T.textPrimary,
          padding: 10,
          borderRadius: 10,
          fontSize: 14,
          marginBottom: 8,
          outline: "none",
          fontFamily: "inherit",
        }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 8,
            background: "transparent",
            border: `1px solid ${T.borderBright}`,
            color: T.textSecondary,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          취소
        </button>
        <button
          onClick={submit}
          disabled={busy || !name.trim()}
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 8,
            background: T.gold,
            border: "none",
            color: "#1a1206",
            fontSize: 11,
            fontWeight: 700,
            cursor: busy || !name.trim() ? "not-allowed" : "pointer",
            opacity: busy || !name.trim() ? 0.6 : 1,
            fontFamily: "inherit",
          }}
        >
          ✓ 추가
        </button>
      </div>
    </Motion.div>
  );
}

import { useRef } from "react";
import { T } from "./attendanceTheme";

// 시:분 입력 (HH : MM). 숫자만, 2자리. HH 2자리 채우면 MM으로 자동 이동.
// props: hh, mm (string), onChange(hh, mm), accent("gold"|"orange")
export default function TimeInput({ hh, mm, onChange, accent = "gold" }) {
  const mmRef = useRef(null);
  const color = accent === "orange" ? T.orange : T.gold;

  const sanitize = (v) => v.replace(/[^0-9]/g, "").slice(0, 2);

  const handleHH = (e) => {
    const v = sanitize(e.target.value);
    onChange(v, mm);
    if (v.length === 2) mmRef.current?.focus();
  };
  const handleMM = (e) => onChange(hh, sanitize(e.target.value));

  const boxStyle = (val) => ({
    flex: 1,
    background: T.input,
    border: `1.5px solid ${val ? color : T.borderBright}`,
    color: val ? color : T.textPrimary,
    padding: 14,
    borderRadius: 10,
    fontSize: 22,
    fontWeight: 700,
    fontFamily: T.fontMono,
    textAlign: "center",
    outline: "none",
    minWidth: 0,
  });

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="HH"
        value={hh}
        onChange={handleHH}
        style={boxStyle(hh)}
      />
      <span
        style={{
          fontFamily: T.fontMono,
          fontSize: 22,
          fontWeight: 700,
          color: T.textMuted,
        }}
      >
        :
      </span>
      <input
        ref={mmRef}
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="MM"
        value={mm}
        onChange={handleMM}
        style={boxStyle(mm)}
      />
    </div>
  );
}

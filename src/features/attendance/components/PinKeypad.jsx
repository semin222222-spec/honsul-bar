import { motion as Motion } from "framer-motion";
import { Delete } from "lucide-react";
import { T } from "./attendanceTheme";

// 4자리 PIN 입력 박스 + 키패드. 입력값은 ● 마스킹.
// props: value(string), onKey(digit), onBackspace(), onClear(), disabled
export default function PinKeypad({
  value = "",
  onKey,
  onBackspace,
  onClear,
  disabled = false,
}) {
  const boxes = [0, 1, 2, 3];

  const keyStyle = (action) => ({
    background: action ? "transparent" : T.card,
    border: action ? "none" : `1px solid ${T.border}`,
    color: action ? T.textMuted : T.textPrimary,
    fontSize: action ? 13 : 22,
    fontWeight: 700,
    padding: 14,
    borderRadius: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: T.fontMono,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  return (
    <div>
      {/* PIN 박스 */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 18,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: T.textSecondary,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 10,
            textAlign: "center",
          }}
        >
          PIN 입력
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          {boxes.map((i) => {
            const filled = i < value.length;
            const cursor = i === value.length && !disabled;
            return (
              <Motion.div
                key={i}
                animate={cursor ? { borderColor: [T.gold, T.borderBright, T.gold] } : {}}
                transition={cursor ? { duration: 1, repeat: Infinity } : {}}
                style={{
                  width: 50,
                  height: 60,
                  borderRadius: 12,
                  background: filled ? "rgba(212,165,55,0.08)" : T.input,
                  border: `1.5px solid ${filled || cursor ? T.gold : T.borderBright}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: T.fontMono,
                  fontSize: 24,
                  fontWeight: 700,
                  color: T.gold,
                }}
              >
                {filled ? "●" : ""}
              </Motion.div>
            );
          })}
        </div>
      </div>

      {/* 키패드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginTop: 16,
        }}
      >
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
          <Motion.button
            key={n}
            whileTap={disabled ? undefined : { scale: 0.94 }}
            onClick={() => !disabled && onKey?.(n)}
            disabled={disabled}
            style={keyStyle(false)}
          >
            {n}
          </Motion.button>
        ))}
        <Motion.button
          whileTap={disabled ? undefined : { scale: 0.94 }}
          onClick={() => !disabled && onClear?.()}
          disabled={disabled}
          style={keyStyle(true)}
        >
          초기화
        </Motion.button>
        <Motion.button
          whileTap={disabled ? undefined : { scale: 0.94 }}
          onClick={() => !disabled && onKey?.("0")}
          disabled={disabled}
          style={keyStyle(false)}
        >
          0
        </Motion.button>
        <Motion.button
          whileTap={disabled ? undefined : { scale: 0.94 }}
          onClick={() => !disabled && onBackspace?.()}
          disabled={disabled}
          style={keyStyle(true)}
        >
          <Delete size={18} />
        </Motion.button>
      </div>
    </div>
  );
}

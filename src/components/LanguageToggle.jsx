import { motion } from "framer-motion";
import { useLocale } from "../lib/LocaleContext";

/**
 * LanguageToggle
 * - 🇰🇷 / 🇯🇵 토글 버튼
 * - 클릭하면 언어 변경
 *
 * @param {string} variant - "compact" (작게) | "full" (크게, 입장 화면용)
 */
export default function LanguageToggle({ variant = "compact" }) {
  const { locale, setLocale } = useLocale();

  if (variant === "full") {
    // 입장 화면용 - 큰 버튼
    return (
      <div style={{
        display: "flex",
        gap: 8,
        justifyContent: "center",
        marginBottom: 16,
      }}>
        <LangButton
          active={locale === "ko"}
          onClick={() => setLocale("ko")}
          flag="🇰🇷"
          label="한국어"
          big
        />
        <LangButton
          active={locale === "ja"}
          onClick={() => setLocale("ja")}
          flag="🇯🇵"
          label="日本語"
          big
        />
      </div>
    );
  }

  // 헤더용 - 작은 토글
  return (
    <div style={{
      display: "inline-flex",
      gap: 2,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8,
      padding: 2,
    }}>
      <LangButton
        active={locale === "ko"}
        onClick={() => setLocale("ko")}
        flag="🇰🇷"
        label="KO"
      />
      <LangButton
        active={locale === "ja"}
        onClick={() => setLocale("ja")}
        flag="🇯🇵"
        label="JA"
      />
    </div>
  );
}

function LangButton({ active, onClick, flag, label, big = false }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: big ? 8 : 4,
        padding: big ? "10px 18px" : "6px 10px",
        background: active
          ? "linear-gradient(135deg, rgba(212,165,55,0.2), rgba(180,120,30,0.08))"
          : "transparent",
        border: big
          ? `1px solid ${active ? "rgba(212,165,55,0.4)" : "rgba(255,255,255,0.08)"}`
          : "none",
        borderRadius: big ? 9 : 6,
        color: active ? "#D4A537" : "rgba(255,255,255,0.5)",
        fontSize: big ? 13 : 10,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: big ? 18 : 12 }}>{flag}</span>
      <span>{label}</span>
    </motion.button>
  );
}

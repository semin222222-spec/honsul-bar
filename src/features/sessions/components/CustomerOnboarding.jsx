import { useState, useCallback } from "react";
import { motion as Motion } from "framer-motion";
import { sessionRepository } from "@/repositories/sessions/sessionRepository";
import { useLocale } from "@/shared/i18n/LocaleContext";
import LanguageToggle from "@/shared/ui/LanguageToggle";

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

const PAGE_BG = "#0F0E0D";
const CARD_BG = "#1A1816";
const INK = "#F0E8D8";
const INK_SOFT = "#B8AB95";
const INK_MUTE = "#7A7165";
const INK_DIM = "#4A453E";
const GOLD = "#C9A66B";
const GOLD_BRIGHT = "#D9B97A";
const QUIET = "#7CA8D1";
const PARTY = "#E8995F";
const LINE = "rgba(240,232,216,0.06)";
const LINE_STRONG = "rgba(240,232,216,0.12)";

export default function CustomerOnboarding({
  storeId,
  sessionId,
  seatLabel,
  onComplete,
}) {
  const { t } = useLocale();
  const [mbti, setMbti] = useState(null);
  const [mood, setMood] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const persist = useCallback(
    async (payload) => {
      if (!storeId || !sessionId) {
        onComplete?.();
        return;
      }
      setSubmitting(true);
      try {
        await sessionRepository.updateSessionOnboarding({
          storeId,
          sessionId,
          mbti: payload.mbti,
          mood: payload.mood,
        });
      } catch (error) {
        console.error("[Onboarding] update failed:", error);
      } finally {
        setSubmitting(false);
        onComplete?.();
      }
    },
    [storeId, sessionId, onComplete],
  );

  const handleEnter = () => persist({ mbti, mood });
  const handleSkip = () => persist({ mbti: null, mood: null });

  const toggleMbti = (code) => {
    setMbti((prev) => (prev === code ? null : code));
  };

  const pickUnknown = () => {
    setMbti((prev) => (prev === "unknown" ? null : "unknown"));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PAGE_BG,
        color: INK,
        fontFamily: "'Noto Sans KR', var(--font-sans), system-ui, sans-serif",
        paddingTop: "max(16px, env(safe-area-inset-top))",
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
      }}
    >
      <div
        style={{
          maxWidth: 430,
          margin: "0 auto",
          padding: "0 20px",
        }}
      >
        {/* 언어 토글 */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 16,
          }}
        >
          <LanguageToggle variant="compact" />
        </div>

        {/* 히어로 */}
        <Motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{ textAlign: "center", marginBottom: 28 }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🥃</div>
          <div
            style={{
              fontSize: 36,
              fontFamily: "'Noto Serif KR', serif",
              fontWeight: 600,
              color: INK,
              letterSpacing: "0.01em",
              lineHeight: 1.15,
            }}
          >
            {t("onboarding.heroTitle")}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: GOLD,
              letterSpacing: "0.06em",
              fontFamily: "'Noto Serif KR', serif",
            }}
          >
            {t("onboarding.heroSubtitle")}
          </div>
          <div
            style={{
              width: 32,
              height: 1,
              background: GOLD,
              opacity: 0.6,
              margin: "18px auto 0",
            }}
          />
        </Motion.div>

        {/* 환영 카피 */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              fontSize: 16,
              color: INK,
              fontFamily: "'Noto Serif KR', serif",
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            {t("onboarding.welcomeLine1")}
          </div>
          <div
            style={{
              fontSize: 12,
              color: INK_SOFT,
              lineHeight: 1.6,
              marginBottom: 12,
            }}
          >
            {t("onboarding.welcomeLine2")}
          </div>
          {seatLabel && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 999,
                background: "rgba(201,166,107,0.08)",
                border: `1px solid ${LINE_STRONG}`,
                color: GOLD,
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.04em",
              }}
            >
              {t("onboarding.selectedSeat")} · {seatLabel}
            </div>
          )}
        </div>

        {/* 무드 섹션 */}
        <SectionLabel>{t("onboarding.moodLabel")}</SectionLabel>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 28,
          }}
        >
          <MoodCard
            kind="quiet"
            active={mood === "quiet"}
            onClick={() => setMood(mood === "quiet" ? null : "quiet")}
            title={t("onboarding.moodQuietTitle")}
            sub={t("onboarding.moodQuietSub")}
            icon="🥃"
          />
          <MoodCard
            kind="party"
            active={mood === "party"}
            onClick={() => setMood(mood === "party" ? null : "party")}
            title={t("onboarding.moodPartyTitle")}
            sub={t("onboarding.moodPartySub")}
            icon="✨"
          />
        </div>

        {/* MBTI 섹션 */}
        <SectionLabel>{t("onboarding.mbtiLabel")}</SectionLabel>
        <div
          style={{
            fontSize: 11,
            color: INK_MUTE,
            marginBottom: 10,
          }}
        >
          {t("onboarding.mbtiHelp")}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            marginBottom: 10,
          }}
        >
          {MBTI_TYPES.map((code) => {
            const active = mbti === code;
            return (
              <Motion.button
                key={code}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleMbti(code)}
                style={{
                  aspectRatio: "1 / 1",
                  minHeight: 44,
                  borderRadius: 10,
                  border: `1px solid ${active ? GOLD : LINE_STRONG}`,
                  background: active ? "rgba(201,166,107,0.18)" : CARD_BG,
                  color: active ? GOLD_BRIGHT : INK_SOFT,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.02em",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                  transition: "background 0.15s, color 0.15s, border-color 0.15s",
                }}
              >
                {code}
              </Motion.button>
            );
          })}
        </div>
        <button
          onClick={pickUnknown}
          style={{
            width: "100%",
            minHeight: 44,
            borderRadius: 10,
            border: `1px dashed ${mbti === "unknown" ? GOLD : LINE_STRONG}`,
            background: mbti === "unknown" ? "rgba(201,166,107,0.10)" : "transparent",
            color: mbti === "unknown" ? GOLD_BRIGHT : INK_MUTE,
            fontSize: 12,
            fontWeight: mbti === "unknown" ? 600 : 500,
            cursor: "pointer",
            marginBottom: 28,
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {t("onboarding.mbtiUnknown")}
        </button>

        {/* 액션 */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleSkip}
            disabled={submitting}
            style={{
              flex: 0,
              padding: "0 18px",
              minHeight: 48,
              borderRadius: 12,
              border: `1px solid ${LINE_STRONG}`,
              background: "transparent",
              color: INK_MUTE,
              fontSize: 12,
              fontWeight: 500,
              cursor: submitting ? "default" : "pointer",
              fontFamily: "inherit",
              opacity: submitting ? 0.5 : 1,
              WebkitTapHighlightColor: "transparent",
              whiteSpace: "nowrap",
            }}
          >
            {t("onboarding.skip")}
          </button>
          <Motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleEnter}
            disabled={submitting}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
              color: "#1A1207",
              fontSize: 14,
              fontWeight: 700,
              cursor: submitting ? "default" : "pointer",
              fontFamily: "inherit",
              opacity: submitting ? 0.7 : 1,
              WebkitTapHighlightColor: "transparent",
              letterSpacing: "0.02em",
            }}
          >
            {submitting ? t("onboarding.entering") : t("onboarding.enter")}
          </Motion.button>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 10,
            color: INK_DIM,
            letterSpacing: "0.04em",
          }}
        >
          {t("onboarding.privacyNote")}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        fontSize: 11,
        color: GOLD,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      <span style={{ width: 16, height: 1, background: GOLD, opacity: 0.5 }} />
      {children}
    </div>
  );
}

function MoodCard({ kind, active, onClick, title, sub, icon }) {
  const accent = kind === "quiet" ? QUIET : PARTY;
  const accentSoft =
    kind === "quiet"
      ? "rgba(124,168,209,0.12)"
      : "rgba(232,153,95,0.12)";
  const accentBorder =
    kind === "quiet"
      ? "rgba(124,168,209,0.4)"
      : "rgba(232,153,95,0.4)";

  return (
    <Motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 16px",
        minHeight: 76,
        borderRadius: 14,
        border: `1px solid ${active ? accentBorder : LINE_STRONG}`,
        background: active
          ? `linear-gradient(135deg, ${accentSoft}, ${CARD_BG})`
          : CARD_BG,
        color: INK,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        WebkitTapHighlightColor: "transparent",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: active ? accentSoft : "rgba(255,255,255,0.03)",
          border: `1px solid ${active ? accentBorder : LINE}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: INK,
            marginBottom: 3,
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 11, color: INK_SOFT, lineHeight: 1.4 }}>
          {sub}
        </div>
      </div>
      <div
        aria-hidden
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: `1.5px solid ${active ? accent : LINE_STRONG}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {active && (
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: accent,
            }}
          />
        )}
      </div>
    </Motion.button>
  );
}

import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";

const CARD_BG = "rgba(255,255,255,0.03)";
const CARD_BORDER = "rgba(255,255,255,0.06)";
const INK = "#F5E6C8";
const INK_SOFT = "rgba(245,230,200,0.7)";
const INK_MUTE = "rgba(255,255,255,0.45)";
const INK_DIM = "rgba(255,255,255,0.3)";
const GOLD = "#D4A537";
const GOLD_SOFT = "rgba(212,165,55,0.12)";
const GOLD_BORDER = "rgba(212,165,55,0.25)";
const QUIET = "#7CA8D1";
const QUIET_SOFT = "rgba(124,168,209,0.14)";
const QUIET_BORDER = "rgba(124,168,209,0.35)";
const PARTY = "#E8995F";
const PARTY_SOFT = "rgba(232,153,95,0.14)";
const PARTY_BORDER = "rgba(232,153,95,0.35)";

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function durationLabel(iso, now) {
  if (!iso) return "-";
  const diffMin = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function shortId(id) {
  if (!id) return "?????";
  return id.replace(/-/g, "").slice(0, 5);
}

export default function CustomerInsights({ sessions = [], loading = false }) {
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState("all"); // all | quiet | party

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(iv);
  }, []);

  const stats = useMemo(() => {
    const total = sessions.length;
    const quiet = sessions.filter((s) => s.mood === "quiet").length;
    const party = sessions.filter((s) => s.mood === "party").length;
    const moodless = sessions.filter((s) => !s.mood).length;
    const filledMbti = sessions.filter((s) => !!s.mbti).length;
    const filledMood = sessions.filter((s) => !!s.mood).length;
    const filledAny = sessions.filter((s) => s.mbti || s.mood).length;
    const fillRate = total > 0 ? Math.round((filledAny / total) * 100) : 0;

    const mbtiCount = {};
    sessions.forEach((s) => {
      if (s.mbti && s.mbti !== "unknown") {
        mbtiCount[s.mbti] = (mbtiCount[s.mbti] || 0) + 1;
      }
    });
    const ranked = Object.entries(mbtiCount).sort((a, b) => b[1] - a[1]);
    const maxMbti = ranked[0]?.[1] || 0;
    const topMbti = [];
    let rank = 0;
    let prevCount = null;
    let index = 0;
    for (const [code, count] of ranked) {
      index += 1;
      if (count !== prevCount) {
        rank = index;
        prevCount = count;
      }
      topMbti.push({ code, count, rank });
      if (topMbti.length >= 5) break;
    }

    return {
      total,
      quiet,
      party,
      moodless,
      filledMbti,
      filledMood,
      fillRate,
      topMbti,
      maxMbti,
    };
  }, [sessions]);

  const filtered = useMemo(() => {
    const sortFn = (a, b) => {
      const ta = a.opened_at ? new Date(a.opened_at).getTime() : 0;
      const tb = b.opened_at ? new Date(b.opened_at).getTime() : 0;
      return ta - tb;
    };
    if (filter === "quiet") {
      return [...sessions.filter((s) => s.mood === "quiet")].sort(sortFn);
    }
    if (filter === "party") {
      return [...sessions.filter((s) => s.mood === "party")].sort(sortFn);
    }
    return [...sessions].sort(sortFn);
  }, [sessions, filter]);

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 18,
        padding: "18px 18px 22px",
        marginBottom: 16,
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              color: GOLD,
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            CUSTOMER INSIGHTS · 실시간
          </div>
          <div
            style={{
              fontSize: 18,
              color: INK,
              fontFamily: "'Noto Serif KR', serif",
              fontWeight: 500,
            }}
          >
            오늘 손님 정보
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
            color={GOLD}
            label={`전체 ${stats.total}`}
          />
          <FilterButton
            active={filter === "quiet"}
            onClick={() => setFilter("quiet")}
            color={QUIET}
            label={`🥃 조용 ${stats.quiet}`}
          />
          <FilterButton
            active={filter === "party"}
            onClick={() => setFilter("party")}
            color={PARTY}
            label={`✨ 신나 ${stats.party}`}
          />
        </div>
      </div>

      {/* 빠른 통계 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0,1fr))",
          gap: 8,
          marginBottom: 18,
        }}
      >
        <StatCard
          icon="👥"
          label="현재 손님"
          value={`${stats.total}명`}
          tint="default"
        />
        <StatCard
          icon="🥃"
          label="조용히"
          value={
            stats.total > 0
              ? `${stats.quiet}명 (${Math.round((stats.quiet / stats.total) * 100)}%)`
              : "0명"
          }
          tint="quiet"
        />
        <StatCard
          icon="✨"
          label="재미있는"
          value={
            stats.total > 0
              ? `${stats.party}명 (${Math.round((stats.party / stats.total) * 100)}%)`
              : "0명"
          }
          tint="party"
        />
        <StatCard
          icon="📝"
          label="입력률"
          value={`${stats.fillRate}%`}
          tint="gold"
        />
      </div>

      {/* 손님 테이블 */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            color: INK_DIM,
            padding: "30px 0",
            fontSize: 12,
          }}
        >
          불러오는 중...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 16px",
            background: "rgba(255,255,255,0.02)",
            border: `1px dashed ${CARD_BORDER}`,
            borderRadius: 12,
            color: INK_MUTE,
            fontSize: 12,
            marginBottom: 18,
          }}
        >
          {filter === "all"
            ? "현재 접속한 손님이 없습니다"
            : "이 무드의 손님이 아직 없어요"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {filtered.map((s) => (
            <CustomerRow key={s.id} session={s} now={now} />
          ))}
        </div>
      )}

      {/* 분석 영역 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        <MoodDistribution stats={stats} />
        <MbtiTopFive stats={stats} />
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, color, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: `1px solid ${active ? color : "rgba(255,255,255,0.08)"}`,
        background: active
          ? `linear-gradient(135deg, ${color}28, transparent)`
          : "rgba(255,255,255,0.02)",
        color: active ? color : INK_MUTE,
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function StatCard({ icon, label, value, tint }) {
  const tints = {
    default: {
      bg: "rgba(255,255,255,0.03)",
      border: CARD_BORDER,
      accent: INK,
    },
    quiet: {
      bg: QUIET_SOFT,
      border: QUIET_BORDER,
      accent: QUIET,
    },
    party: {
      bg: PARTY_SOFT,
      border: PARTY_BORDER,
      accent: PARTY,
    },
    gold: {
      bg: GOLD_SOFT,
      border: GOLD_BORDER,
      accent: GOLD,
    },
  };
  const palette = tints[tint] || tints.default;

  return (
    <div
      style={{
        padding: "12px 10px",
        borderRadius: 12,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
      <div
        style={{
          fontSize: 10,
          color: INK_MUTE,
          letterSpacing: "0.04em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: palette.accent,
          fontFamily: "'Noto Serif KR', serif",
          lineHeight: 1.15,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CustomerRow({ session, now }) {
  const mood = session.mood;
  const mbti = session.mbti;
  const moodInfo =
    mood === "quiet"
      ? {
          label: "조용히 한 잔",
          icon: "🥃",
          color: QUIET,
          bg: QUIET_SOFT,
          border: QUIET_BORDER,
        }
      : mood === "party"
        ? {
            label: "재미있는 밤",
            icon: "✨",
            color: PARTY,
            bg: PARTY_SOFT,
            border: PARTY_BORDER,
          }
        : null;

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "grid",
        gridTemplateColumns:
          "auto minmax(0,1.4fr) auto minmax(0,1.2fr) minmax(72px, 0.8fr)",
        gap: 10,
        alignItems: "center",
        padding: "10px 12px",
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 12,
      }}
    >
      {/* 좌석 */}
      <div
        style={{
          padding: "5px 9px",
          borderRadius: 7,
          background: "rgba(212,165,55,0.08)",
          border: `1px solid ${GOLD_BORDER}`,
          color: GOLD,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
        }}
      >
        {session.seat_label || "?"}
      </div>

      {/* 손님 ID + 입장 시간 */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            color: INK,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          #{shortId(session.id)}
        </div>
        <div
          style={{
            fontSize: 10,
            color: INK_DIM,
            marginTop: 2,
          }}
        >
          {formatTime(session.opened_at)} 입장
        </div>
      </div>

      {/* MBTI */}
      {mbti && mbti !== "unknown" ? (
        <div
          style={{
            padding: "4px 8px",
            borderRadius: 7,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${CARD_BORDER}`,
            color: INK,
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          {mbti}
        </div>
      ) : (
        <div
          style={{
            padding: "4px 8px",
            borderRadius: 7,
            border: `1px dashed ${CARD_BORDER}`,
            color: INK_DIM,
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            whiteSpace: "nowrap",
          }}
        >
          {mbti === "unknown" ? "모름" : "미입력"}
        </div>
      )}

      {/* 오늘 기분 */}
      {moodInfo ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 9px",
            borderRadius: 999,
            background: moodInfo.bg,
            border: `1px solid ${moodInfo.border}`,
            color: moodInfo.color,
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: "nowrap",
            justifySelf: "start",
          }}
        >
          <span>{moodInfo.icon}</span>
          <span>{moodInfo.label}</span>
        </div>
      ) : (
        <div
          style={{
            padding: "4px 9px",
            borderRadius: 999,
            border: `1px dashed ${CARD_BORDER}`,
            color: INK_DIM,
            fontSize: 10,
            justifySelf: "start",
          }}
        >
          미입력
        </div>
      )}

      {/* 체류 시간 */}
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontSize: 12,
            color: INK,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
          }}
        >
          {durationLabel(session.opened_at, now)}
        </div>
        <div
          style={{
            fontSize: 9,
            color: "rgba(106,176,106,0.85)",
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 4,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#6AB06A",
              boxShadow: "0 0 6px rgba(106,176,106,0.55)",
            }}
          />
          접속 중
        </div>
      </div>
    </Motion.div>
  );
}

function MoodDistribution({ stats }) {
  const total = Math.max(1, stats.total);
  const quietPct = Math.round((stats.quiet / total) * 100);
  const partyPct = Math.round((stats.party / total) * 100);
  const moodlessPct = Math.max(0, 100 - quietPct - partyPct);

  return (
    <div
      style={{
        padding: 14,
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: INK,
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 600,
          }}
        >
          오늘 무드 분포
        </div>
        <div
          style={{
            fontSize: 9,
            color: INK_DIM,
            letterSpacing: "0.18em",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          TODAY
        </div>
      </div>

      {stats.total === 0 ? (
        <div style={{ fontSize: 11, color: INK_DIM }}>아직 데이터가 없어요</div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              height: 10,
              borderRadius: 5,
              overflow: "hidden",
              marginBottom: 10,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            {stats.quiet > 0 && (
              <div
                style={{
                  width: `${quietPct}%`,
                  background: QUIET,
                }}
                title={`조용 ${stats.quiet}명`}
              />
            )}
            {stats.party > 0 && (
              <div
                style={{
                  width: `${partyPct}%`,
                  background: PARTY,
                }}
                title={`신나 ${stats.party}명`}
              />
            )}
            {stats.moodless > 0 && (
              <div
                style={{
                  width: `${moodlessPct}%`,
                  background: "rgba(255,255,255,0.08)",
                }}
                title={`미입력 ${stats.moodless}명`}
              />
            )}
          </div>
          <LegendRow color={QUIET} label="🥃 조용히 한 잔" count={stats.quiet} />
          <LegendRow color={PARTY} label="✨ 재미있는 밤" count={stats.party} />
          <LegendRow
            color="rgba(255,255,255,0.2)"
            label="□ 미입력"
            count={stats.moodless}
            dim
          />
        </>
      )}
    </div>
  );
}

function LegendRow({ color, label, count, dim = false }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "5px 0",
        fontSize: 11,
        color: dim ? INK_DIM : INK_SOFT,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            background: color,
            flexShrink: 0,
          }}
        />
        {label}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: dim ? INK_DIM : INK,
          fontWeight: 600,
        }}
      >
        {count}명
      </span>
    </div>
  );
}

function MbtiTopFive({ stats }) {
  return (
    <div
      style={{
        padding: 14,
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: INK,
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 600,
          }}
        >
          인기 MBTI
        </div>
        <div
          style={{
            fontSize: 9,
            color: INK_DIM,
            letterSpacing: "0.18em",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          TODAY
        </div>
      </div>

      {stats.topMbti.length === 0 ? (
        <div style={{ fontSize: 11, color: INK_DIM }}>
          아직 입력된 MBTI가 없어요
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {stats.topMbti.map((item) => {
            const ratio =
              stats.maxMbti > 0 ? Math.round((item.count / stats.maxMbti) * 100) : 0;
            return (
              <div
                key={item.code}
                style={{
                  display: "grid",
                  gridTemplateColumns: "24px 56px 1fr 36px",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: INK_MUTE,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600,
                  }}
                >
                  {item.rank}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: INK,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }}
                >
                  {item.code}
                </div>
                <div
                  style={{
                    height: 8,
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${ratio}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, ${GOLD}, rgba(212,165,55,0.6))`,
                    }}
                  />
                </div>
                <div
                  style={{
                    textAlign: "right",
                    fontSize: 11,
                    color: INK_SOFT,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600,
                  }}
                >
                  {item.count}명
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

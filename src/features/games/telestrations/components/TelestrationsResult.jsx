import { useState, useMemo } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, LogOut } from "lucide-react";
import {
  pathsToSvg,
  deserializePaths,
} from "../lib/telestrationsCanvas";
import {
  sortPlayers,
  groupEntriesByChain,
} from "../lib/telestrationsChain";
import { RESULT_AUTO_DISMISS_MS } from "../lib/telestrationsRules";

/**
 * TelestrationsResult
 *   - 모든 chain 의 타임라인을 좌우 화살표로 탐색
 *   - 한 chain = 시작 단어 → 그림 → 추측 → 그림 → 추측 → ... → 최종
 *   - 방장: "한 판 더!" 버튼
 *   - 모두: "로비로 나가기"
 *   - 60초 카운트다운 자동 종료 (dismissLeftMs)
 */
export default function TelestrationsResult({
  room,
  allEntries,
  isHost,
  onResetGame,
  onLeaveRoom,
  dismissLeftMs,
}) {
  const players = useMemo(
    () => sortPlayers(room?.players || []),
    [room?.players],
  );

  const entriesByChain = useMemo(
    () => groupEntriesByChain(allEntries || []),
    [allEntries],
  );

  // 타임라인 표시할 체인 목록 (chain_starter 가 players 에 있어야 표시)
  const chains = useMemo(() => {
    return players
      .map((starter) => ({
        starter,
        entries: entriesByChain.get(starter.session_id) || [],
      }))
      .filter((c) => c.entries.length > 0);
  }, [players, entriesByChain]);

  const [chainIdx, setChainIdx] = useState(0);
  const safeChainIdx = Math.min(chainIdx, Math.max(0, chains.length - 1));
  const currentChain = chains[safeChainIdx];

  const handlePrev = () =>
    setChainIdx((i) => (i - 1 + chains.length) % chains.length);
  const handleNext = () =>
    setChainIdx((i) => (i + 1) % chains.length);

  const dismissSeconds =
    dismissLeftMs !== null && dismissLeftMs !== undefined
      ? Math.ceil(dismissLeftMs / 1000)
      : Math.ceil(RESULT_AUTO_DISMISS_MS / 1000);

  if (chains.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          color: "rgba(255,255,255,0.5)",
          fontFamily: "'Noto Serif KR', serif",
        }}
      >
        결과 데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "16px clamp(16px, 4vw, 24px) 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* 헤더 */}
      <div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: "rgba(212,165,55,0.7)",
            marginBottom: 6,
          }}
        >
          RESULT
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 300,
            color: "#F5E6C8",
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          {currentChain.starter.seat_label} 님의 단어는?
        </div>
      </div>

      {/* 시작 단어 → 최종 단어 (요약) */}
      <div
        style={{
          padding: "12px 14px",
          background: "rgba(212,165,55,0.08)",
          border: "1px solid rgba(212,165,55,0.25)",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          fontFamily: "'Noto Serif KR', serif",
        }}
      >
        <div style={{ textAlign: "center", flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.15em",
              color: "rgba(212,165,55,0.7)",
              marginBottom: 2,
            }}
          >
            시작
          </div>
          <div style={{ fontSize: 14, color: "#D4A537", fontWeight: 600 }}>
            {currentChain.starter.initial_word || "—"}
          </div>
        </div>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>→</span>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.15em",
              color: "rgba(122,232,181,0.7)",
              marginBottom: 2,
            }}
          >
            결과
          </div>
          <div style={{ fontSize: 14, color: "#7AE8B5", fontWeight: 600 }}>
            {getFinalGuess(currentChain.entries) || "?"}
          </div>
        </div>
      </div>

      {/* 타임라인 */}
      <AnimatePresence mode="wait">
        <Motion.div
          key={currentChain.starter.session_id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            maxHeight: 360,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {/* step 0 처음 단어 */}
          <TimelineCell
            step={-1}
            label={`${currentChain.starter.seat_label} 받은 단어`}
            kind="word"
            content={currentChain.starter.initial_word}
            isFirst
          />
          {currentChain.entries.map((e) => (
            <TimelineCell
              key={`${e.step}-${e.id}`}
              step={e.step}
              label={`${e.author_seat_label} (Step ${e.step + 1})`}
              kind={e.entry_type}
              content={
                e.entry_type === "drawing" ? e.drawing_data : e.word_content
              }
            />
          ))}
        </Motion.div>
      </AnimatePresence>

      {/* 화살표 + 인덱스 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <button
          onClick={handlePrev}
          disabled={chains.length <= 1}
          style={{
            width: 44,
            height: 36,
            borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: chains.length > 1 ? "#F0E8D8" : "rgba(255,255,255,0.25)",
            cursor: chains.length > 1 ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          {safeChainIdx + 1} / {chains.length}
        </div>
        <button
          onClick={handleNext}
          disabled={chains.length <= 1}
          style={{
            width: 44,
            height: 36,
            borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: chains.length > 1 ? "#F0E8D8" : "rgba(255,255,255,0.25)",
            cursor: chains.length > 1 ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 액션 */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <Motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onLeaveRoom}
          style={{
            flex: 1,
            padding: "12px",
            background: "rgba(226,75,74,0.08)",
            border: "1px solid rgba(226,75,74,0.25)",
            borderRadius: 10,
            color: "rgba(255,180,180,0.85)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <LogOut size={13} /> 로비로 ({dismissSeconds}초)
        </Motion.button>
        {isHost && (
          <Motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onResetGame}
            style={{
              flex: 1,
              padding: "12px",
              background:
                "linear-gradient(135deg, rgba(212,165,55,0.25), rgba(176,132,255,0.18))",
              border: "1px solid rgba(212,165,55,0.5)",
              borderRadius: 10,
              color: "#D4A537",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <RotateCcw size={13} /> 한 판 더!
          </Motion.button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 타임라인 셀
// ─────────────────────────────────────────
function TimelineCell({ step, label, kind, content, isFirst }) {
  const isDrawing = kind === "drawing";
  const accent = isFirst
    ? "#D4A537"
    : isDrawing
      ? "#B084FF"
      : "#7AE8B5";

  return (
    <div
      style={{
        padding: 10,
        background: "rgba(20,18,14,0.7)",
        border: `1px solid ${accent}33`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.1em",
          color: `${accent}cc`,
          marginBottom: 6,
          fontFamily: "'Noto Serif KR', serif",
        }}
      >
        {label}
      </div>
      {isDrawing ? (
        <div
          style={{
            width: "100%",
            aspectRatio: "1",
            maxWidth: 240,
            background: "#FAFAF6",
            borderRadius: 6,
            overflow: "hidden",
            margin: "0 auto",
          }}
          dangerouslySetInnerHTML={{
            __html: content
              ? pathsToSvg(deserializePaths(content))
              : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#999;font-size:12px">(빈 그림)</div>`,
          }}
        />
      ) : (
        <div
          style={{
            fontSize: 18,
            color: "#F0E8D8",
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 600,
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          {content || "—"}
        </div>
      )}
    </div>
  );
}

// 최종 추측 단어 (가장 마지막 word entry)
function getFinalGuess(entries) {
  if (!entries || entries.length === 0) return null;
  const words = entries.filter((e) => e.entry_type === "word");
  if (words.length === 0) {
    // 마지막 entry 가 그림이면 그 직전 단어 = 그림이 받은 마지막 단어
    return entries[entries.length - 1]?.word_content || "(그림으로 끝남)";
  }
  return words[words.length - 1].word_content;
}

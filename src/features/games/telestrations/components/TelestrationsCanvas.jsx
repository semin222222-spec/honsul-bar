import { useState, useRef, useEffect, useCallback } from "react";
import { motion as Motion } from "framer-motion";
import { Send, Undo2, Trash2 } from "lucide-react";
import {
  CANVAS_SIZE,
  DRAWING_COLORS,
} from "../lib/telestrationsRules";
import {
  serializePaths,
  normalizePoint,
  hasAnyStrokes,
} from "../lib/telestrationsCanvas";

const STROKE_WIDTHS = [2, 4, 8];

/**
 * TelestrationsCanvas
 *   - 그릴 단어 표시 (step 0: initial_word, step >=2: 직전 추측 단어)
 *   - SVG 캔버스 (320x320) + 터치/마우스 그리기
 *   - 도구: 색 8개, 굵기 3단, 되돌리기, 전체 지우기
 *   - 제출 버튼 + 타이머
 */
export default function TelestrationsCanvas({
  currentInputEntry,
  stepSecondsLeft,
  currentStep,
  totalSteps,
  onSubmit,
  submitting,
}) {
  const [paths, setPaths] = useState([]);
  const [color, setColor] = useState(DRAWING_COLORS[0]);
  const [width, setWidth] = useState(STROKE_WIDTHS[1]);
  const svgRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef(null);

  // step 바뀌면 캔버스 초기화
  useEffect(() => {
    setPaths([]);
    isDrawingRef.current = false;
    currentPathRef.current = null;
  }, [currentStep]);

  const targetWord =
    currentInputEntry?.source === "initial"
      ? currentInputEntry?.word
      : currentInputEntry?.word; // step >=2 의 경우 prev_entry.word

  const fromSeatLabel = currentInputEntry?.fromSeatLabel;
  const isFirstDrawing = currentStep === 0;
  const accent = "#B084FF";
  const timeLow = stepSecondsLeft <= 10;

  // ─────────────────────────────────────────
  // 포인터 핸들러
  // ─────────────────────────────────────────
  const getPoint = useCallback((e) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    return normalizePoint(e, rect);
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      const pt = getPoint(e);
      if (!pt) return;
      const newPath = {
        color,
        width,
        points: [pt],
      };
      currentPathRef.current = newPath;
      isDrawingRef.current = true;
      setPaths((prev) => [...prev, newPath]);
    },
    [color, width, getPoint],
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const pt = getPoint(e);
      if (!pt) return;
      const cur = currentPathRef.current;
      if (!cur) return;
      cur.points.push(pt);
      // 강제 리렌더 (배열 마지막 path 만 갱신)
      setPaths((prev) => {
        const next = prev.slice();
        next[next.length - 1] = { ...cur };
        return next;
      });
    },
    [getPoint],
  );

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
    currentPathRef.current = null;
  }, []);

  // 전역 이벤트 (드래그 중 svg 영역 벗어나도 처리)
  useEffect(() => {
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchend", handlePointerUp);
    return () => {
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [handlePointerUp]);

  // ─────────────────────────────────────────
  // 도구 액션
  // ─────────────────────────────────────────
  const handleUndo = () => {
    setPaths((prev) => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    setPaths([]);
  };

  const handleSubmit = () => {
    if (submitting) return;
    const serialized = serializePaths(paths);
    onSubmit(serialized);
  };

  const canSubmit = !submitting; // 빈 그림도 제출 허용 (빈 그림 = 패스)

  return (
    <div
      style={{
        padding: "16px clamp(16px, 4vw, 24px) 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11,
          letterSpacing: "0.15em",
        }}
      >
        <span style={{ color: `${accent}cc` }}>
          STEP {currentStep + 1}/{totalSteps} · DRAW
        </span>
        <Motion.span
          animate={timeLow ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 0.6, repeat: timeLow ? Infinity : 0 }}
          style={{
            color: timeLow ? "#E24B4A" : "#F0E8D8",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {stepSecondsLeft}초
        </Motion.span>
      </div>

      {/* 그릴 단어 */}
      <div
        style={{
          padding: "10px 14px",
          background:
            "linear-gradient(135deg, rgba(176,132,255,0.12), rgba(255,255,255,0.02))",
          border: "1px solid rgba(176,132,255,0.3)",
          borderRadius: 10,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "rgba(176,132,255,0.85)",
            letterSpacing: "0.15em",
            marginBottom: 3,
          }}
        >
          {isFirstDrawing
            ? "그릴 단어"
            : fromSeatLabel
              ? `${fromSeatLabel} 님이 추측한 단어`
              : "그릴 단어"}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "#F0E8D8",
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          {targetWord || "—"}
        </div>
      </div>

      {/* 캔버스 */}
      <div
        style={{
          width: "100%",
          aspectRatio: "1",
          maxWidth: 360,
          alignSelf: "center",
          background: "#FAFAF6",
          border: "2px solid rgba(176,132,255,0.4)",
          borderRadius: 14,
          overflow: "hidden",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            touchAction: "none",
            cursor: "crosshair",
          }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          // path 들은 dangerouslySetInnerHTML 가 아니라 React 가 직접 렌더
        >
          {paths.map((p, idx) => {
            if (!p?.points || p.points.length === 0) return null;
            let d;
            if (p.points.length === 1) {
              const pt = p.points[0];
              d = `M ${pt.x} ${pt.y} L ${pt.x} ${pt.y}`;
            } else {
              d = p.points
                .map((pt, i) =>
                  i === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`,
                )
                .join("");
            }
            return (
              <path
                key={idx}
                d={d}
                stroke={p.color}
                strokeWidth={p.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </svg>
      </div>

      {/* 도구: 색 + 굵기 + undo + clear */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* 색 */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {DRAWING_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: c,
                border:
                  color === c
                    ? "3px solid #F0E8D8"
                    : "2px solid rgba(255,255,255,0.15)",
                cursor: "pointer",
                padding: 0,
              }}
              aria-label={`색상 ${c}`}
            />
          ))}
        </div>

        {/* 굵기 + 액션 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setWidth(w)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background:
                    width === w
                      ? "rgba(212,165,55,0.18)"
                      : "rgba(255,255,255,0.04)",
                  border: `1px solid ${
                    width === w
                      ? "rgba(212,165,55,0.5)"
                      : "rgba(255,255,255,0.1)"
                  }`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
                aria-label={`굵기 ${w}`}
              >
                <div
                  style={{
                    width: w * 2.5,
                    height: w * 2.5,
                    borderRadius: "50%",
                    background:
                      width === w ? "#D4A537" : "rgba(255,255,255,0.55)",
                  }}
                />
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleUndo}
              disabled={paths.length === 0}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: paths.length ? "#F0E8D8" : "rgba(255,255,255,0.25)",
                cursor: paths.length ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
              aria-label="되돌리기"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={handleClearAll}
              disabled={paths.length === 0}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(226,75,74,0.08)",
                border: "1px solid rgba(226,75,74,0.25)",
                color: paths.length
                  ? "rgba(255,180,180,0.85)"
                  : "rgba(255,180,180,0.3)",
                cursor: paths.length ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
              aria-label="전체 지우기"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 제출 */}
      <Motion.button
        whileTap={{ scale: canSubmit ? 0.97 : 1 }}
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          padding: "14px",
          background: canSubmit
            ? "linear-gradient(135deg, #B084FF, #8c5fdb)"
            : "rgba(255,255,255,0.05)",
          border: canSubmit
            ? "1px solid rgba(176,132,255,0.6)"
            : "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          color: canSubmit ? "#0F0E0D" : "rgba(255,255,255,0.3)",
          fontSize: 14,
          fontWeight: 700,
          cursor: canSubmit ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <Send size={14} /> {submitting ? "제출 중..." : "다 그렸어요"}
      </Motion.button>

      {!hasAnyStrokes(paths) && (
        <div
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.4)",
            textAlign: "center",
          }}
        >
          빈 그림으로 제출하면 패스됩니다
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { motion as Motion } from "framer-motion";
import { Edit3, Save, RotateCcw, X, Check } from "lucide-react";
import { seatRepository } from "@/repositories/seats/seatRepository";

/**
 * FloorPlan - 평면도 형태의 좌석 배치
 *
 * v2: 컨테이너 더 큼 (1.6:1), 좌석 작게(7%) → 6개 한 줄 들어감
 *
 * 기본값:
 *  - A줄(위): ㄷ자 모양
 *  - B줄(아래): ] 모양 (좌우 반전)
 */

const SEAT_SIZE = 7; // 좌석 가로 %, 정사각형
const STEP = 8.5; // 좌석 간격 (가로 %)
const STEP_Y = 16; // 좌석 세로 간격 (%)

// 기본 위치 생성
function getDefaultLayout(rowName, seatCount, direction = "left-open") {
  const layout = {};
  const W = SEAT_SIZE;

  if (direction === "left-open") {
    // ㄷ자: 왼쪽 막힘
    // 위쪽 가로 (12~16) — 5개
    [12, 13, 14, 15, 16].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 12 + i * STEP, y: 3, w: W, h: W };
      }
    });
    // 왼쪽 세로 (11, 10, 9, 8, 7) — 5개
    [11, 10, 9, 8, 7].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 2, y: 3 + i * STEP_Y, w: W, h: W };
      }
    });
    // 아래쪽 가로 (6, 5, 4, 3, 2, 1) — 6개
    [6, 5, 4, 3, 2, 1].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 12 + i * STEP, y: 80, w: W, h: W };
      }
    });
    // 안쪽 ㄷ자 - 위 (19, 18, 17)
    [19, 18, 17].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 20 + i * STEP, y: 22, w: W, h: W };
      }
    });
    // 안쪽 세로 (20, 21)
    [20, 21].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 20, y: 39 + i * STEP_Y, w: W, h: W };
      }
    });
    // 안쪽 아래 (22, 23, 24, 25)
    [22, 23, 24, 25].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 29 + i * STEP, y: 60, w: W, h: W };
      }
    });
    // 추가 좌석 (26~30) - 오른쪽에 정렬
    for (let n = 26; n <= seatCount; n++) {
      const i = n - 26;
      layout[`${rowName}-${n}`] = {
        x: 88,
        y: 3 + i * STEP_Y,
        w: W,
        h: W,
      };
    }
  } else {
    // ] 모양: 오른쪽 막힘 (좌우 반전)
    // 위쪽 가로 (12~16) — 오른쪽 끝부터
    [12, 13, 14, 15, 16].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 81 - i * STEP, y: 3, w: W, h: W };
      }
    });
    // 오른쪽 세로 (11, 10, 9, 8, 7)
    [11, 10, 9, 8, 7].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 91, y: 3 + i * STEP_Y, w: W, h: W };
      }
    });
    // 아래쪽 가로 (6, 5, 4, 3, 2, 1) — 오른쪽부터
    [6, 5, 4, 3, 2, 1].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 81 - i * STEP, y: 80, w: W, h: W };
      }
    });
    // 안쪽 ] - 위 (19, 18, 17)
    [19, 18, 17].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 73 - i * STEP, y: 22, w: W, h: W };
      }
    });
    // 안쪽 세로 (20, 21)
    [20, 21].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 73, y: 39 + i * STEP_Y, w: W, h: W };
      }
    });
    // 안쪽 아래 (22, 23, 24, 25)
    [22, 23, 24, 25].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 64 - i * STEP, y: 60, w: W, h: W };
      }
    });
    // 추가 좌석 - 왼쪽에 정렬
    for (let n = 26; n <= seatCount; n++) {
      const i = n - 26;
      layout[`${rowName}-${n}`] = {
        x: 2,
        y: 3 + i * STEP_Y,
        w: W,
        h: W,
      };
    }
  }

  return layout;
}

function elapsedMin(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

// 한 좌석 셀
function SeatBox({
  seat,
  layout,
  session,
  sessionTotal,
  isEditMode,
  isMoveTarget,
  isMoving,
  isMergeTarget,
  isMerging,
  isDimmed,
  onClick,
  onDragMove,
  onResize,
}) {
  const isEmpty = !session;
  const inactiveMin = session?.last_active_at
    ? elapsedMin(session.last_active_at)
    : 0;
  const isInactive = !isEmpty && inactiveMin >= 30;
  const hasOrders = sessionTotal > 0;

  let style = {};
  if (isEditMode) {
    style = {
      background: "rgba(212,165,55,0.15)",
      border: "2px dashed rgba(212,165,55,0.6)",
      color: "#D4A537",
      cursor: "move",
    };
  } else if (isMoving || isMerging) {
    style = {
      background:
        "linear-gradient(135deg, rgba(100,180,220,0.3), rgba(60,120,180,0.15))",
      border: "2px solid #aac8ff",
      color: "#aac8ff",
      boxShadow: "0 0 12px rgba(100,180,220,0.4)",
    };
  } else if (isMoveTarget) {
    style = {
      background: "rgba(100,180,220,0.1)",
      border: "1px solid rgba(100,180,220,0.4)",
      color: "#aac8ff",
      cursor: "pointer",
    };
  } else if (isMergeTarget) {
    style = {
      background:
        "linear-gradient(135deg, rgba(196,122,255,0.15), rgba(140,80,200,0.08))",
      border: "1px solid rgba(196,122,255,0.5)",
      color: "#C47AFF",
      cursor: "pointer",
    };
  } else if (isDimmed) {
    style = {
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.04)",
      color: "rgba(255,255,255,0.15)",
      opacity: 0.4,
      cursor: "not-allowed",
    };
  } else if (isEmpty) {
    style = {
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.3)",
      cursor: "default",
    };
  } else if (hasOrders) {
    style = {
      background:
        "linear-gradient(135deg, rgba(226,75,74,0.2), rgba(180,40,40,0.1))",
      border: "1px solid rgba(226,75,74,0.5)",
      color: "rgba(255,180,180,0.95)",
      cursor: "pointer",
    };
  } else if (isInactive) {
    style = {
      background:
        "linear-gradient(135deg, rgba(226,150,75,0.18), rgba(180,100,40,0.1))",
      border: "1px solid rgba(226,150,75,0.45)",
      color: "rgba(255,200,130,0.95)",
      cursor: "pointer",
    };
  } else {
    style = {
      background:
        "linear-gradient(135deg, rgba(106,176,106,0.15), rgba(60,120,60,0.08))",
      border: "1px solid rgba(106,176,106,0.35)",
      color: "#6AB06A",
      cursor: "pointer",
    };
  }

  const dragStartRef = useRef(null);

  const handleMouseDown = (e) => {
    if (!isEditMode) return;
    if (e.target.classList.contains("resize-handle")) return;
    e.preventDefault();
    e.stopPropagation();

    const parent = e.currentTarget.parentElement;
    const rect = parent.getBoundingClientRect();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: layout.x,
      origY: layout.y,
      parentW: rect.width,
      parentH: rect.height,
    };

    const handleMove = (ev) => {
      if (!dragStartRef.current) return;
      const dx =
        ((ev.clientX - dragStartRef.current.startX) /
          dragStartRef.current.parentW) *
        100;
      const dy =
        ((ev.clientY - dragStartRef.current.startY) /
          dragStartRef.current.parentH) *
        100;
      const newX = Math.max(
        0,
        Math.min(100 - layout.w, dragStartRef.current.origX + dx),
      );
      const newY = Math.max(
        0,
        Math.min(100 - layout.h, dragStartRef.current.origY + dy),
      );
      onDragMove(seat, { x: newX, y: newY });
    };

    const handleUp = () => {
      dragStartRef.current = null;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const handleTouchStart = (e) => {
    if (!isEditMode) return;
    if (e.target.classList.contains("resize-handle")) return;
    e.preventDefault();
    e.stopPropagation();

    const parent = e.currentTarget.parentElement;
    const rect = parent.getBoundingClientRect();
    const t = e.touches[0];
    dragStartRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      origX: layout.x,
      origY: layout.y,
      parentW: rect.width,
      parentH: rect.height,
    };

    const handleTouchMove = (ev) => {
      if (!dragStartRef.current || !ev.touches[0]) return;
      ev.preventDefault();
      const t = ev.touches[0];
      const dx =
        ((t.clientX - dragStartRef.current.startX) /
          dragStartRef.current.parentW) *
        100;
      const dy =
        ((t.clientY - dragStartRef.current.startY) /
          dragStartRef.current.parentH) *
        100;
      const newX = Math.max(
        0,
        Math.min(100 - layout.w, dragStartRef.current.origX + dx),
      );
      const newY = Math.max(
        0,
        Math.min(100 - layout.h, dragStartRef.current.origY + dy),
      );
      onDragMove(seat, { x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      dragStartRef.current = null;
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
  };

  const handleResizeStart = (e) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();

    const isTouch = e.type === "touchstart";
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    const parent = e.currentTarget.parentElement.parentElement;
    const rect = parent.getBoundingClientRect();

    const start = {
      startX: clientX,
      startY: clientY,
      origW: layout.w,
      origH: layout.h,
      parentW: rect.width,
      parentH: rect.height,
    };

    const handleMove = (ev) => {
      const cx = ev.touches ? ev.touches[0]?.clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0]?.clientY : ev.clientY;
      if (cx === undefined || cy === undefined) return;
      if (ev.touches) ev.preventDefault();

      const dx = ((cx - start.startX) / start.parentW) * 100;
      const dy = ((cy - start.startY) / start.parentH) * 100;
      const delta = Math.max(dx, dy);
      const newSize = Math.max(4, Math.min(20, start.origW + delta));

      onResize(seat, { w: newSize, h: newSize });
    };

    const handleEnd = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
  };

  const handleClick = () => {
    if (isEditMode) return;
    if (onClick) onClick(seat);
  };

  return (
    <Motion.div
      layout={!isEditMode}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      animate={
        (isMoveTarget || isMergeTarget) && !isEditMode
          ? { scale: [1, 1.04, 1] }
          : hasOrders && !isEditMode && !isMoving && !isMerging && !isDimmed
            ? {
                boxShadow: [
                  "0 0 0 0 rgba(226,75,74,0.4)",
                  "0 0 0 4px rgba(226,75,74,0)",
                ],
              }
            : {}
      }
      transition={
        isMoveTarget || isMergeTarget
          ? { duration: 1.5, repeat: Infinity }
          : hasOrders
            ? { duration: 2, repeat: Infinity }
            : {}
      }
      style={{
        position: "absolute",
        top: `${layout.y}%`,
        left: `${layout.x}%`,
        width: `${layout.w}%`,
        aspectRatio: "1",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 2,
        textAlign: "center",
        fontFamily: "inherit",
        WebkitTapHighlightColor: "transparent",
        transition: isEditMode ? "none" : "all 0.2s",
        userSelect: "none",
        touchAction: isEditMode ? "none" : "auto",
        ...style,
      }}
    >
      <span
        style={{
          fontSize: layout.w > 8 ? 10 : 8.5,
          fontWeight: 600,
          fontFamily: "'Noto Serif KR', serif",
          lineHeight: 1,
          pointerEvents: "none",
        }}
      >
        {seat}
      </span>
      {!isEditMode && !isEmpty && hasOrders && (
        <span
          style={{
            fontSize: 7,
            opacity: 0.85,
            marginTop: 1,
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          {sessionTotal.toLocaleString()}
        </span>
      )}
      {!isEditMode && !isEmpty && !hasOrders && (
        <span
          style={{
            fontSize: 7,
            opacity: 0.6,
            marginTop: 1,
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          {elapsedMin(session.opened_at)}분
        </span>
      )}

      {isEditMode && (
        <div
          className="resize-handle"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          style={{
            position: "absolute",
            right: -3,
            bottom: -3,
            width: 12,
            height: 12,
            background: "#D4A537",
            border: "2px solid #0D0B08",
            borderRadius: "50%",
            cursor: "nwse-resize",
            zIndex: 10,
            touchAction: "none",
          }}
        />
      )}
    </Motion.div>
  );
}

// ───── 메인 FloorPlan ─────
export default function FloorPlan({
  row,
  rowDirection,
  sessionMap,
  sessionTotals,
  isEditMode,
  movingSession,
  mergingSession,
  onSeatClick,
  onLayoutChange,
}) {
  const seats = Array.from(
    { length: row.seat_count },
    (_, i) => `${row.name}-${i + 1}`,
  );

  const dbLayout = row.layout || {};
  const defaultLayout = getDefaultLayout(
    row.name,
    row.seat_count,
    rowDirection,
  );
  const initialLayout = { ...defaultLayout, ...dbLayout };

  const [editingLayout, setEditingLayout] = useState(initialLayout);

  useEffect(() => {
    if (!isEditMode) {
      const timer = setTimeout(() => {
        setEditingLayout({ ...defaultLayout, ...(row.layout || {}) });
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line
  }, [row.layout, isEditMode]);

  useEffect(() => {
    if (isEditMode && onLayoutChange) {
      onLayoutChange(row.name, editingLayout);
    }
    // eslint-disable-next-line
  }, [isEditMode]);

  const handleDragMove = useCallback(
    (seat, pos) => {
      setEditingLayout((prev) => {
        const next = { ...prev, [seat]: { ...prev[seat], ...pos } };
        if (onLayoutChange) onLayoutChange(row.name, next);
        return next;
      });
    },
    [onLayoutChange, row.name],
  );

  const handleResize = useCallback(
    (seat, size) => {
      setEditingLayout((prev) => {
        const next = { ...prev, [seat]: { ...prev[seat], ...size } };
        if (onLayoutChange) onLayoutChange(row.name, next);
        return next;
      });
    },
    [onLayoutChange, row.name],
  );

  const occupiedCount = seats.filter((s) => sessionMap.has(s)).length;

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          fontSize: 11,
          color: "rgba(212,165,55,0.6)",
          letterSpacing: "0.1em",
          fontFamily: "'Noto Serif KR', serif",
        }}
      >
        <span>{row.name}줄</span>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>
          {isEditMode ? "✏️ 편집 중" : `${occupiedCount}/${row.seat_count}석`}
        </span>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1.6 / 1" /* 🆕 2:1 → 1.6:1 (세로 더 길게) */,
          background: isEditMode
            ? "rgba(212,165,55,0.03)"
            : "rgba(255,255,255,0.02)",
          border:
            "1px solid " +
            (isEditMode ? "rgba(212,165,55,0.2)" : "rgba(255,255,255,0.06)"),
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {isEditMode && (
          <div
            style={{
              position: "absolute",
              top: 6,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 9,
              color: "rgba(212,165,55,0.5)",
              letterSpacing: "0.1em",
              pointerEvents: "none",
            }}
          >
            드래그로 이동 · 모서리 점으로 크기조절
          </div>
        )}

        {seats.map((seat) => {
          const session = sessionMap.get(seat);
          const isMoving = movingSession?.seat_label === seat;
          const isMerging = mergingSession?.seat_label === seat;
          const isMoveTarget = !isEditMode && movingSession && !session;
          const isMergeTarget =
            !isEditMode && mergingSession && session && !isMerging;
          const isDimmed =
            !isEditMode &&
            ((movingSession && session && !isMoving) ||
              (mergingSession && !session));
          return (
            <SeatBox
              key={seat}
              seat={seat}
              layout={
                editingLayout[seat] || {
                  x: 50,
                  y: 50,
                  w: SEAT_SIZE,
                  h: SEAT_SIZE,
                }
              }
              session={session}
              sessionTotal={session ? sessionTotals.get(session.id) || 0 : 0}
              isEditMode={isEditMode}
              isMoving={isMoving}
              isMerging={isMerging}
              isMoveTarget={isMoveTarget}
              isMergeTarget={isMergeTarget}
              isDimmed={isDimmed}
              onClick={onSeatClick}
              onDragMove={handleDragMove}
              onResize={handleResize}
            />
          );
        })}
      </div>
    </div>
  );
}

// ───── 레이아웃 저장 헬퍼 ─────
export async function saveLayoutToDB(rowId, layout, storeId) {
  try {
    await seatRepository.updateSeatLayout({ rowId, layout, storeId });
  } catch (error) {
    console.error("좌석 레이아웃 저장 실패:", error);
    return false;
  }
  return true;
}

export async function resetLayoutInDB(rowId, storeId) {
  try {
    await seatRepository.resetSeatLayout({ rowId, storeId });
  } catch (error) {
    console.error("좌석 레이아웃 리셋 실패:", error);
    return false;
  }
  return true;
}

export { getDefaultLayout };

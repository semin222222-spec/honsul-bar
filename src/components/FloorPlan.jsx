import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Edit3, Save, RotateCcw, X, Check } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

/**
 * FloorPlan - 평면도 형태의 좌석 배치
 *
 * 기본값:
 *  - A줄(위): ㄷ자 모양
 *  - B줄(아래): ] 모양 (좌우 반전)
 *
 * 편집 모드:
 *  - 좌석 드래그로 위치 이동
 *  - 모서리 끌어서 크기 조절
 *  - 저장 시 DB의 seat_rows.layout JSONB에 저장
 *
 * Props:
 *  - row: seat_rows 행 (id, name, seat_count, layout)
 *  - rowDirection: "left-open" (ㄷ) or "right-open" (])
 *  - sessionMap: Map<seat_label, session>
 *  - sessionTotals: Map<sessionId, total>
 *  - onSeatClick: (seat) => void
 *  - movingSession, mergingSession 등 모드 props
 */

// 기본 위치 생성 (ㄷ자 or ] 모양)
function getDefaultLayout(rowName, seatCount, direction = "left-open") {
  const layout = {};
  const W = 8.5; // 좌석 가로 (%)
  const STEP_X = 10; // 가로 간격 (%)
  const STEP_Y = 19; // 세로 간격 (%) — 18 + 1 정도

  if (direction === "left-open") {
    // ㄷ자: 왼쪽 막힘
    // 위쪽 가로 (12~16) — 5개
    [12, 13, 14, 15, 16].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 14 + i * STEP_X, y: 2, w: W, h: W };
      }
    });
    // 왼쪽 세로 (11, 10, 9, 8, 7) — 5개
    [11, 10, 9, 8, 7].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 2, y: 2 + i * STEP_Y, w: W, h: W };
      }
    });
    // 아래쪽 가로 (6, 5, 4, 3, 2, 1) — 6개
    [6, 5, 4, 3, 2, 1].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 14 + i * STEP_X, y: 78, w: W, h: W };
      }
    });
    // 안쪽 ㄷ자 - 위 (19, 18, 17)
    [19, 18, 17].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 24 + i * STEP_X, y: 23, w: W, h: W };
      }
    });
    // 안쪽 세로 (20, 21)
    [20, 21].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 24, y: 42 + i * 18, w: W, h: W };
      }
    });
    // 안쪽 아래 (22, 23, 24, 25)
    [22, 23, 24, 25].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 34 + i * STEP_X, y: 58, w: W, h: W };
      }
    });
    // 추가 좌석 (26~30 등 여분)
    for (let n = 26; n <= seatCount; n++) {
      layout[`${rowName}-${n}`] = {
        x: 14 + ((n - 26) % 6) * STEP_X,
        y: 40 + Math.floor((n - 26) / 6) * STEP_Y,
        w: W, h: W,
      };
    }
  } else {
    // ] 모양: 오른쪽 막힘 (좌우 반전)
    // 위쪽 가로 (12~16) — 오른쪽 끝부터
    [12, 13, 14, 15, 16].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 79 - i * STEP_X, y: 2, w: W, h: W };
      }
    });
    // 오른쪽 세로 (11, 10, 9, 8, 7)
    [11, 10, 9, 8, 7].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 90, y: 2 + i * STEP_Y, w: W, h: W };
      }
    });
    // 아래쪽 가로 (1, 2, 3, 4, 5, 6)
    [6, 5, 4, 3, 2, 1].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 79 - i * STEP_X, y: 78, w: W, h: W };
      }
    });
    // 안쪽 ] - 위 (17, 18, 19)
    [19, 18, 17].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 69 - i * STEP_X, y: 23, w: W, h: W };
      }
    });
    // 안쪽 세로 (20, 21)
    [20, 21].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 69, y: 42 + i * 18, w: W, h: W };
      }
    });
    // 안쪽 아래 (22, 23, 24, 25)
    [22, 23, 24, 25].forEach((n, i) => {
      if (n <= seatCount) {
        layout[`${rowName}-${n}`] = { x: 59 - i * STEP_X, y: 58, w: W, h: W };
      }
    });
    // 추가 좌석
    for (let n = 26; n <= seatCount; n++) {
      layout[`${rowName}-${n}`] = {
        x: 60 - ((n - 26) % 6) * STEP_X,
        y: 40 + Math.floor((n - 26) / 6) * STEP_Y,
        w: W, h: W,
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
  seat, layout, session, sessionTotal,
  isEditMode, isMoveTarget, isMoving, isMergeTarget, isMerging, isDimmed,
  onClick, onDragMove, onResize,
}) {
  const isEmpty = !session;
  const inactiveMin = session?.last_active_at
    ? Math.floor((Date.now() - new Date(session.last_active_at).getTime()) / 60000)
    : 0;
  const isInactive = !isEmpty && inactiveMin >= 30;
  const hasOrders = sessionTotal > 0;

  // 색상 결정
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
      background: "linear-gradient(135deg, rgba(100,180,220,0.3), rgba(60,120,180,0.15))",
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
      background: "linear-gradient(135deg, rgba(196,122,255,0.15), rgba(140,80,200,0.08))",
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
      background: "linear-gradient(135deg, rgba(226,75,74,0.2), rgba(180,40,40,0.1))",
      border: "1px solid rgba(226,75,74,0.5)",
      color: "rgba(255,180,180,0.95)",
      cursor: "pointer",
    };
  } else if (isInactive) {
    style = {
      background: "linear-gradient(135deg, rgba(226,150,75,0.18), rgba(180,100,40,0.1))",
      border: "1px solid rgba(226,150,75,0.45)",
      color: "rgba(255,200,130,0.95)",
      cursor: "pointer",
    };
  } else {
    style = {
      background: "linear-gradient(135deg, rgba(106,176,106,0.15), rgba(60,120,60,0.08))",
      border: "1px solid rgba(106,176,106,0.35)",
      color: "#6AB06A",
      cursor: "pointer",
    };
  }

  // 드래그 시작 (편집 모드)
  const dragStartRef = useRef(null);
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    if (!isEditMode) return;
    // 리사이즈 핸들 클릭은 별도 처리
    if (e.target.classList.contains("resize-handle")) return;
    e.preventDefault();
    e.stopPropagation();

    const parent = e.currentTarget.parentElement; // floor-plan
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
      const dx = ((ev.clientX - dragStartRef.current.startX) / dragStartRef.current.parentW) * 100;
      const dy = ((ev.clientY - dragStartRef.current.startY) / dragStartRef.current.parentH) * 100;
      const newX = Math.max(0, Math.min(100 - layout.w, dragStartRef.current.origX + dx));
      const newY = Math.max(0, Math.min(100 - layout.h, dragStartRef.current.origY + dy));
      onDragMove(seat, { x: newX, y: newY });
    };

    const handleUp = () => {
      dragStartRef.current = null;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleUp);
    };

    const handleTouchMove = (ev) => {
      if (!dragStartRef.current || !ev.touches[0]) return;
      const t = ev.touches[0];
      const dx = ((t.clientX - dragStartRef.current.startX) / dragStartRef.current.parentW) * 100;
      const dy = ((t.clientY - dragStartRef.current.startY) / dragStartRef.current.parentH) * 100;
      const newX = Math.max(0, Math.min(100 - layout.w, dragStartRef.current.origX + dx));
      const newY = Math.max(0, Math.min(100 - layout.h, dragStartRef.current.origY + dy));
      onDragMove(seat, { x: newX, y: newY });
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleUp);
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
      const dx = ((t.clientX - dragStartRef.current.startX) / dragStartRef.current.parentW) * 100;
      const dy = ((t.clientY - dragStartRef.current.startY) / dragStartRef.current.parentH) * 100;
      const newX = Math.max(0, Math.min(100 - layout.w, dragStartRef.current.origX + dx));
      const newY = Math.max(0, Math.min(100 - layout.h, dragStartRef.current.origY + dy));
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

  // 리사이즈 (편집 모드 - 모서리)
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

      // 정사각형 유지: dx와 dy 중 더 큰 변화 적용
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

  const handleClick = (e) => {
    if (isEditMode) return; // 편집 모드에서는 클릭 무시
    if (onClick) onClick(seat);
  };

  return (
    <motion.div
      layout={!isEditMode}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      animate={
        (isMoveTarget || isMergeTarget) && !isEditMode
          ? { scale: [1, 1.04, 1] }
          : (hasOrders && !isEditMode && !isMoving && !isMerging && !isDimmed)
          ? { boxShadow: ["0 0 0 0 rgba(226,75,74,0.4)", "0 0 0 4px rgba(226,75,74,0)"] }
          : {}
      }
      transition={
        (isMoveTarget || isMergeTarget)
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
      <span style={{
        fontSize: layout.w > 9 ? 10 : 9,
        fontWeight: 600,
        fontFamily: "'Noto Serif KR', serif",
        lineHeight: 1,
        pointerEvents: "none",
      }}>
        {seat}
      </span>
      {!isEditMode && !isEmpty && hasOrders && (
        <span style={{
          fontSize: 7, opacity: 0.85, marginTop: 1, lineHeight: 1,
          pointerEvents: "none",
        }}>
          {sessionTotal.toLocaleString()}
        </span>
      )}
      {!isEditMode && !isEmpty && !hasOrders && (
        <span style={{
          fontSize: 7, opacity: 0.6, marginTop: 1, lineHeight: 1,
          pointerEvents: "none",
        }}>
          {elapsedMin(session.opened_at)}분
        </span>
      )}

      {/* 리사이즈 핸들 (편집 모드만, 오른쪽 아래 모서리) */}
      {isEditMode && (
        <div
          className="resize-handle"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          style={{
            position: "absolute",
            right: -3, bottom: -3,
            width: 12, height: 12,
            background: "#D4A537",
            border: "2px solid #0D0B08",
            borderRadius: "50%",
            cursor: "nwse-resize",
            zIndex: 10,
            touchAction: "none",
          }}
        />
      )}
    </motion.div>
  );
}

// ───── 메인 FloorPlan ─────
export default function FloorPlan({
  row,                  // seat_rows 한 행
  rowDirection,         // "left-open" or "right-open"
  sessionMap,
  sessionTotals,
  isEditMode,
  movingSession,
  mergingSession,
  onSeatClick,
  onLayoutChange,       // 편집 모드 변경 시 호출
}) {
  // 좌석 리스트 생성
  const seats = Array.from(
    { length: row.seat_count },
    (_, i) => `${row.name}-${i + 1}`
  );

  // 레이아웃 가져오기 (DB → 없으면 기본값)
  const dbLayout = row.layout || {};
  const defaultLayout = getDefaultLayout(row.name, row.seat_count, rowDirection);
  const initialLayout = { ...defaultLayout, ...dbLayout };

  // 편집 중인 로컬 레이아웃 (저장 전)
  const [editingLayout, setEditingLayout] = useState(initialLayout);

  // row.layout이 외부에서 변경되면 동기화
  useEffect(() => {
    if (!isEditMode) {
      setEditingLayout({ ...defaultLayout, ...(row.layout || {}) });
    }
    // eslint-disable-next-line
  }, [row.layout, isEditMode]);

  // 편집모드 진입 시 부모에 알림
  useEffect(() => {
    if (isEditMode && onLayoutChange) {
      onLayoutChange(row.name, editingLayout);
    }
    // eslint-disable-next-line
  }, [isEditMode]);

  const handleDragMove = useCallback((seat, pos) => {
    setEditingLayout((prev) => {
      const next = { ...prev, [seat]: { ...prev[seat], ...pos } };
      if (onLayoutChange) onLayoutChange(row.name, next);
      return next;
    });
  }, [onLayoutChange, row.name]);

  const handleResize = useCallback((seat, size) => {
    setEditingLayout((prev) => {
      const next = { ...prev, [seat]: { ...prev[seat], ...size } };
      if (onLayoutChange) onLayoutChange(row.name, next);
      return next;
    });
  }, [onLayoutChange, row.name]);

  const occupiedCount = seats.filter((s) => sessionMap.has(s)).length;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 8,
        fontSize: 11, color: "rgba(212,165,55,0.6)",
        letterSpacing: "0.1em",
        fontFamily: "'Noto Serif KR', serif",
      }}>
        <span>{row.name}줄</span>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>
          {isEditMode ? "✏️ 편집 중" : `${occupiedCount}/${row.seat_count}석`}
        </span>
      </div>

      <div style={{
        position: "relative",
        width: "100%",
        aspectRatio: "2 / 1",
        background: isEditMode
          ? "rgba(212,165,55,0.03)"
          : "rgba(255,255,255,0.02)",
        border: "1px solid " + (isEditMode ? "rgba(212,165,55,0.2)" : "rgba(255,255,255,0.06)"),
        borderRadius: 12,
        overflow: "hidden",
      }}>
        {/* 편집 모드 안내 */}
        {isEditMode && (
          <div style={{
            position: "absolute",
            top: 6, left: "50%",
            transform: "translateX(-50%)",
            fontSize: 9,
            color: "rgba(212,165,55,0.5)",
            letterSpacing: "0.1em",
            pointerEvents: "none",
          }}>
            드래그로 이동 · 모서리 점으로 크기조절
          </div>
        )}

        {seats.map((seat) => {
          const session = sessionMap.get(seat);
          const isMoving = movingSession?.seat_label === seat;
          const isMerging = mergingSession?.seat_label === seat;
          const isMoveTarget = !isEditMode && movingSession && !session;
          const isMergeTarget = !isEditMode && mergingSession && session && !isMerging;
          const isDimmed = !isEditMode && (
            (movingSession && session && !isMoving) ||
            (mergingSession && !session)
          );
          return (
            <SeatBox
              key={seat}
              seat={seat}
              layout={editingLayout[seat] || { x: 50, y: 50, w: 8.5, h: 8.5 }}
              session={session}
              sessionTotal={session ? (sessionTotals.get(session.id) || 0) : 0}
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

// ───── 레이아웃 저장 헬퍼 (외부에서 import) ─────
export async function saveLayoutToDB(rowId, layout) {
  const { error } = await supabase
    .from("seat_rows")
    .update({ layout })
    .eq("id", rowId);

  if (error) {
    console.error("좌석 레이아웃 저장 실패:", error);
    return false;
  }
  return true;
}

export async function resetLayoutInDB(rowId) {
  const { error } = await supabase
    .from("seat_rows")
    .update({ layout: null })
    .eq("id", rowId);

  if (error) {
    console.error("좌석 레이아웃 리셋 실패:", error);
    return false;
  }
  return true;
}

export { getDefaultLayout };

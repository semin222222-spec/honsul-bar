import { useEffect, useRef, useState } from "react";

const COLORS = {
  ink: "#F5E6C8",
};

/**
 * CatchmindCanvas
 *
 * 좌표는 0~1 정규화해서 stroke_data에 저장 — 디바이스 사이즈가 달라도 같은 그림.
 *
 * 출제자: pointerdown → pointermove 좌표 수집 → pointerup 시 onStrokeComplete 호출.
 *         그리는 동안에는 ctx에 직접 그리고, 완료된 strokes는 부모 갱신을 기다린다.
 * 정답자: strokes 배열을 받아 캔버스에 그려준다 (읽기 전용).
 */
export default function CatchmindCanvas({
  isDrawer,
  strokes,
  onStrokeComplete,
  color = "#F5E6C8",
  width = 4,
  mode = "draw",
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // 드로잉 진행 상태
  const drawingRef = useRef(false);
  const pointsRef = useRef([]);
  const lastPointRef = useRef(null);

  // 이미 그린 stroke id 추적 (증분 렌더링용)
  const renderedIdsRef = useRef(new Set());

  const [canvasSize, setCanvasSize] = useState({ w: 320, h: 224 });

  const VIRTUAL_W = 1000;
  const VIRTUAL_H = 700;

  // 리사이즈
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor((w * VIRTUAL_H) / VIRTUAL_W));
      setCanvasSize((prev) =>
        prev.w === w && prev.h === h ? prev : { w, h },
      );
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // 렌더링: 캔버스 사이즈 변화 또는 strokes 변화 시
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const targetW = canvasSize.w * dpr;
    const targetH = canvasSize.h * dpr;

    let mustRedrawAll = false;

    // DPR 사이즈 갱신 (사이즈 바뀌면 canvas가 reset됨 → 전체 redraw 필요)
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width = `${canvasSize.w}px`;
      canvas.style.height = `${canvasSize.h}px`;
      mustRedrawAll = true;
    }

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // strokes 중 clear가 새로 들어왔으면 전체 다시
    if (!mustRedrawAll) {
      const seen = renderedIdsRef.current;
      for (const s of strokes) {
        const data = s.stroke_data || s;
        if (data.type === "clear" && s.id != null && !seen.has(s.id)) {
          mustRedrawAll = true;
          break;
        }
      }
    }

    const drawOne = (stroke) => {
      const data = stroke.stroke_data || stroke;
      if (data.type === "clear") {
        ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
        return;
      }
      const points = data.points || [];
      if (points.length === 0) return;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation =
        data.type === "erase" ? "destination-out" : "source-over";
      ctx.strokeStyle = data.color || COLORS.ink;
      ctx.lineWidth = data.width || 4;
      ctx.beginPath();
      const [first, ...rest] = points;
      ctx.moveTo(first[0] * canvasSize.w, first[1] * canvasSize.h);
      if (rest.length === 0) {
        // 한 점이면 작은 점 찍기
        ctx.lineTo(first[0] * canvasSize.w, first[1] * canvasSize.h);
      } else {
        for (const p of rest) {
          ctx.lineTo(p[0] * canvasSize.w, p[1] * canvasSize.h);
        }
      }
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    };

    if (mustRedrawAll) {
      ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
      renderedIdsRef.current = new Set();
      for (const s of strokes) {
        drawOne(s);
        if (s.id != null) renderedIdsRef.current.add(s.id);
      }
    } else {
      const seen = renderedIdsRef.current;
      for (const s of strokes) {
        if (s.id != null && seen.has(s.id)) continue;
        drawOne(s);
        if (s.id != null) seen.add(s.id);
      }
    }
  }, [strokes, canvasSize.w, canvasSize.h]);

  // ─────────────────────────────────────────
  // 출제자 포인터 이벤트
  // ─────────────────────────────────────────
  const pointFromEvent = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
  };

  const handlePointerDown = (e) => {
    if (!isDrawer) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    try {
      canvas?.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    const pt = pointFromEvent(e);
    if (!pt) return;
    drawingRef.current = true;
    pointsRef.current = [pt];
    lastPointRef.current = pt;
  };

  const handlePointerMove = (e) => {
    if (!isDrawer || !drawingRef.current) return;
    e.preventDefault();
    const pt = pointFromEvent(e);
    if (!pt) return;
    const last = lastPointRef.current;
    if (last) {
      const dx = pt[0] - last[0];
      const dy = pt[1] - last[1];
      if (Math.hypot(dx, dy) < 0.003) return;
    }
    pointsRef.current.push(pt);
    lastPointRef.current = pt;

    // 즉시 로컬에 그려서 응답성 확보
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && pointsRef.current.length >= 2) {
      const [a, b] = pointsRef.current.slice(-2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation =
        mode === "erase" ? "destination-out" : "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a[0] * canvasSize.w, a[1] * canvasSize.h);
      ctx.lineTo(b[0] * canvasSize.w, b[1] * canvasSize.h);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawer) return;
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const points = pointsRef.current;
    pointsRef.current = [];
    lastPointRef.current = null;

    try {
      canvasRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }

    if (points.length < 1) return;
    onStrokeComplete?.({
      type: mode === "erase" ? "erase" : "draw",
      color,
      width,
      points: points.length === 1 ? [points[0], points[0]] : points,
    });
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        background: "#FAF7F0",
        borderRadius: 12,
        overflow: "hidden",
        touchAction: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={isDrawer ? handlePointerDown : undefined}
        onPointerMove={isDrawer ? handlePointerMove : undefined}
        onPointerUp={isDrawer ? handlePointerUp : undefined}
        onPointerCancel={isDrawer ? handlePointerUp : undefined}
        style={{
          display: "block",
          cursor: isDrawer ? "crosshair" : "default",
          touchAction: "none",
        }}
      />
    </div>
  );
}

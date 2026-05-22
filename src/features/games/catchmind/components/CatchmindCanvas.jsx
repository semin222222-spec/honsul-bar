import { useEffect, useRef, useState, useCallback, memo } from "react";

const COLORS = {
  ink: "#F5E6C8",
};

// 그리는 도중 부분 선을 broadcast하는 최소 간격(ms). 너무 잦으면 트래픽,
// 너무 뜸하면 끊겨 보인다. ~20fps 정도.
const LIVE_THROTTLE_MS = 50;

/**
 * CatchmindCanvas
 *
 * 좌표는 0~1 정규화해서 stroke_data에 저장 — 디바이스 사이즈가 달라도 같은 그림.
 *
 * 출제자: pointerdown → pointermove 좌표 수집 → pointerup 시 onStrokeComplete 호출.
 *         그리는 동안에는 ctx에 직접 그리고, 완료된 strokes는 부모 갱신을 기다린다.
 * 정답자: strokes 배열을 받아 캔버스에 그려준다 (읽기 전용).
 */
function CatchmindCanvas({
  isDrawer,
  strokes,
  onStrokeComplete,
  onLiveStroke,
  subscribeLiveStroke,
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

  // live draw(broadcast)용 상태 (그리는 사람)
  const strokeIdRef = useRef(null);       // 현재 stroke 식별자
  const liveSentIdxRef = useRef(0);       // 마지막으로 broadcast한 point 인덱스
  const liveSentAtRef = useRef(0);        // 마지막 broadcast 시각 (throttle)

  // 캔버스 위치/크기 캐시. pointermove마다 getBoundingClientRect()를 호출하면
  // 강제 레이아웃 리플로우로 그리는 도중 렉이 생긴다. stroke 시작(pointerdown)과
  // 리사이즈 때만 측정하고, 그 사이엔 이 값을 재사용한다.
  const rectRef = useRef(null);

  // 이미 그린 stroke id 추적 (증분 렌더링용)
  const renderedIdsRef = useRef(new Set());

  const [canvasSize, setCanvasSize] = useState({ w: 320, h: 224 });
  // 보는 사람의 live draw 리스너는 render 밖에서 ctx에 직접 그리므로,
  // 좌표 스케일에 쓸 canvasSize를 ref로도 들고 있는다.
  const canvasSizeRef = useRef(canvasSize);
  useEffect(() => {
    canvasSizeRef.current = canvasSize;
  }, [canvasSize]);

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
      // 캔버스 좌표 변환용 rect 캐시도 함께 갱신 (회전/리사이즈 대응)
      rectRef.current = canvasRef.current?.getBoundingClientRect() || null;
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
  // 보는 사람: broadcast로 들어온 부분 선을 캔버스에 즉시 그린다.
  //   - render(state) 밖에서 ctx에 직접 그려 high-frequency 이벤트에도 가볍다.
  //   - 배치끼리 1점씩 겹쳐 오므로 moveTo→lineTo만으로 자연스럽게 이어진다.
  //   - 나중에 같은 선이 DB stroke로 도착해 다시 그려져도 픽셀이 같아 무해.
  // ─────────────────────────────────────────
  const drawLiveBatch = useCallback((payload) => {
    const canvas = canvasRef.current;
    const size = canvasSizeRef.current;
    if (!canvas || !size) return;
    const pts = payload?.points;
    if (!pts || pts.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation =
      payload.type === "erase" ? "destination-out" : "source-over";
    ctx.strokeStyle = payload.color || COLORS.ink;
    ctx.lineWidth = payload.width || 4;
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * size.w, pts[0][1] * size.h);
    if (pts.length === 1) {
      ctx.lineTo(pts[0][0] * size.w, pts[0][1] * size.h);
    } else {
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0] * size.w, pts[i][1] * size.h);
      }
    }
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }, []);

  useEffect(() => {
    // 그리는 사람은 로컬에 직접 그리므로 수신 불필요 (self:false라 안 오기도 함)
    if (isDrawer || !subscribeLiveStroke) return;
    const unsub = subscribeLiveStroke(drawLiveBatch);
    return unsub;
  }, [isDrawer, subscribeLiveStroke, drawLiveBatch]);

  // iOS Safari 대응: touch-action:none 만으로는 그리는 도중 페이지가
  // 스크롤되는 버그가 남는다. React 합성 pointer 이벤트의 preventDefault는
  // iOS 터치 스크롤을 못 막으므로, 출제자일 때 native(non-passive) touch
  // 리스너를 직접 걸어 캔버스 위 터치의 기본 스크롤을 확실히 차단한다.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawer) return;
    const prevent = (e) => e.preventDefault();
    canvas.addEventListener("touchstart", prevent, { passive: false });
    canvas.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", prevent);
      canvas.removeEventListener("touchmove", prevent);
    };
  }, [isDrawer]);

  // ─────────────────────────────────────────
  // 출제자 포인터 이벤트
  // ─────────────────────────────────────────
  const pointFromEvent = (e) => {
    const rect = rectRef.current;
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
  };

  // 아직 broadcast 안 한 point들을 모아 보낸다. 다음 배치가 이번 배치의
  // 마지막 점부터 시작하도록 인덱스를 한 칸 덜 올려 선이 끊기지 않게 한다.
  const flushLiveStroke = () => {
    if (!onLiveStroke) return;
    const pts = pointsRef.current;
    const batch = pts.slice(liveSentIdxRef.current);
    if (batch.length === 0) return;
    onLiveStroke({
      id: strokeIdRef.current,
      type: mode === "erase" ? "erase" : "draw",
      color,
      width,
      points: batch,
    });
    liveSentIdxRef.current = Math.max(0, pts.length - 1);
    liveSentAtRef.current = performance.now();
  };

  const handlePointerDown = (e) => {
    if (!isDrawer) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    // stroke 시작 시점에 한 번만 위치 측정 → 이후 pointermove는 캐시 재사용
    rectRef.current = canvas?.getBoundingClientRect() || null;
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
    // 새 stroke의 live broadcast 상태 초기화
    strokeIdRef.current =
      globalThis.crypto?.randomUUID?.() ||
      `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    liveSentIdxRef.current = 0;
    liveSentAtRef.current = 0;
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

    // 보는 사람에게 실시간 전송 (throttle)
    if (performance.now() - liveSentAtRef.current >= LIVE_THROTTLE_MS) {
      flushLiveStroke();
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawer) return;
    if (!drawingRef.current) return;
    drawingRef.current = false;
    // 잔여 구간을 즉시 broadcast (DB 왕복을 기다리지 않고 마지막 선까지 보이게)
    flushLiveStroke();
    const points = pointsRef.current;
    pointsRef.current = [];
    lastPointRef.current = null;
    liveSentIdxRef.current = 0;

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

// memo: 게임 중 타이머 tick(250ms)으로 부모가 초당 4번 re-render돼도,
// props(strokes/color/width/mode 등)가 그대로면 캔버스는 다시 렌더하지 않는다.
// strokes는 useCatchmindGame에서 useMemo로 참조를 안정화해 둬야 효과가 있다.
export default memo(CatchmindCanvas);

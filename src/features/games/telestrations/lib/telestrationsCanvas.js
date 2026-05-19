/**
 * 텔레스트레이션 캔버스 헬퍼
 *
 * path 데이터 구조:
 *   {
 *     color: '#1a1a1a',
 *     width: 3,
 *     points: [{x, y}, {x, y}, ...]
 *   }
 *
 * 저장: JSON 직렬화하여 telestrations_entries.drawing_data 에 text 로 저장
 * 표시: SVG path 문자열로 렌더 (라이트하고 확대해도 깨지지 않음)
 */

import { CANVAS_SIZE } from "./telestrationsRules.js";

/**
 * paths 배열 → SVG <path d="..."> elements 문자열
 *
 * 단일 점(터치만 했음)은 작은 점으로 표현 (line cap=round 활용).
 */
export function pathsToSvgPathElements(paths) {
  if (!Array.isArray(paths)) return "";
  return paths
    .map((p) => {
      if (!p || !Array.isArray(p.points) || p.points.length === 0) return "";
      const color = String(p.color || "#1a1a1a");
      const width = Number.isFinite(p.width) ? p.width : 3;

      let d;
      if (p.points.length === 1) {
        // 단일 점: 자기 자신으로 line (round cap 으로 원 모양 나옴)
        const pt = p.points[0];
        d = `M ${pt.x} ${pt.y} L ${pt.x} ${pt.y}`;
      } else {
        d = p.points
          .map((pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`))
          .join("");
      }

      return `<path d="${d}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");
}

/**
 * paths → 완성된 SVG 문자열 (viewBox 포함)
 * 결과 화면 표시에 사용. <div dangerouslySetInnerHTML> 또는 background-image 로.
 */
export function pathsToSvg(paths, size = CANVAS_SIZE) {
  const elements = pathsToSvgPathElements(paths);
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="background:#FAFAF6;width:100%;height:100%">${elements}</svg>`;
}

/**
 * 직렬화 (DB 저장용)
 */
export function serializePaths(paths) {
  if (!Array.isArray(paths)) return "[]";
  try {
    return JSON.stringify(paths);
  } catch {
    return "[]";
  }
}

/**
 * 역직렬화 (DB 로부터 복원)
 */
export function deserializePaths(data) {
  if (!data || typeof data !== "string") return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 그려진 path 가 한 개라도 있는지
 */
export function hasAnyStrokes(paths) {
  if (!Array.isArray(paths)) return false;
  return paths.some(
    (p) => p && Array.isArray(p.points) && p.points.length > 0,
  );
}

/**
 * 캔버스 좌표 정규화 — 터치/마우스 이벤트의 clientX/Y 를 SVG viewBox 좌표로 변환
 */
export function normalizePoint(event, canvasRect) {
  let clientX, clientY;
  if (event.touches && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if (event.changedTouches && event.changedTouches.length > 0) {
    clientX = event.changedTouches[0].clientX;
    clientY = event.changedTouches[0].clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }
  const x = ((clientX - canvasRect.left) / canvasRect.width) * CANVAS_SIZE;
  const y = ((clientY - canvasRect.top) / canvasRect.height) * CANVAS_SIZE;
  return {
    x: Math.max(0, Math.min(CANVAS_SIZE, x)),
    y: Math.max(0, Math.min(CANVAS_SIZE, y)),
  };
}

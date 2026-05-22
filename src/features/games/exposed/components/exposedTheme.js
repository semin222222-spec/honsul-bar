/**
 * 익명 폭로전 디자인 토큰 (시안 exposed_game_ui_v3.html 기준)
 *
 * 베이스: 다크 네이비 / 메인 포인트: 핑크(#FF2A7A) / 보조(패스): 퍼플(#9D4EFF)
 * 매운맛: 순한맛 그린(#44D97E) · 중간맛 오렌지(#FF9F40) / 위험·벌칙: 빨강
 * 한글 Pretendard, 영문·숫자 디스플레이 Bebas Neue, 숫자 mono Space Mono.
 */

export const C = {
  bgDeep: "#050810",
  bgBase: "#0a0e1a",
  bgCard: "#141a2b",
  bgInput: "#0d1322",

  ink: "#ffffff",
  sub: "#8893b8",
  muted: "#4a5578",

  pink: "#FF2A7A",
  pinkSoft: "#FF5B9A",
  pinkDeep: "#D91A5E",
  pinkGlow: "rgba(255,42,122,0.5)",

  purple: "#9D4EFF",
  purpleSoft: "#B57FFF",
  purpleDeep: "#7A2FE0",
  purpleGlow: "rgba(157,78,255,0.45)",

  gold: "#FFB627",
  danger: "#FF3D5A",
  dangerGlow: "rgba(255,61,90,0.4)",

  mild: "#44D97E",
  medium: "#FF9F40",

  border: "rgba(255,255,255,0.06)",
  borderBright: "rgba(255,255,255,0.12)",
};

export const FONTS = {
  display: "'Bebas Neue', 'Pretendard Variable', 'Pretendard', sans-serif",
  body: "'Pretendard Variable', 'Pretendard', system-ui, sans-serif",
  mono: "'Space Mono', ui-monospace, Menlo, Consolas, monospace",
};

// 자리 구분 색 8종 (시안 player-1~5 + 보강 3)
const PLAYER_PALETTE = [
  { bg: "#FF6B35", fg: "#ffffff" }, // 오렌지
  { bg: "#4A9DFF", fg: "#ffffff" }, // 블루
  { bg: "#44D97E", fg: "#06281a" }, // 그린
  { bg: "#B57FFF", fg: "#1a0633" }, // 퍼플
  { bg: "#FFB627", fg: "#2a1a00" }, // 골드
  { bg: "#FF5B9A", fg: "#3a001a" }, // 핑크
  { bg: "#5BE5E0", fg: "#002a26" }, // 틸
  { bg: "#7FB8FF", fg: "#06203a" }, // 라이트 블루
];

/**
 * 참가자 인덱스 → 자리 색 {bg, fg}.
 * @param {number} index
 */
export function playerColor(index) {
  const i =
    ((index % PLAYER_PALETTE.length) + PLAYER_PALETTE.length) %
    PLAYER_PALETTE.length;
  return PLAYER_PALETTE[i];
}

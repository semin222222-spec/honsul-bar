/**
 * 드립 배틀 디자인 토큰 (시안 drip_battle_ui.html 기준)
 *
 * 베이스: 블루블랙 / 메인 포인트: 골드(#FFB627) / 보조: 선셋 오렌지 / 위험·꼴등: 빨강
 * 한글은 Pretendard, 영문·숫자 디스플레이는 Bebas Neue, 숫자 mono는 Space Mono.
 */

export const C = {
  bgDeep: "#050810",
  bgBase: "#0a0e1a",
  bgCard: "#141a2b",
  bgCardElev: "#1c2440",
  bgInput: "#0d1322",

  ink: "#ffffff",
  sub: "#8893b8",
  muted: "#4a5578",

  orange: "#FF6B35",
  orangeSoft: "#FF8B5C",
  orangeDeep: "#E85420",
  orangeGlow: "rgba(255,107,53,0.4)",

  gold: "#FFB627",
  goldSoft: "#FFD065",
  goldDeep: "#E89A0F",
  goldGlow: "rgba(255,182,39,0.4)",

  danger: "#FF3D5A",
  dangerGlow: "rgba(255,61,90,0.4)",

  border: "rgba(255,255,255,0.06)",
  borderBright: "rgba(255,255,255,0.12)",
};

export const FONTS = {
  display: "'Bebas Neue', 'Pretendard Variable', 'Pretendard', sans-serif",
  body: "'Pretendard Variable', 'Pretendard', system-ui, sans-serif",
  mono: "'Space Mono', ui-monospace, Menlo, Consolas, monospace",
};

// 자리 구분 색 8종 (핑크/보라 제외 — 지침 준수)
const PLAYER_PALETTE = [
  { bg: "#FF6B35", fg: "#ffffff" }, // 선셋 오렌지
  { bg: "#4A9DFF", fg: "#ffffff" }, // 블루
  { bg: "#44D97E", fg: "#06281a" }, // 그린
  { bg: "#FFB627", fg: "#2a1a00" }, // 골드
  { bg: "#FF8B5C", fg: "#3a1500" }, // 소프트 오렌지
  { bg: "#5BE5E0", fg: "#002a26" }, // 틸
  { bg: "#E8C84A", fg: "#2a2200" }, // 앰버
  { bg: "#7FB8FF", fg: "#06203a" }, // 라이트 블루
];

/**
 * 참가자 인덱스 → 자리 색 {bg, fg}.
 * @param {number} index
 */
export function playerColor(index) {
  const i = ((index % PLAYER_PALETTE.length) + PLAYER_PALETTE.length) %
    PLAYER_PALETTE.length;
  return PLAYER_PALETTE[i];
}

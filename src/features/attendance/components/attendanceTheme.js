// ============================================================
// 근태관리 컬러 토큰
//
// 시안(attendance_ui.html)은 블루 메인이었으나, 기존 어드민(#0D0B08 / #D4A537
// 골드 톤)과의 일관성을 위해 골드로 재배색했다. 레이아웃/구조는 시안 그대로,
// 색만 어드민 팔레트로 매핑한다.
//   시안 blue(메인) → gold,  blue-glow → gold-glow
//   퇴근 버튼은 출근(골드)과 구분되도록 따뜻한 오렌지 유지.
// ============================================================

export const T = {
  // 배경/표면
  bgBase: "#0D0B08",
  card: "rgba(255,255,255,0.03)",
  cardElev: "rgba(255,255,255,0.05)",
  input: "rgba(0,0,0,0.28)",

  // 텍스트
  textPrimary: "#F5E6C8",
  textSecondary: "rgba(255,255,255,0.5)",
  textMuted: "rgba(255,255,255,0.3)",

  // 보더
  border: "rgba(255,255,255,0.06)",
  borderBright: "rgba(255,255,255,0.12)",

  // 메인 = 골드 (시안의 blue 대체)
  gold: "#D4A537",
  goldSoft: "#E8C45A",
  goldDeep: "#B8841E",
  goldGlow: "rgba(212,165,55,0.4)",

  // 퇴근 버튼 = 따뜻한 오렌지 (출근 골드와 시각 구분)
  orange: "#E2964B",
  orangeSoft: "#EFAA5E",
  orangeDeep: "#C77A2E",
  orangeGlow: "rgba(226,150,75,0.4)",

  success: "#6AB06A", // 근무 중
  warning: "#E8943E", // 새벽 퇴근
  danger: "#E24B4A", // 삭제/위험
  purple: "#C47AFF",

  fontDisplay: "'Noto Serif KR', serif",
  fontMono: "var(--font-mono)",
  fontBody: "var(--font-sans)",
};

// 아바타 그라데이션 4종 순환 (어드민 액센트 팔레트 기반)
export const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #E8C45A, #B8841E)", // gold
  "linear-gradient(135deg, #C47AFF, #7A2FE0)", // purple
  "linear-gradient(135deg, #6AB06A, #2BC9A2)", // green
  "linear-gradient(135deg, #EFAA5E, #C77A2E)", // orange
];

export function avatarGradient(index) {
  return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
}

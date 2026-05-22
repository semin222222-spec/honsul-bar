/**
 * 라운지 메시지 작성자(손님/사장님) 구분 및 멘션 헬퍼.
 *
 * 사장님 글은 DB의 author_type='owner' 컬럼으로만 구분한다(닉네임으로 구분 X).
 * RLS가 anon(손님)은 author_type='owner' 작성을 막으므로 위변조 불가.
 */

export const AUTHOR_CUSTOMER = "customer";
export const AUTHOR_OWNER = "owner";

// 사장님 글에 사용하는 고정 표시 정보 (세션 없음 → 닉네임/아바타 고정)
export const OWNER_IDENTITY = {
  nickname: "사장님",
  avatar: "👑",
};

/** 사장님(owner)이 쓴 글인지 */
export function isOwnerMessage(msg) {
  return msg?.author_type === AUTHOR_OWNER;
}

/**
 * 손님 글에 답할 때 입력창에 채울 멘션 접두사.
 * 닉네임이 없으면 빈 문자열.
 */
export function buildMentionPrefix(nickname) {
  const name = (nickname || "").trim();
  return name ? `@${name} ` : "";
}

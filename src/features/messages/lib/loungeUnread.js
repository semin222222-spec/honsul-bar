/**
 * 라운지(익명 채팅) 미확인 카운트 순수 로직.
 *
 * chat_messages 테이블에는 읽음 상태 컬럼이 없으므로(스키마 변경 금지),
 * 어드민이 마지막으로 라운지를 확인한 시각(lastSeenAt)을 기준으로
 * 그 이후 작성된 글을 "미확인"으로 센다.
 */

/** 메시지 목록에서 가장 최근 created_at(ISO)을 반환. 없으면 null. */
export function latestCreatedAt(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null;

  let latest = null;
  let latestMs = -Infinity;
  for (const msg of messages) {
    const iso = msg?.created_at;
    if (!iso) continue;
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) continue;
    if (ms > latestMs) {
      latestMs = ms;
      latest = iso;
    }
  }
  return latest;
}

/**
 * lastSeenAt 이후(초과)에 작성된 글 수를 반환.
 * lastSeenAt이 없거나 파싱 불가면 0 (기준선이 없으면 미확인으로 보지 않음).
 */
export function countUnread(messages, lastSeenAt) {
  if (!Array.isArray(messages) || messages.length === 0) return 0;
  if (!lastSeenAt) return 0;

  const seenMs = Date.parse(lastSeenAt);
  if (Number.isNaN(seenMs)) return 0;

  let count = 0;
  for (const msg of messages) {
    const iso = msg?.created_at;
    if (!iso) continue;
    const ms = Date.parse(iso);
    if (!Number.isNaN(ms) && ms > seenMs) count += 1;
  }
  return count;
}

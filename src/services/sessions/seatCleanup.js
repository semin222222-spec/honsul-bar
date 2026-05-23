/**
 * seatCleanup - 빈 좌석(주문 없는 열린 세션) 정리 규칙
 *
 * 순수 함수만 둔다. (DB 접근 없음 → 테스트 가능)
 *
 * "빈 좌석" = 열려 있지만 아직 주문이 하나도 없는 세션.
 *   주문이 한 건이라도 있으면(대기/제공/POS 어떤 상태든) 비우기 대상에서 제외한다.
 *   주문 여부는 orders 의 session_id 존재로 판단한다.
 */

// 자동 비우기 기준: 입장(opened_at) 후 30분
export const AUTO_EMPTY_IDLE_MS = 30 * 60 * 1000;

/**
 * 주문이 한 건이라도 있는 세션 id 집합.
 */
export function getSessionIdsWithOrders(orders) {
  const ids = new Set();
  (orders || []).forEach((order) => {
    const sessionId = order?.session_id;
    if (sessionId != null) ids.add(sessionId);
  });
  return ids;
}

/**
 * 주문 없는 모든 열린 세션 id (수동 "한꺼번에 비우기" 대상).
 */
export function selectEmptySeatSessionIds(sessions, orders) {
  const withOrders = getSessionIdsWithOrders(orders);
  return (sessions || [])
    .filter((session) => session?.id != null && !withOrders.has(session.id))
    .map((session) => session.id);
}

/**
 * 주문 없고 입장 후 idleMs 이상 지난 세션 id (자동 비우기 대상).
 */
export function selectIdleEmptySeatSessionIds(
  sessions,
  orders,
  { now = Date.now(), idleMs = AUTO_EMPTY_IDLE_MS } = {},
) {
  const withOrders = getSessionIdsWithOrders(orders);
  return (sessions || [])
    .filter((session) => {
      if (session?.id == null || withOrders.has(session.id)) return false;
      if (!session.opened_at) return false;
      const openedMs = new Date(session.opened_at).getTime();
      if (Number.isNaN(openedMs)) return false;
      return now - openedMs >= idleMs;
    })
    .map((session) => session.id);
}

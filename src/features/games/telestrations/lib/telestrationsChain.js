/**
 * 텔레스트레이션 체인 매핑 헬퍼
 *
 * 게임 구조:
 *   - players 배열 = position 순서대로 정렬된 N명
 *   - 각 player 는 "chain"을 시작 (initial_word 로부터)
 *   - step 0: 모두 자기 chain 의 그림 그림 (자기 단어 그림)
 *   - step k (k>=1): player i 는 (i - k) mod N 의 chain 을 이어 받음
 *
 * 매 step 마다 모든 chain 이 동시에 한 칸씩 시계 반대 방향으로 회전.
 */

/**
 * 정렬된 players 배열 반환 (position ASC). 같은 position 이면 session_id 로 안정 정렬.
 */
export function sortPlayers(players) {
  if (!Array.isArray(players)) return [];
  return [...players].sort((a, b) => {
    const pa = Number.isFinite(a?.position) ? a.position : 0;
    const pb = Number.isFinite(b?.position) ? b.position : 0;
    if (pa !== pb) return pa - pb;
    return String(a?.session_id || "").localeCompare(String(b?.session_id || ""));
  });
}

/**
 * 특정 player 의 index (sortedPlayers 기준).
 * 없으면 -1.
 */
export function findPlayerIndex(sortedPlayers, sessionId) {
  if (!sessionId) return -1;
  return sortedPlayers.findIndex((p) => p?.session_id === sessionId);
}

/**
 * 해당 player 가 step 에서 작업할 chain 의 chain_starter player.
 * step 0: 자기 자신
 * step k: (myIdx - k + N) mod N 위치의 player
 */
export function getChainStarterForPlayerAtStep(
  sortedPlayers,
  playerIndex,
  step,
) {
  const n = sortedPlayers.length;
  if (n === 0 || playerIndex < 0 || playerIndex >= n) return null;
  const safeStep = Number.isFinite(step) ? step : 0;
  const idx = ((playerIndex - safeStep) % n + n) % n;
  return sortedPlayers[idx];
}

/**
 * 반대 방향: chain_starter 가 step 에서 누가 작업하는지.
 * step k: (chainStarterIdx + k) mod N 위치의 player
 */
export function getAuthorForChainAtStep(sortedPlayers, chainStarterIdx, step) {
  const n = sortedPlayers.length;
  if (n === 0) return null;
  const safeStep = Number.isFinite(step) ? step : 0;
  const idx = ((chainStarterIdx + safeStep) % n + n) % n;
  return sortedPlayers[idx];
}

/**
 * entries 배열을 chain_starter_session_id 별로 그룹핑.
 * 각 chain 은 step ASC 로 정렬된 배열로 반환.
 *
 * @returns Map<chainStarterSessionId, Array<entry>>
 */
export function groupEntriesByChain(entries) {
  const map = new Map();
  if (!Array.isArray(entries)) return map;
  for (const e of entries) {
    if (!e?.chain_starter_session_id) continue;
    const key = e.chain_starter_session_id;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  for (const [key, arr] of map) {
    arr.sort((a, b) => (a?.step ?? 0) - (b?.step ?? 0));
    map.set(key, arr);
  }
  return map;
}

/**
 * 새 player join 시 position 값 할당 (현재 최대값 + 1).
 */
export function nextPosition(players) {
  if (!Array.isArray(players) || players.length === 0) return 0;
  return players.reduce(
    (max, p) =>
      Math.max(max, Number.isFinite(p?.position) ? p.position : -1),
    -1,
  ) + 1;
}

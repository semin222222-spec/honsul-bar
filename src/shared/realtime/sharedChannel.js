import { supabase } from "@/shared/api/supabaseClient";

// ============================================================
// Ref-counted shared realtime channel
// 같은 topic에 대해 채널을 한 번만 만들고 여러 컴포넌트가 listener로 붙는다.
// 마지막 listener가 떠나면 그때서야 supabase.removeChannel(channel)이 호출된다.
//
// → AdminPage + SeatMap이 useSeatRows로 같은 데이터를 구독해도 채널은 1개
// → 탭 전환으로 한 컴포넌트가 unmount돼도 채널은 유지됨
// ============================================================

const sharedChannels = new Map();

/**
 * @param {object} params
 * @param {string} params.topic - 안정적인 채널 식별자 (예: `seat-rows-${storeId}`)
 * @param {Array<{event: string, schema: string, table: string, filter?: string, route?: string}>} params.bindings
 *   postgres_changes 설정. 여러 개면 같은 채널에 묶어 등록한다.
 *   `route`가 있으면 해당 binding의 payload는 listeners[route]로만 dispatch.
 *   없으면 onChange + 이벤트별(onInsert/onUpdate/onDelete)로 dispatch.
 * @param {{ onChange?, onInsert?, onUpdate?, onDelete?, onStatus?, [route]?: Function }} params.listeners
 * @returns {() => void} unsubscribe
 */
export function subscribeShared({ topic, bindings, listeners }) {
  let entry = sharedChannels.get(topic);

  if (!entry) {
    const subs = new Set();
    let chan = supabase.channel(topic);

    for (const binding of bindings) {
      const { route, ...changeConfig } = binding;
      chan = chan.on("postgres_changes", changeConfig, (payload) => {
        subs.forEach((s) => {
          try {
            if (route) {
              s[route]?.(payload);
            } else {
              s.onChange?.(payload);
              if (payload.eventType === "INSERT") s.onInsert?.(payload);
              else if (payload.eventType === "UPDATE") s.onUpdate?.(payload);
              else if (payload.eventType === "DELETE") s.onDelete?.(payload);
            }
          } catch (err) {
            console.warn(`[sharedChannel:${topic}] listener 예외`, err);
          }
        });
      });
    }

    chan.subscribe((status) => {
      subs.forEach((s) => {
        try {
          s.onStatus?.(status);
        } catch (err) {
          console.warn(`[sharedChannel:${topic}] onStatus 예외`, err);
        }
      });
    });

    entry = { channel: chan, subs };
    sharedChannels.set(topic, entry);
  }

  entry.subs.add(listeners);

  // 합성 SUBSCRIBED은 일부러 던지지 않는다.
  // 각 hook이 useEffect mount 시 자체 초기 fetch를 돌리므로 데이터는 따로 받는다.
  // 합성을 던지면 mount마다 SUBSCRIBED 로그 + onSubscribed→fetchRows가 누적되어
  // 동시 REST 요청 폭증 → fetch hang/timeout으로 이어진다.
  // 진짜 채널 재구독 시점의 SUBSCRIBED는 supabase-js의 콜백이 sub들에 fan-out한다.

  return () => {
    if (!entry) return;
    entry.subs.delete(listeners);
    if (entry.subs.size === 0) {
      try {
        supabase.removeChannel(entry.channel);
      } catch (err) {
        console.warn(`[sharedChannel:${topic}] removeChannel 예외`, err);
      }
      sharedChannels.delete(topic);
    }
  };
}

// 테스트/디버그용
export function getSharedChannelCount() {
  return sharedChannels.size;
}

export function getSharedChannelTopics() {
  return Array.from(sharedChannels.keys());
}

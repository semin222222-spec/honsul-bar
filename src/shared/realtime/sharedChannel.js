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

  // 늦게 들어온 listener: 채널이 이미 joined면 SUBSCRIBED를 합성해서 한 번 흘려보낸다.
  // (그래야 listener의 initial refetch / 재구독 콜백이 동작)
  const channelState = entry.channel?.state;
  if (channelState === "joined" && typeof listeners.onStatus === "function") {
    queueMicrotask(() => {
      if (!entry.subs.has(listeners)) return; // 사이에 unsubscribe됐을 수 있음
      try {
        listeners.onStatus("SUBSCRIBED");
      } catch (err) {
        console.warn(`[sharedChannel:${topic}] late onStatus 예외`, err);
      }
    });
  }

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

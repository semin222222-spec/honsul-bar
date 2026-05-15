// ============================================================
// Ref-counted shared realtime channel
// 같은 topic에 대해 채널을 한 번만 만들고 여러 컴포넌트가 listener로 붙는다.
// 마지막 listener가 떠나면 그때서야 client.removeChannel(channel)이 호출된다.
//
// → AdminPage + SeatMap이 useSeatRows로 같은 데이터를 구독해도 채널은 1개
// → 탭 전환으로 한 컴포넌트가 unmount돼도 채널은 유지됨
// ============================================================

const UNUSABLE_CHANNEL_STATES = new Set(["closed", "errored", "leaving"]);

const sharedChannels = new Map();
let realtimeClient = null;

export function setSharedRealtimeClient(client) {
  realtimeClient = client;
}

function getRealtimeClient() {
  if (!realtimeClient) {
    throw new Error("[sharedChannel] Realtime client가 설정되지 않았습니다.");
  }
  return realtimeClient;
}

function callLogger(logger, method, ...args) {
  if (!logger || typeof logger[method] !== "function") return;
  logger[method](...args);
}

function getChannelState(channel) {
  return channel?.state;
}

function isUnusableChannel(channel) {
  if (!channel) return true;
  const state = getChannelState(channel);
  if (UNUSABLE_CHANNEL_STATES.has(state)) return true;

  try {
    if (typeof channel?.channelAdapter?.isClosed === "function") {
      return channel.channelAdapter.isClosed();
    }
  } catch {
    return false;
  }

  return false;
}

function dispatchPayload(entry, binding, payload) {
  entry.subs.forEach((s) => {
    try {
      if (binding.route) {
        s[binding.route]?.(payload);
      } else {
        s.onChange?.(payload);
        if (payload.eventType === "INSERT") s.onInsert?.(payload);
        else if (payload.eventType === "UPDATE") s.onUpdate?.(payload);
        else if (payload.eventType === "DELETE") s.onDelete?.(payload);
      }
    } catch (err) {
      console.warn(`[sharedChannel:${entry.topic}] listener 예외`, err);
    }
  });
}

function dispatchStatus(entry, status) {
  entry.subs.forEach((s) => {
    try {
      s.onStatus?.(status);
    } catch (err) {
      console.warn(`[sharedChannel:${entry.topic}] onStatus 예외`, err);
    }
  });
}

function startChannel(entry, logger = console) {
  const client = getRealtimeClient();
  let channel = client.channel(entry.topic);

  for (const binding of entry.bindings) {
    const { route, ...changeConfig } = binding;
    channel = channel.on("postgres_changes", changeConfig, (payload) => {
      dispatchPayload(entry, { route }, payload);
    });
  }

  entry.channel = channel;

  try {
    channel.subscribe((status) => dispatchStatus(entry, status));
  } catch (err) {
    callLogger(
      logger,
      "warn",
      `[sharedChannel:${entry.topic}] subscribe 예외`,
      err,
    );
  }

  return channel;
}

function removeEntryChannel(entry, logger = console) {
  if (!entry?.channel) return;

  try {
    getRealtimeClient().removeChannel(entry.channel);
  } catch (err) {
    callLogger(
      logger,
      "warn",
      `[sharedChannel:${entry.topic}] removeChannel 예외`,
      err,
    );
  }
}

function recreateEntryChannel(entry, logger = console) {
  removeEntryChannel(entry, logger);
  return startChannel(entry, logger);
}

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
    entry = {
      topic,
      bindings,
      channel: null,
      subs: new Set(),
    };
    sharedChannels.set(topic, entry);
    entry.subs.add(listeners);
    startChannel(entry);
  } else {
    entry.subs.add(listeners);

    // Chrome 백그라운드 복귀 후 Supabase 내부 채널이 closed/errored인데
    // sharedChannels에는 entry가 남는 경우가 있다. 이 상태에서 기존 channel
    // 인스턴스를 재사용하면 subscribe가 다시 붙지 않으므로 새 인스턴스로 교체한다.
    if (isUnusableChannel(entry.channel)) {
      recreateEntryChannel(entry);
    }
  }

  // 합성 SUBSCRIBED은 일부러 던지지 않는다.
  // 각 hook이 useEffect mount 시 자체 초기 fetch를 돌리므로 데이터는 따로 받는다.
  // 합성을 던지면 mount마다 SUBSCRIBED 로그 + onSubscribed→fetchRows가 누적되어
  // 동시 REST 요청 폭증 → fetch hang/timeout으로 이어진다.
  // 진짜 채널 재구독 시점의 SUBSCRIBED는 supabase-js의 콜백이 sub들에 fan-out한다.

  return () => {
    if (!entry) return;
    entry.subs.delete(listeners);
    if (entry.subs.size === 0) {
      removeEntryChannel(entry);
      sharedChannels.delete(topic);
    }
  };
}

export function recoverSharedRealtimeChannels(options = {}) {
  const { force = false, logger = console } = options;
  let recovered = 0;

  sharedChannels.forEach((entry) => {
    if (!force && !isUnusableChannel(entry.channel)) return;
    recreateEntryChannel(entry, logger);
    recovered += 1;
  });

  return {
    recovered,
    channelCount: sharedChannels.size,
  };
}

// 테스트/디버그용
export function getSharedChannelCount() {
  return sharedChannels.size;
}

export function getSharedChannelTopics() {
  return Array.from(sharedChannels.keys());
}

export function resetSharedChannelsForTest() {
  sharedChannels.clear();
  realtimeClient = null;
}

const RECOVERABLE_CHANNEL_STATES = new Set(["closed", "errored"]);
const RECOVERABLE_SUBSCRIBE_STATUSES = new Set([
  "CHANNEL_ERROR",
  "TIMED_OUT",
  "CLOSED",
]);

export function isRecoverableChannelState(state) {
  return RECOVERABLE_CHANNEL_STATES.has(state);
}

export function isRecoverableSubscribeStatus(status) {
  return RECOVERABLE_SUBSCRIBE_STATUSES.has(status);
}

function callLogger(logger, method, ...args) {
  if (!logger || typeof logger[method] !== "function") return;
  logger[method](...args);
}

function callStatusCallback(callback, status, logger, label) {
  if (typeof callback !== "function") return;

  try {
    const result = callback(status);
    if (result && typeof result.catch === "function") {
      result.catch((err) => {
        callLogger(logger, "warn", `[${label}] Realtime 상태 콜백 실패:`, err);
      });
    }
  } catch (err) {
    callLogger(logger, "warn", `[${label}] Realtime 상태 콜백 실패:`, err);
  }
}

function getRealtimeChannels(supabase, logger) {
  try {
    if (typeof supabase?.getChannels !== "function") return [];
    return supabase.getChannels() || [];
  } catch (err) {
    callLogger(logger, "warn", "[Realtime] 채널 목록 조회 실패:", err);
    return [];
  }
}

function isRealtimeSocketConnected(supabase, logger) {
  try {
    if (typeof supabase?.realtime?.isConnected !== "function") return true;
    return supabase.realtime.isConnected();
  } catch (err) {
    callLogger(logger, "warn", "[Realtime] WebSocket 상태 조회 실패:", err);
    return true;
  }
}

export function recoverRealtimeConnection(supabase, options = {}) {
  const { logger = console, reason = "manual" } = options;
  const channels = getRealtimeChannels(supabase, logger);
  const recoveryTasks = [];
  const result = {
    reason,
    channelCount: channels.length,
    resubscribed: 0,
    socketReconnected: false,
    pendingRecoveries: 0,
    done: Promise.resolve([]),
  };

  channels.forEach((channel) => {
    if (!isRecoverableChannelState(channel?.state)) return;
    if (typeof channel.subscribe !== "function") return;

    result.resubscribed += 1;

    if (
      channel.state === "errored" &&
      typeof channel.unsubscribe === "function"
    ) {
      let leaveResult;
      try {
        leaveResult = channel.unsubscribe();
      } catch (err) {
        callLogger(logger, "warn", "[Realtime] 채널 leave 실패:", err);
      }

      const task = Promise.resolve(leaveResult)
        .catch((err) => {
          callLogger(logger, "warn", "[Realtime] 채널 leave 실패:", err);
        })
        .then(() => {
          try {
            channel.subscribe();
          } catch (err) {
            callLogger(logger, "warn", "[Realtime] 채널 재구독 실패:", err);
          }
        });
      recoveryTasks.push(task);
      return;
    }

    try {
      channel.subscribe();
    } catch (err) {
      callLogger(logger, "warn", "[Realtime] 채널 재구독 실패:", err);
    }
  });

  if (!isRealtimeSocketConnected(supabase, logger)) {
    try {
      supabase?.realtime?.connect?.();
      result.socketReconnected = true;
    } catch (err) {
      callLogger(logger, "warn", "[Realtime] WebSocket 재연결 실패:", err);
    }
  }

  if (result.resubscribed > 0 || result.socketReconnected) {
    callLogger(
      logger,
      "log",
      `[Realtime] 복구 실행 (${reason}) - 채널 ${result.resubscribed}개, socket ${result.socketReconnected ? "재연결" : "유지"}`,
    );
  }

  result.pendingRecoveries = recoveryTasks.length;
  result.done = Promise.allSettled(recoveryTasks);

  return result;
}

export function handleRealtimeSubscribeStatus(status, options = {}) {
  const {
    label = "Realtime",
    logger = console,
    onSubscribed,
    onRecoverable,
  } = options;

  if (status === "SUBSCRIBED") {
    callLogger(logger, "log", `[${label}] Realtime 구독 성공`);
    callStatusCallback(onSubscribed, status, logger, label);
    return "subscribed";
  }

  if (isRecoverableSubscribeStatus(status)) {
    callLogger(logger, "warn", `[${label}] Realtime 연결 불안정: ${status}`);
    callStatusCallback(onRecoverable, status, logger, label);
    return "recoverable";
  }

  return "ignored";
}

export function installRealtimeRecovery(supabase, options = {}) {
  const {
    targetWindow = window,
    targetDocument = document,
    logger = console,
    debounceMs = 500,
    checkIntervalMs = 30000,
  } = options;

  let lastVisibilityChangeTime = Date.now();
  let reconnectTimeout = null;

  const recover = (reason) =>
    recoverRealtimeConnection(supabase, { logger, reason });

  const scheduleRecover = (reason) => {
    if (reconnectTimeout) targetWindow.clearTimeout(reconnectTimeout);
    reconnectTimeout = targetWindow.setTimeout(() => {
      reconnectTimeout = null;
      recover(reason);
    }, debounceMs);
  };

  const handleVisibilityChange = () => {
    if (targetDocument.visibilityState === "visible") {
      const elapsed = Date.now() - lastVisibilityChangeTime;
      callLogger(
        logger,
        "log",
        `[Realtime] 탭 활성화 (백그라운드 ${Math.round(elapsed / 1000)}초)`,
      );
      scheduleRecover("visible");
    }
    lastVisibilityChangeTime = Date.now();
  };

  const handleOnline = () => scheduleRecover("online");
  const handleFocus = () => scheduleRecover("focus");

  targetDocument.addEventListener("visibilitychange", handleVisibilityChange);
  targetWindow.addEventListener("online", handleOnline);
  targetWindow.addEventListener("focus", handleFocus);

  const intervalId = targetWindow.setInterval(() => {
    if (targetDocument.visibilityState === "visible") {
      recover("interval");
    }
  }, checkIntervalMs);

  return {
    recover,
    scheduleRecover,
    stop() {
      if (reconnectTimeout) targetWindow.clearTimeout(reconnectTimeout);
      targetWindow.clearInterval(intervalId);
      targetDocument.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      targetWindow.removeEventListener("online", handleOnline);
      targetWindow.removeEventListener("focus", handleFocus);
    },
  };
}

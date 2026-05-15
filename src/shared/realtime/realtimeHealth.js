const RECOVERABLE_CHANNEL_STATES = new Set(["closed", "errored"]);
const RECOVERABLE_SUBSCRIBE_STATUSES = new Set([
  "CHANNEL_ERROR",
  "TIMED_OUT",
  "CLOSED",
]);

// 백그라운드가 이 시간 이상이면 "장기 휴면" 으로 보고 강제 복구
const LONG_BACKGROUND_MS = 60 * 1000;

// 직전 복구 후 이 간격 안에 들어온 트리거는 무시 (race 방지)
const RECOVER_COOLDOWN_MS = 2000;

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

// ============================================================
// REST refetch pub/sub
// 채널이 "joined" 상태이면서도 메시지를 못 받는 경우가 있어,
// 복구 시점에 명시적으로 REST refetch 트리거가 필요한 hook 들이 구독한다.
// ============================================================
const recoverListeners = new Set();

export function onRealtimeRecover(callback) {
  if (typeof callback !== "function") return () => {};
  recoverListeners.add(callback);
  return () => recoverListeners.delete(callback);
}

function notifyRecoverListeners(reason, logger) {
  recoverListeners.forEach((cb) => {
    try {
      const result = cb(reason);
      if (result && typeof result.catch === "function") {
        result.catch((err) => {
          callLogger(logger, "warn", "[Realtime] refetch 리스너 실패:", err);
        });
      }
    } catch (err) {
      callLogger(logger, "warn", "[Realtime] refetch 리스너 예외:", err);
    }
  });
}

// ============================================================
// 핵심 복구 함수
// race/cooldown 가드는 installRealtimeRecovery 클로저에서 처리.
// 본 함수는 호출되면 항상 즉시 작업을 수행 (테스트성/플러그인 외부 사용 용이)
// ============================================================
export function recoverRealtimeConnection(supabase, options = {}) {
  const { logger = console, reason = "manual", force = false } = options;

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

  const socketOk = isRealtimeSocketConnected(supabase, logger);
  const shouldBounceSocket = !socketOk || force;

  // 1) 소켓 레벨 복구
  // - 소켓이 죽었거나 force=true(장기 백그라운드/online 이벤트)면 명시적으로 bounce
  // - 소켓이 다시 붙으면 supabase-js가 joined 채널들을 자동으로 re-join한다
  if (shouldBounceSocket) {
    try {
      supabase?.realtime?.disconnect?.();
    } catch (err) {
      callLogger(logger, "warn", "[Realtime] disconnect 실패:", err);
    }
    try {
      supabase?.realtime?.connect?.();
      result.socketReconnected = true;
    } catch (err) {
      callLogger(logger, "warn", "[Realtime] connect 실패:", err);
    }

    // 소켓을 bounce하면 supabase-js가 모든 채널을 "errored"로 전환했다가
    // 새 소켓 연결 후 자동 re-join한다. 우리가 forEach로 또 건드리면 race가 나서
    // CLOSED→SUBSCRIBED 루프와 fetch timeout이 발생함. 채널은 건드리지 않는다.
    notifyRecoverListeners(reason, logger);
    return result;
  }

  // 2) 소켓은 살아있고 force도 아닐 때: 명시적으로 broken인 채널만 수동 복구
  channels.forEach((channel) => {
    if (!isRecoverableChannelState(channel?.state)) return;
    if (typeof channel.subscribe !== "function") return;

    result.resubscribed += 1;

    if (typeof channel.unsubscribe === "function") {
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

  if (result.resubscribed > 0 || result.socketReconnected) {
    callLogger(
      logger,
      "log",
      `[Realtime] 복구 실행 (${reason}) - 채널 ${result.resubscribed}개, socket ${result.socketReconnected ? "재연결" : "유지"}`,
    );
  }

  result.pendingRecoveries = recoveryTasks.length;
  result.done = Promise.allSettled(recoveryTasks);

  // REST refetch 리스너 호출 (복구 시점마다)
  notifyRecoverListeners(reason, logger);

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

  let lastVisibleAt = Date.now();
  let reconnectTimeout = null;
  let inFlight = false;
  let lastRecoverAt = 0;

  const recover = (reason, { force = false } = {}) => {
    // race 방지: 진행 중이면 스킵
    if (inFlight) {
      callLogger(logger, "log", `[Realtime] 복구 진행 중 - 스킵 (${reason})`);
      return {
        reason,
        channelCount: 0,
        resubscribed: 0,
        socketReconnected: false,
        pendingRecoveries: 0,
        skipped: "in_flight",
        done: Promise.resolve([]),
      };
    }
    // cooldown: 직전 복구 후 너무 짧은 간격은 스킵
    const now = Date.now();
    if (now - lastRecoverAt < RECOVER_COOLDOWN_MS) {
      return {
        reason,
        channelCount: 0,
        resubscribed: 0,
        socketReconnected: false,
        pendingRecoveries: 0,
        skipped: "cooldown",
        done: Promise.resolve([]),
      };
    }
    inFlight = true;
    lastRecoverAt = now;
    const result = recoverRealtimeConnection(supabase, {
      logger,
      reason,
      force,
    });
    Promise.resolve(result.done).finally(() => {
      inFlight = false;
    });
    return result;
  };

  const scheduleRecover = (reason, opts) => {
    if (reconnectTimeout) targetWindow.clearTimeout(reconnectTimeout);
    reconnectTimeout = targetWindow.setTimeout(() => {
      reconnectTimeout = null;
      recover(reason, opts);
    }, debounceMs);
  };

  const handleVisibilityChange = () => {
    if (targetDocument.visibilityState === "visible") {
      const elapsed = Date.now() - lastVisibleAt;
      callLogger(
        logger,
        "log",
        `[Realtime] 탭 활성화 (백그라운드 ${Math.round(elapsed / 1000)}초)`,
      );
      // 장기 백그라운드면 채널 상태와 무관하게 강제 재구독
      const force = elapsed >= LONG_BACKGROUND_MS;
      scheduleRecover(force ? "visible-long" : "visible", { force });
    } else {
      lastVisibleAt = Date.now();
    }
  };

  const handleOnline = () => scheduleRecover("online", { force: true });
  const handleFocus = () => scheduleRecover("focus");

  targetDocument.addEventListener("visibilitychange", handleVisibilityChange);
  targetWindow.addEventListener("online", handleOnline);
  targetWindow.addEventListener("focus", handleFocus);

  const intervalId = targetWindow.setInterval(() => {
    if (targetDocument.visibilityState !== "visible") return;
    // 주기 점검은 가벼운 헬스체크: 소켓이 죽었거나 broken 채널이 있을 때만 복구
    const socketOk = isRealtimeSocketConnected(supabase, logger);
    const channels = getRealtimeChannels(supabase, logger);
    const hasBroken = channels.some((c) =>
      isRecoverableChannelState(c?.state),
    );
    if (!socketOk || hasBroken) {
      callLogger(
        logger,
        "warn",
        `[Realtime] 헬스체크 이상 socket=${socketOk} broken=${hasBroken}`,
      );
      scheduleRecover("interval", { force: !socketOk });
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

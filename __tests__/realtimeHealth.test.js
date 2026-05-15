import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isRecoverableChannelState,
  isRecoverableSubscribeStatus,
  recoverRealtimeConnection,
} from "../src/shared/realtime/realtimeHealth.js";

describe("realtime health recovery", () => {
  it("복구 가능한 채널 상태만 식별한다", () => {
    assert.equal(isRecoverableChannelState("closed"), true);
    assert.equal(isRecoverableChannelState("errored"), true);
    assert.equal(isRecoverableChannelState("joined"), false);
    assert.equal(isRecoverableChannelState("joining"), false);
    assert.equal(isRecoverableChannelState(undefined), false);
  });

  it("구독 실패 상태만 복구 대상으로 본다", () => {
    assert.equal(isRecoverableSubscribeStatus("CHANNEL_ERROR"), true);
    assert.equal(isRecoverableSubscribeStatus("TIMED_OUT"), true);
    assert.equal(isRecoverableSubscribeStatus("CLOSED"), true);
    assert.equal(isRecoverableSubscribeStatus("SUBSCRIBED"), false);
  });

  it("끊긴 채널만 재구독하고 살아있는 채널은 건드리지 않는다", () => {
    const calls = [];
    const channels = [
      {
        topic: "orders",
        state: "joined",
        subscribe: () => calls.push("orders"),
      },
      { topic: "sos", state: "errored", subscribe: () => calls.push("sos") },
      {
        topic: "sessions",
        state: "closed",
        subscribe: () => calls.push("sessions"),
      },
    ];
    const supabase = {
      getChannels: () => channels,
      realtime: {
        isConnected: () => true,
        connect: () => calls.push("connect"),
      },
    };

    const result = recoverRealtimeConnection(supabase, { logger: null });

    assert.deepEqual(calls, ["sos", "sessions"]);
    assert.equal(result.resubscribed, 2);
    assert.equal(result.socketReconnected, false);
  });

  it("소켓이 끊겨 있으면 채널 상태와 별개로 WebSocket 재연결을 시도한다", () => {
    const calls = [];
    const supabase = {
      getChannels: () => [
        {
          topic: "orders",
          state: "joined",
          subscribe: () => calls.push("orders"),
        },
      ],
      realtime: {
        isConnected: () => false,
        connect: () => calls.push("connect"),
      },
    };

    const result = recoverRealtimeConnection(supabase, { logger: null });

    assert.deepEqual(calls, ["connect"]);
    assert.equal(result.resubscribed, 0);
    assert.equal(result.socketReconnected, true);
  });

  it("errored 채널은 leave 후 재구독한다", async () => {
    const calls = [];
    const supabase = {
      getChannels: () => [
        {
          topic: "orders",
          state: "errored",
          unsubscribe: () => {
            calls.push("leave");
            return Promise.resolve("ok");
          },
          subscribe: () => calls.push("subscribe"),
        },
      ],
      realtime: {
        isConnected: () => true,
        connect: () => calls.push("connect"),
      },
    };

    const result = recoverRealtimeConnection(supabase, { logger: null });

    assert.deepEqual(calls, ["leave"]);
    assert.equal(result.resubscribed, 1);

    await result.done;
    assert.deepEqual(calls, ["leave", "subscribe"]);
  });
});

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  recoverSharedRealtimeChannels,
  resetSharedChannelsForTest,
  setSharedRealtimeClient,
  subscribeShared,
} from "../src/shared/realtime/sharedChannel.js";

function createFakeRealtimeClient() {
  const channels = [];
  const removed = [];

  return {
    channels,
    removed,
    channel(topic) {
      const channel = {
        topic,
        state: "closed",
        bindings: [],
        statusCallback: null,
        on(type, config, callback) {
          this.bindings.push({ type, config, callback });
          return this;
        },
        subscribe(callback) {
          this.statusCallback = callback;
          this.state = "joined";
          callback?.("SUBSCRIBED");
          return this;
        },
      };
      channels.push(channel);
      return channel;
    },
    removeChannel(channel) {
      removed.push(channel);
      channel.state = "closed";
      return Promise.resolve("ok");
    },
  };
}

describe("shared realtime channel", () => {
  beforeEach(() => {
    resetSharedChannelsForTest();
  });

  it("닫힌 공유 채널을 재사용하지 않고 새 채널로 다시 구독한다", () => {
    const client = createFakeRealtimeClient();
    setSharedRealtimeClient(client);
    const statuses = [];

    const unsubscribeA = subscribeShared({
      topic: "seat-occupancy-store-1",
      bindings: [
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: "store_id=eq.store-1",
        },
      ],
      listeners: { onStatus: (status) => statuses.push(`a:${status}`) },
    });

    assert.equal(client.channels.length, 1);
    client.channels[0].state = "closed";

    const unsubscribeB = subscribeShared({
      topic: "seat-occupancy-store-1",
      bindings: [
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: "store_id=eq.store-1",
        },
      ],
      listeners: { onStatus: (status) => statuses.push(`b:${status}`) },
    });

    assert.equal(client.channels.length, 2);
    assert.equal(client.removed[0], client.channels[0]);
    assert.deepEqual(statuses, [
      "a:SUBSCRIBED",
      "a:SUBSCRIBED",
      "b:SUBSCRIBED",
    ]);

    unsubscribeA();
    unsubscribeB();
    assert.equal(client.removed.at(-1), client.channels[1]);
  });

  it("전역 복구 시 Supabase 목록에서 빠진 닫힌 공유 채널도 복구한다", () => {
    const client = createFakeRealtimeClient();
    setSharedRealtimeClient(client);

    subscribeShared({
      topic: "sessions-admin-store-1",
      bindings: [
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: "store_id=eq.store-1",
        },
      ],
      listeners: {},
    });

    client.channels[0].state = "closed";

    const result = recoverSharedRealtimeChannels({ reason: "visible" });

    assert.equal(result.recovered, 1);
    assert.equal(client.channels.length, 2);
    assert.equal(client.removed[0], client.channels[0]);
  });
});

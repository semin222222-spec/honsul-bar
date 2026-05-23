import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTO_EMPTY_IDLE_MS,
  getSessionIdsWithOrders,
  selectEmptySeatSessionIds,
  selectIdleEmptySeatSessionIds,
} from "../src/services/sessions/seatCleanup.js";

const NOW = new Date("2026-05-23T12:00:00.000Z").getTime();
const minutesAgo = (m) => new Date(NOW - m * 60 * 1000).toISOString();

describe("seatCleanup", () => {
  it("주문이 있는 세션 id를 모은다 (상태 무관)", () => {
    const ids = getSessionIdsWithOrders([
      { session_id: "s1", status: "pending" },
      { session_id: "s1", status: "served" },
      { session_id: "s2", status: "sent_to_pos" },
    ]);
    assert.deepEqual([...ids].sort(), ["s1", "s2"]);
  });

  it("주문 없는 좌석만 일괄 비우기 대상으로 고른다", () => {
    const sessions = [
      { id: "s1", opened_at: minutesAgo(5) }, // 주문 없음
      { id: "s2", opened_at: minutesAgo(5) }, // 주문 있음 → 제외
      { id: "s3", opened_at: minutesAgo(5) }, // 주문 없음
    ];
    const orders = [{ session_id: "s2", status: "pending" }];

    assert.deepEqual(selectEmptySeatSessionIds(sessions, orders), ["s1", "s3"]);
  });

  it("제공 완료(served)만 있어도 주문 있는 좌석으로 보고 비우지 않는다", () => {
    const sessions = [{ id: "s1", opened_at: minutesAgo(5) }];
    const orders = [{ session_id: "s1", status: "served" }];

    assert.deepEqual(selectEmptySeatSessionIds(sessions, orders), []);
    assert.deepEqual(
      selectIdleEmptySeatSessionIds(sessions, orders, { now: NOW }),
      [],
    );
  });

  it("자동 비우기: 주문 없고 입장 후 30분 이상인 세션만 고른다", () => {
    const sessions = [
      { id: "fresh", opened_at: minutesAgo(10) }, // 30분 미만 → 제외
      { id: "stale", opened_at: minutesAgo(45) }, // 30분 이상 → 대상
      { id: "ordered", opened_at: minutesAgo(60) }, // 주문 있음 → 제외
    ];
    const orders = [{ session_id: "ordered", status: "pending" }];

    assert.deepEqual(
      selectIdleEmptySeatSessionIds(sessions, orders, { now: NOW }),
      ["stale"],
    );
  });

  it("자동 비우기: 정확히 30분 경계는 포함한다", () => {
    const sessions = [
      { id: "boundary", opened_at: new Date(NOW - AUTO_EMPTY_IDLE_MS).toISOString() },
    ];
    assert.deepEqual(
      selectIdleEmptySeatSessionIds(sessions, [], { now: NOW }),
      ["boundary"],
    );
  });

  it("opened_at이 없거나 잘못된 세션은 자동 비우기에서 건너뛴다", () => {
    const sessions = [
      { id: "no-opened" },
      { id: "bad-opened", opened_at: "not-a-date" },
      { id: "ok", opened_at: minutesAgo(45) },
    ];
    assert.deepEqual(
      selectIdleEmptySeatSessionIds(sessions, [], { now: NOW }),
      ["ok"],
    );
  });

  it("빈/누락 입력에도 안전하다", () => {
    assert.deepEqual(selectEmptySeatSessionIds(undefined, undefined), []);
    assert.deepEqual(selectIdleEmptySeatSessionIds(null, null), []);
    assert.deepEqual([...getSessionIdsWithOrders(null)], []);
  });
});

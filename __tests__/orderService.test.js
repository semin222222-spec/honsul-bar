import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCustomerOrder,
  createManualOrder,
  getOrdersTotal,
  normalizeOrderQuantity,
} from "../src/services/orders/orderService.js";

function createRepositoryMock() {
  const calls = [];
  return {
    calls,
    repository: {
      insertOrders: async (rows) => {
        calls.push(["insertOrders", rows]);
        return rows.map((row, index) => ({ ...row, id: `order-${index + 1}` }));
      },
      touchSession: async (payload) => {
        calls.push(["touchSession", payload]);
      },
    },
  };
}

describe("orderService", () => {
  it("주문 수량을 1~10 범위로 정규화한다", () => {
    assert.equal(normalizeOrderQuantity(0), 1);
    assert.equal(normalizeOrderQuantity("3"), 3);
    assert.equal(normalizeOrderQuantity(99), 10);
    assert.equal(normalizeOrderQuantity("abc"), 1);
  });

  it("손님 주문 행을 수량만큼 만들고 세션 활동 시간을 갱신한다", async () => {
    const { calls, repository } = createRepositoryMock();
    const now = () => new Date("2026-05-15T12:00:00.000Z");

    const result = await createCustomerOrder(
      {
        storeId: "store-1",
        sessionId: "session-1",
        seatLabel: "A-1",
        menuName: "하이볼",
        menuIcon: "glass",
        price: "9000",
        optionId: "option-1",
        optionName: "진저",
        quantity: 2,
      },
      { repository, now },
    );

    assert.equal(result.quantity, 2);
    assert.equal(result.totalPrice, 18000);
    assert.equal(result.orders.length, 2);
    assert.deepEqual(calls[0][0], "insertOrders");
    assert.deepEqual(calls[0][1], [
      {
        store_id: "store-1",
        session_id: "session-1",
        seat_label: "A-1",
        menu_name: "하이볼",
        menu_icon: "glass",
        price: 9000,
        status: "pending",
        option_id: "option-1",
        option_name: "진저",
      },
      {
        store_id: "store-1",
        session_id: "session-1",
        seat_label: "A-1",
        menu_name: "하이볼",
        menu_icon: "glass",
        price: 9000,
        status: "pending",
        option_id: "option-1",
        option_name: "진저",
      },
    ]);
    assert.deepEqual(calls[1], [
      "touchSession",
      {
        storeId: "store-1",
        sessionId: "session-1",
        touchedAt: "2026-05-15T12:00:00.000Z",
      },
    ]);
  });

  it("스코프가 없으면 손님 주문을 만들지 않는다", async () => {
    const { calls, repository } = createRepositoryMock();

    const result = await createCustomerOrder(
      {
        storeId: "",
        sessionId: "session-1",
        seatLabel: "A-1",
        menuName: "하이볼",
        price: 9000,
      },
      { repository },
    );

    assert.equal(result, null);
    assert.deepEqual(calls, []);
  });

  it("수동 주문은 메모와 옵션을 포함해 pending 행을 만든다", async () => {
    const { calls, repository } = createRepositoryMock();
    const now = () => new Date("2026-05-15T12:30:00.000Z");

    const result = await createManualOrder(
      {
        storeId: "store-1",
        session: {
          id: "session-1",
          store_id: "store-1",
          seat_label: "B-2",
        },
        menu: { name: "위스키", icon: "bottle" },
        option: { id: "option-2", name: "더블" },
        quantity: 2,
        memo: "  얼음 적게  ",
        unitPrice: 14000,
      },
      { repository, now },
    );

    assert.equal(result.quantity, 2);
    assert.equal(result.totalPrice, 28000);
    assert.deepEqual(calls[0][1], [
      {
        store_id: "store-1",
        session_id: "session-1",
        seat_label: "B-2",
        menu_name: "위스키",
        menu_icon: "bottle",
        option_id: "option-2",
        option_name: "더블",
        price: 14000,
        status: "pending",
        memo: "얼음 적게",
        is_manual: true,
      },
      {
        store_id: "store-1",
        session_id: "session-1",
        seat_label: "B-2",
        menu_name: "위스키",
        menu_icon: "bottle",
        option_id: "option-2",
        option_name: "더블",
        price: 14000,
        status: "pending",
        memo: "얼음 적게",
        is_manual: true,
      },
    ]);
    assert.deepEqual(calls[1][1], {
      storeId: "store-1",
      sessionId: "session-1",
      touchedAt: "2026-05-15T12:30:00.000Z",
    });
  });

  it("주문 합계를 계산한다", () => {
    assert.equal(
      getOrdersTotal([{ price: 9000 }, { price: null }, { price: 12000 }]),
      21000,
    );
  });
});

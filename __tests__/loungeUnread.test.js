import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countUnread,
  latestCreatedAt,
} from "../src/features/messages/lib/loungeUnread.js";

function msg(id, iso) {
  return { id, created_at: iso };
}

describe("loungeUnread.latestCreatedAt", () => {
  it("가장 최근 created_at을 반환한다", () => {
    const messages = [
      msg("a", "2026-05-22T10:00:00.000Z"),
      msg("b", "2026-05-22T12:30:00.000Z"),
      msg("c", "2026-05-22T11:00:00.000Z"),
    ];
    assert.equal(latestCreatedAt(messages), "2026-05-22T12:30:00.000Z");
  });

  it("빈 목록이거나 배열이 아니면 null", () => {
    assert.equal(latestCreatedAt([]), null);
    assert.equal(latestCreatedAt(null), null);
    assert.equal(latestCreatedAt(undefined), null);
  });

  it("created_at이 없거나 깨진 값은 무시한다", () => {
    const messages = [
      msg("a", null),
      msg("b", "not-a-date"),
      msg("c", "2026-05-22T09:00:00.000Z"),
    ];
    assert.equal(latestCreatedAt(messages), "2026-05-22T09:00:00.000Z");
  });
});

describe("loungeUnread.countUnread", () => {
  const messages = [
    msg("a", "2026-05-22T10:00:00.000Z"),
    msg("b", "2026-05-22T11:00:00.000Z"),
    msg("c", "2026-05-22T12:00:00.000Z"),
  ];

  it("lastSeenAt 이후(초과) 작성된 글만 센다", () => {
    assert.equal(countUnread(messages, "2026-05-22T10:30:00.000Z"), 2);
  });

  it("lastSeenAt과 정확히 같은 시각의 글은 미확인이 아니다", () => {
    assert.equal(countUnread(messages, "2026-05-22T12:00:00.000Z"), 0);
  });

  it("기준선이 없으면(null) 미확인으로 보지 않는다", () => {
    assert.equal(countUnread(messages, null), 0);
    assert.equal(countUnread(messages, undefined), 0);
    assert.equal(countUnread(messages, ""), 0);
  });

  it("깨진 lastSeenAt이면 0", () => {
    assert.equal(countUnread(messages, "not-a-date"), 0);
  });

  it("모든 글이 기준선 이후면 전부 센다", () => {
    assert.equal(countUnread(messages, "2026-05-22T09:00:00.000Z"), 3);
  });

  it("빈 목록이면 0", () => {
    assert.equal(countUnread([], "2026-05-22T09:00:00.000Z"), 0);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTHOR_CUSTOMER,
  AUTHOR_OWNER,
  OWNER_IDENTITY,
  isOwnerMessage,
  buildMentionPrefix,
} from "../src/features/messages/lib/loungeMessage.js";

describe("loungeMessage.isOwnerMessage", () => {
  it("author_type='owner'면 true", () => {
    assert.equal(isOwnerMessage({ author_type: AUTHOR_OWNER }), true);
  });

  it("손님 글이나 author_type 없으면 false", () => {
    assert.equal(isOwnerMessage({ author_type: AUTHOR_CUSTOMER }), false);
    assert.equal(isOwnerMessage({}), false);
    assert.equal(isOwnerMessage(null), false);
    assert.equal(isOwnerMessage(undefined), false);
  });
});

describe("loungeMessage.buildMentionPrefix", () => {
  it("닉네임이 있으면 '@닉네임 ' 형태", () => {
    assert.equal(buildMentionPrefix("위스키탐험가"), "@위스키탐험가 ");
  });

  it("앞뒤 공백은 정리한다", () => {
    assert.equal(buildMentionPrefix("  맥주초보  "), "@맥주초보 ");
  });

  it("빈 닉네임이면 빈 문자열", () => {
    assert.equal(buildMentionPrefix(""), "");
    assert.equal(buildMentionPrefix("   "), "");
    assert.equal(buildMentionPrefix(null), "");
    assert.equal(buildMentionPrefix(undefined), "");
  });
});

describe("loungeMessage.OWNER_IDENTITY", () => {
  it("사장님 고정 표시 정보", () => {
    assert.equal(OWNER_IDENTITY.nickname, "사장님");
    assert.equal(typeof OWNER_IDENTITY.avatar, "string");
    assert.ok(OWNER_IDENTITY.avatar.length > 0);
  });
});

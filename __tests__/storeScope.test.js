import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasStoreScope,
  normalizeStoreId,
} from "../src/shared/lib/storeScope.js";

describe("storeScope", () => {
  it("normalizes a usable store id", () => {
    assert.equal(normalizeStoreId("  store-1  "), "store-1");
  });

  it("rejects missing or blank store ids", () => {
    assert.equal(hasStoreScope(null), false);
    assert.equal(hasStoreScope(undefined), false);
    assert.equal(hasStoreScope("   "), false);
  });
});

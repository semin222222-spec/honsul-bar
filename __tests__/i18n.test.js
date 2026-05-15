import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { translations } from "../src/shared/i18n/translations.js";

function collectShape(value, prefix = "") {
  if (Array.isArray(value)) return [`${prefix}[]:${value.length}`];
  if (!value || typeof value !== "object") return [prefix];

  return Object.keys(value)
    .sort()
    .flatMap((key) =>
      collectShape(value[key], prefix ? `${prefix}.${key}` : key),
    );
}

describe("i18n translations", () => {
  it("한국어와 일본어 번역 키 구조가 같다", () => {
    assert.deepEqual(
      collectShape(translations.ja),
      collectShape(translations.ko),
    );
  });

  it("지원 locale은 ko와 ja만 사용한다", () => {
    assert.deepEqual(Object.keys(translations).sort(), ["ja", "ko"]);
  });
});

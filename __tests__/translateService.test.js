import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  autoTranslateMenu,
  translateText,
} from "../src/shared/lib/translateService.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(response) {
  globalThis.fetch = async () => response;
}

describe("translateService", () => {
  it("빈 텍스트는 API 호출 없이 빈 문자열을 반환한다", async () => {
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      throw new Error("should not fetch");
    };

    assert.equal(await translateText("   "), "");
    assert.equal(called, false);
  });

  it("매치율이 충분한 번역 결과를 반환한다", async () => {
    mockFetch({
      ok: true,
      json: async () => ({
        responseStatus: 200,
        responseData: { translatedText: "ハイボール", match: 0.8 },
      }),
    });

    assert.equal(await translateText("하이볼"), "ハイボール");
  });

  it("매치율이 낮거나 HTTP 실패면 빈 문자열을 반환한다", async () => {
    mockFetch({
      ok: true,
      json: async () => ({
        responseStatus: 200,
        responseData: { translatedText: "不確実", match: 0.2 },
      }),
    });
    assert.equal(await translateText("테스트"), "");

    mockFetch({ ok: false, status: 500 });
    assert.equal(await translateText("테스트"), "");
  });

  it("메뉴 이름과 설명을 순서대로 번역한다", async () => {
    const responses = ["ジントニック", "爽やかな一杯"];
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        responseStatus: 200,
        responseData: { translatedText: responses.shift(), match: 0.9 },
      }),
    });

    const result = await autoTranslateMenu({
      name: "진토닉",
      description: "상쾌한 한 잔",
    });

    assert.deepEqual(result, {
      name_ja: "ジントニック",
      description_ja: "爽やかな一杯",
    });
  });
});

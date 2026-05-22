import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  KEYWORDS_BY_CATEGORY,
  CATEGORIES,
  ALL_IDENTITIES,
  pickIdentities,
} from "../src/features/games/callmyname/data/callMyNameKeywords.js";
import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  INITIAL_LIVES,
  GUESS_MAX_LEN,
  normalizeGuess,
  validateGuess,
  isResolved,
  allResolved,
} from "../src/features/games/callmyname/lib/callMyNameRules.js";

describe("callMyName 키워드 풀", () => {
  it("카테고리마다 키워드가 있고 전체가 중복 없이 평면화된다", () => {
    assert.ok(CATEGORIES.length >= 3);
    for (const cat of CATEGORIES) {
      assert.ok(KEYWORDS_BY_CATEGORY[cat].length > 0);
    }
    const keywords = ALL_IDENTITIES.map((x) => x.keyword);
    assert.equal(new Set(keywords).size, keywords.length, "키워드 중복 없음");
    // 최대 인원만큼은 충분히 있어야 서로 다른 정체 배정 가능
    assert.ok(ALL_IDENTITIES.length >= MAX_PLAYERS);
  });

  it("pickIdentities는 인원 수만큼 서로 다른 정체를 뽑는다", () => {
    const picked = pickIdentities(MAX_PLAYERS);
    assert.equal(picked.length, MAX_PLAYERS);
    const keys = picked.map((p) => p.keyword);
    assert.equal(new Set(keys).size, keys.length, "배정 키워드 서로 다름");
    for (const p of picked) {
      assert.ok(p.keyword && p.category);
    }
  });

  it("pickIdentities(0)은 빈 배열", () => {
    assert.deepEqual(pickIdentities(0), []);
  });
});

describe("callMyName 규칙 상수", () => {
  it("인원 2~8명, 라이프 3개 (작업지시 강제값)", () => {
    assert.equal(MIN_PLAYERS, 2);
    assert.equal(MAX_PLAYERS, 8);
    assert.equal(INITIAL_LIVES, 3);
  });
});

describe("normalizeGuess (정답 매칭 정규화)", () => {
  it("공백을 제거한다", () => {
    assert.equal(normalizeGuess("원 빈"), "원빈");
    assert.equal(normalizeGuess("백 설 공 주"), "백설공주");
  });

  it("특수문자를 제거한다", () => {
    assert.equal(normalizeGuess("원빈!"), "원빈");
    assert.equal(normalizeGuess("아이폰~"), "아이폰");
  });

  it("영문은 소문자로 통일한다", () => {
    assert.equal(normalizeGuess("iPhone"), normalizeGuess("iphone"));
  });

  it("같은 정답의 변형들은 동일하게 정규화된다", () => {
    const answer = normalizeGuess("백설공주");
    assert.equal(normalizeGuess(" 백설 공주 "), answer);
    assert.equal(normalizeGuess("백설공주!!"), answer);
  });

  it("다른 단어는 다르게 정규화된다 (부분 일치 불가)", () => {
    assert.notEqual(normalizeGuess("백설"), normalizeGuess("백설공주"));
  });
});

describe("validateGuess", () => {
  it("빈 값은 거부", () => {
    assert.equal(validateGuess("   ").ok, false);
  });
  it("길이 초과는 거부", () => {
    assert.equal(validateGuess("가".repeat(GUESS_MAX_LEN + 1)).ok, false);
  });
  it("정상 값은 trim해서 통과", () => {
    const res = validateGuess("  원빈  ");
    assert.equal(res.ok, true);
    assert.equal(res.value, "원빈");
  });
});

describe("게임 종료 판정", () => {
  it("isResolved는 solved/penalty만 true", () => {
    assert.equal(isResolved({ status: "solved" }), true);
    assert.equal(isResolved({ status: "penalty" }), true);
    assert.equal(isResolved({ status: "playing" }), false);
  });

  it("allResolved는 전원이 해결됐을 때만 true", () => {
    assert.equal(
      allResolved([{ status: "solved" }, { status: "penalty" }]),
      true,
    );
    assert.equal(
      allResolved([{ status: "solved" }, { status: "playing" }]),
      false,
    );
    assert.equal(allResolved([]), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IDENTITY_POOL,
  CATEGORIES,
  pickIdentities,
} from "../src/features/games/callmyname/data/callMyNameKeywords.js";
import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  INITIAL_LIVES,
  GUESS_MAX_LEN,
  HINT_CATEGORY_MS,
  HINT_LENGTH_MS,
  HINT_CHOSEONG_MS,
  GAME_DURATION_MS,
  normalizeGuess,
  validateGuess,
  isResolved,
  allResolved,
  toChoseong,
  answerLength,
  calcElapsedMs,
  getHintStage,
  isTimeUp,
  formatClock,
} from "../src/features/games/callmyname/lib/callMyNameRules.js";

describe("callMyName 정체 풀", () => {
  it("각 항목은 answer/category/hint 를 가지고 정답은 중복이 없다", () => {
    assert.ok(IDENTITY_POOL.length >= MAX_PLAYERS);
    assert.ok(CATEGORIES.length >= 3);
    for (const e of IDENTITY_POOL) {
      assert.ok(e.answer && e.category && e.hint, `누락: ${JSON.stringify(e)}`);
    }
    const answers = IDENTITY_POOL.map((e) => e.answer);
    assert.equal(new Set(answers).size, answers.length, "정답 중복 없음");
  });

  it("★ 모든 hint(초성)는 toChoseong(answer)와 일치한다 (전수 검증)", () => {
    const mismatches = IDENTITY_POOL.filter(
      (e) => e.hint !== toChoseong(e.answer),
    ).map((e) => `${e.answer}: ${e.hint} ≠ ${toChoseong(e.answer)}`);
    assert.deepEqual(mismatches, []);
  });

  it("pickIdentities는 인원 수만큼 서로 다른 정체(answer/category/hint)를 뽑는다", () => {
    const picked = pickIdentities(MAX_PLAYERS);
    assert.equal(picked.length, MAX_PLAYERS);
    const keys = picked.map((p) => p.answer);
    assert.equal(new Set(keys).size, keys.length, "배정 정답 서로 다름");
    for (const p of picked) {
      assert.ok(p.answer && p.category && p.hint);
    }
  });

  it("pickIdentities(0)은 빈 배열", () => {
    assert.deepEqual(pickIdentities(0), []);
  });
});

describe("toChoseong / answerLength", () => {
  it("한글 초성을 추출한다", () => {
    assert.equal(toChoseong("유재석"), "ㅇㅈㅅ");
    assert.equal(toChoseong("백설공주"), "ㅂㅅㄱㅈ");
    assert.equal(toChoseong("코끼리"), "ㅋㄲㄹ");
    assert.equal(toChoseong("찜질방"), "ㅉㅈㅂ");
  });
  it("글자 수를 센다", () => {
    assert.equal(answerLength("유재석"), 3);
    assert.equal(answerLength("아이스크림"), 5);
    assert.equal(answerLength(" 김치 "), 2);
  });
});

describe("callMyName 규칙 상수", () => {
  it("인원 2~8명, 라이프 3개 (작업지시 강제값)", () => {
    assert.equal(MIN_PLAYERS, 2);
    assert.equal(MAX_PLAYERS, 8);
    assert.equal(INITIAL_LIVES, 3);
  });
  it("힌트/종료 임계값 순서: 카테고리 < 글자수 < 초성 < 종료", () => {
    assert.ok(HINT_CATEGORY_MS < HINT_LENGTH_MS);
    assert.ok(HINT_LENGTH_MS < HINT_CHOSEONG_MS);
    assert.ok(HINT_CHOSEONG_MS < GAME_DURATION_MS);
  });
});

describe("타임어택 / 힌트 단계", () => {
  it("calcElapsedMs는 시작 없으면 0, 음수로 안 내려간다", () => {
    assert.equal(calcElapsedMs(null), 0);
    const future = new Date(Date.now() + 10_000).toISOString();
    assert.equal(calcElapsedMs(future), 0);
  });

  it("getHintStage는 임계 시각에서 단계적으로 열린다", () => {
    assert.deepEqual(getHintStage(0), {
      category: false,
      length: false,
      choseong: false,
    });
    assert.deepEqual(getHintStage(HINT_CATEGORY_MS), {
      category: true,
      length: false,
      choseong: false,
    });
    assert.deepEqual(getHintStage(HINT_LENGTH_MS), {
      category: true,
      length: true,
      choseong: false,
    });
    assert.deepEqual(getHintStage(HINT_CHOSEONG_MS), {
      category: true,
      length: true,
      choseong: true,
    });
  });

  it("isTimeUp은 종료 시각 이상에서 true", () => {
    assert.equal(isTimeUp(GAME_DURATION_MS - 1), false);
    assert.equal(isTimeUp(GAME_DURATION_MS), true);
  });

  it("formatClock은 MM:SS", () => {
    assert.equal(formatClock(0), "00:00");
    assert.equal(formatClock(65_000), "01:05");
    assert.equal(formatClock(12 * 60_000), "12:00");
  });
});

describe("normalizeGuess (정답 매칭 정규화)", () => {
  it("공백/특수문자 제거 + 소문자", () => {
    assert.equal(normalizeGuess("원 빈"), "원빈");
    assert.equal(normalizeGuess("원빈!"), "원빈");
    assert.equal(normalizeGuess("iPhone"), normalizeGuess("iphone"));
  });
  it("부분 일치는 다르게 정규화", () => {
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

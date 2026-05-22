import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BLANK,
  DRIP_QUESTIONS,
  splitOnBlank,
  pickRandomQuestion,
} from "../src/features/games/dripbattle/data/dripBattleQuestions.js";
import {
  ANSWER_MAX_LEN,
  MIN_PLAYERS,
  MAX_PLAYERS,
  TOTAL_ROUNDS,
  INPUT_SECONDS,
  VOTE_SECONDS,
  calcSecondsLeft,
  validateAnswer,
  inputComplete,
  votingComplete,
  computeRoundResult,
} from "../src/features/games/dripbattle/lib/dripBattleRules.js";

describe("dripBattle questions", () => {
  it("질문 풀은 비어있지 않고 모두 빈칸을 가진다", () => {
    assert.ok(DRIP_QUESTIONS.length >= TOTAL_ROUNDS);
    const noBlank = DRIP_QUESTIONS.filter((q) => !/_{2,}/.test(q));
    assert.deepEqual(noBlank, []);
  });

  it("splitOnBlank는 빈칸 앞/뒤로 나눈다", () => {
    assert.deepEqual(splitOnBlank("앞 ___ 뒤"), {
      before: "앞 ",
      after: " 뒤",
    });
    // 빈칸이 끝에 있는 경우
    assert.deepEqual(splitOnBlank("비밀: ___"), {
      before: "비밀: ",
      after: "",
    });
    // 빈칸이 없으면 전체가 before
    assert.deepEqual(splitOnBlank("빈칸없음"), {
      before: "빈칸없음",
      after: "",
    });
  });

  it("BLANK 토큰도 빈칸 정규식에 매칭된다", () => {
    assert.match(BLANK, /_{2,}/);
  });

  it("pickRandomQuestion은 사용한 질문을 제외한다", () => {
    const used = DRIP_QUESTIONS.slice(0, DRIP_QUESTIONS.length - 1);
    const remaining = DRIP_QUESTIONS[DRIP_QUESTIONS.length - 1];
    assert.equal(pickRandomQuestion(used), remaining);
  });

  it("모두 사용했으면 전체 풀에서 다시 뽑는다", () => {
    const picked = pickRandomQuestion(DRIP_QUESTIONS);
    assert.ok(DRIP_QUESTIONS.includes(picked));
  });
});

describe("dripBattle rules 상수", () => {
  it("인원 3~8명, 3라운드, 답변 50자", () => {
    assert.equal(MIN_PLAYERS, 3);
    assert.equal(MAX_PLAYERS, 8);
    assert.equal(TOTAL_ROUNDS, 3);
    assert.equal(ANSWER_MAX_LEN, 50);
    assert.ok(INPUT_SECONDS > 0);
    assert.ok(VOTE_SECONDS > 0);
  });
});

describe("validateAnswer", () => {
  it("빈 답변은 거부", () => {
    assert.equal(validateAnswer("   ").ok, false);
    assert.equal(validateAnswer("").ok, false);
  });
  it("50자 초과는 거부", () => {
    assert.equal(validateAnswer("가".repeat(51)).ok, false);
  });
  it("정상 답변은 trim해서 통과", () => {
    const res = validateAnswer("  웃긴 답변  ");
    assert.equal(res.ok, true);
    assert.equal(res.value, "웃긴 답변");
  });
});

describe("calcSecondsLeft", () => {
  it("시작 시각이 없으면 전체 시간", () => {
    assert.equal(calcSecondsLeft(null, 30), 30);
  });
  it("경과 시간을 뺀 남은 초", () => {
    const now = 100_000;
    const started = now - 10_000; // 10초 전
    assert.equal(calcSecondsLeft(started, 30, now), 20);
  });
  it("음수로 내려가지 않는다", () => {
    const now = 100_000;
    const started = now - 60_000;
    assert.equal(calcSecondsLeft(started, 30, now), 0);
  });
});

describe("inputComplete", () => {
  const players = [
    { session_id: "a" },
    { session_id: "b" },
    { session_id: "c" },
  ];
  it("전원 제출 시 true", () => {
    const answers = [
      { session_id: "a" },
      { session_id: "b" },
      { session_id: "c" },
    ];
    assert.equal(inputComplete({ players, answers }), true);
  });
  it("일부 미제출이면 false", () => {
    const answers = [{ session_id: "a" }, { session_id: "b" }];
    assert.equal(inputComplete({ players, answers }), false);
  });
  it("참가자 없으면 false", () => {
    assert.equal(inputComplete({ players: [], answers: [] }), false);
  });
});

describe("votingComplete", () => {
  const players = [
    { session_id: "a" },
    { session_id: "b" },
    { session_id: "c" },
  ];
  const answers = [
    { id: "1", session_id: "a" },
    { id: "2", session_id: "b" },
    { id: "3", session_id: "c" },
  ];
  it("답변 2개 미만이면 즉시 true (투표 무의미)", () => {
    assert.equal(
      votingComplete({ players, answers: [{ id: "1", session_id: "a" }], votes: [] }),
      true,
    );
  });
  it("전원 투표 시 true", () => {
    const votes = [
      { voter_session_id: "a" },
      { voter_session_id: "b" },
      { voter_session_id: "c" },
    ];
    assert.equal(votingComplete({ players, answers, votes }), true);
  });
  it("일부 미투표면 false", () => {
    const votes = [{ voter_session_id: "a" }];
    assert.equal(votingComplete({ players, answers, votes }), false);
  });
});

describe("computeRoundResult", () => {
  const answers = [
    { id: "1", session_id: "a", seat_label: "A-1", answer_text: "답1", created_at: "2026-01-01T00:00:01Z" },
    { id: "2", session_id: "b", seat_label: "A-2", answer_text: "답2", created_at: "2026-01-01T00:00:02Z" },
    { id: "3", session_id: "c", seat_label: "A-3", answer_text: "답3", created_at: "2026-01-01T00:00:03Z" },
  ];

  it("득표순으로 best/worst를 가린다", () => {
    const votes = [
      { target_answer_id: "2" },
      { target_answer_id: "2" },
      { target_answer_id: "1" },
    ];
    const { ranking, best, worst } = computeRoundResult(answers, votes);
    assert.equal(best.answer_id, "2");
    assert.equal(best.votes, 2);
    assert.equal(worst.answer_id, "3"); // 0표
    assert.equal(worst.votes, 0);
    assert.deepEqual(
      ranking.map((r) => r.answer_id),
      ["2", "1", "3"],
    );
    assert.deepEqual(
      ranking.map((r) => r.rank),
      [1, 2, 3],
    );
  });

  it("동점이면 먼저 제출한 답변이 상위", () => {
    const votes = []; // 전부 0표
    const { best, worst } = computeRoundResult(answers, votes);
    assert.equal(best.answer_id, "1"); // 가장 먼저 제출
    assert.equal(worst.answer_id, "3"); // 가장 늦게 제출
    assert.notEqual(best.answer_id, worst.answer_id);
  });

  it("답변 1개면 worst는 null (벌칙 없음)", () => {
    const one = [answers[0]];
    const { best, worst } = computeRoundResult(one, []);
    assert.equal(best.answer_id, "1");
    assert.equal(worst, null);
  });

  it("답변이 없으면 best/worst 모두 null", () => {
    const { ranking, best, worst } = computeRoundResult([], []);
    assert.deepEqual(ranking, []);
    assert.equal(best, null);
    assert.equal(worst, null);
  });
});

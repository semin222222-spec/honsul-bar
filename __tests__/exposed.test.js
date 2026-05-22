import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  MILD_QUESTIONS,
  MEDIUM_QUESTIONS,
  SPICE_META,
  getQuestionPool,
  pickRandomQuestion,
} from "../src/features/games/exposed/data/exposedQuestions.js";
import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  START_LIVES,
  SPICE_LEVELS,
  INPUT_SECONDS,
  VOTE_SECONDS,
  QUESTION_MAX_LEN,
  calcSecondsLeft,
  validateQuestion,
  inputComplete,
  voteComplete,
  tallyVotes,
  mySafety,
  anyEliminated,
  eliminatedSeats,
} from "../src/features/games/exposed/lib/exposedRules.js";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");

describe("exposed 질문 풀", () => {
  it("매운맛 2단계, 각 40개, 19금(hot) 없음", () => {
    assert.equal(MILD_QUESTIONS.length, 40);
    assert.equal(MEDIUM_QUESTIONS.length, 40);
    assert.deepEqual(SPICE_LEVELS, ["mild", "medium"]);
    assert.equal(SPICE_META.hot, undefined);
  });

  it("모든 질문은 비어있지 않은 문자열", () => {
    const all = [...MILD_QUESTIONS, ...MEDIUM_QUESTIONS];
    const bad = all.filter((q) => typeof q !== "string" || q.trim() === "");
    assert.deepEqual(bad, []);
  });

  it("금지 표현(성적/신체)이 없다", () => {
    const banned = ["섹스", "자봤", "키스", "잠자리", "침대", "가슴", "엉덩이"];
    const all = [...MILD_QUESTIONS, ...MEDIUM_QUESTIONS];
    const hits = all.filter((q) => banned.some((b) => q.includes(b)));
    assert.deepEqual(hits, []);
  });

  it("getQuestionPool은 매운맛별 풀을 돌려준다", () => {
    assert.equal(getQuestionPool("mild"), MILD_QUESTIONS);
    assert.equal(getQuestionPool("medium"), MEDIUM_QUESTIONS);
  });

  it("pickRandomQuestion은 사용한 질문을 제외한다", () => {
    const used = MEDIUM_QUESTIONS.slice(0, MEDIUM_QUESTIONS.length - 1);
    const remaining = MEDIUM_QUESTIONS[MEDIUM_QUESTIONS.length - 1];
    assert.equal(pickRandomQuestion("medium", used), remaining);
  });

  it("모두 사용했으면 전체 풀에서 다시 뽑는다", () => {
    const picked = pickRandomQuestion("mild", MILD_QUESTIONS);
    assert.ok(MILD_QUESTIONS.includes(picked));
  });
});

describe("exposed 상수 (스펙 고정값)", () => {
  it("최소 2명, 최대 8명, 라이프 5", () => {
    assert.equal(MIN_PLAYERS, 2);
    assert.equal(MAX_PLAYERS, 8);
    assert.equal(START_LIVES, 5);
    assert.ok(INPUT_SECONDS > 0);
    assert.ok(VOTE_SECONDS > 0);
    assert.equal(QUESTION_MAX_LEN, 80);
  });
});

describe("validateQuestion", () => {
  it("빈 질문은 거부", () => {
    assert.equal(validateQuestion("   ").ok, false);
    assert.equal(validateQuestion("").ok, false);
  });
  it("80자 초과는 거부", () => {
    assert.equal(validateQuestion("가".repeat(81)).ok, false);
  });
  it("정상 질문은 trim해서 통과", () => {
    const res = validateQuestion("  전 애인 SNS 본 적 있다  ");
    assert.equal(res.ok, true);
    assert.equal(res.value, "전 애인 SNS 본 적 있다");
  });
});

describe("calcSecondsLeft", () => {
  it("시작 시각이 없으면 전체 시간", () => {
    assert.equal(calcSecondsLeft(null, 15), 15);
  });
  it("경과 시간을 뺀 남은 초", () => {
    const now = 100_000;
    assert.equal(calcSecondsLeft(now - 5_000, 15, now), 10);
  });
  it("음수로 내려가지 않는다", () => {
    const now = 100_000;
    assert.equal(calcSecondsLeft(now - 60_000, 15, now), 0);
  });
});

describe("inputComplete / voteComplete", () => {
  const players = [
    { session_id: "a", status: "playing" },
    { session_id: "b", status: "playing" },
    { session_id: "c", status: "playing" },
  ];

  it("전원 제출 시 inputComplete true", () => {
    assert.equal(
      inputComplete({ players, submittedSessions: ["a", "b", "c"] }),
      true,
    );
  });
  it("일부 미제출이면 false", () => {
    assert.equal(inputComplete({ players, submittedSessions: ["a"] }), false);
  });
  it("참가자 없으면 false", () => {
    assert.equal(inputComplete({ players: [], submittedSessions: [] }), false);
  });

  it("살아있는 전원 투표 시 voteComplete true", () => {
    assert.equal(voteComplete({ players, votedSessions: ["a", "b", "c"] }), true);
  });
  it("탈락(penalty) 플레이어는 투표 대상에서 제외", () => {
    const withDead = [
      { session_id: "a", status: "playing" },
      { session_id: "b", status: "playing" },
      { session_id: "c", status: "penalty" },
    ];
    // c는 탈락이라 a,b만 투표하면 완료
    assert.equal(voteComplete({ players: withDead, votedSessions: ["a", "b"] }), true);
  });
});

describe("tallyVotes — 다수결 판정 (핵심 룰)", () => {
  it("접어 > 패스 → 다수파 접어(진실), 소수파 패스", () => {
    const votes = [
      { vote: "fold" },
      { vote: "fold" },
      { vote: "fold" },
      { vote: "fold" },
      { vote: "pass" },
    ];
    const r = tallyVotes(votes);
    assert.equal(r.foldCount, 4);
    assert.equal(r.passCount, 1);
    assert.equal(r.outcome, "fold_majority");
    assert.equal(r.minority, "pass");
    assert.equal(r.minorityCount, 1);
  });

  it("패스 > 접어 → 다수파 패스, 소수파 접어", () => {
    const votes = [{ vote: "pass" }, { vote: "pass" }, { vote: "fold" }];
    const r = tallyVotes(votes);
    assert.equal(r.outcome, "pass_majority");
    assert.equal(r.minority, "fold");
    assert.equal(r.minorityCount, 1);
  });

  it("동률(3:3) → 무승부, 아무도 -1 X", () => {
    const votes = [
      { vote: "fold" },
      { vote: "fold" },
      { vote: "fold" },
      { vote: "pass" },
      { vote: "pass" },
      { vote: "pass" },
    ];
    const r = tallyVotes(votes);
    assert.equal(r.outcome, "tie");
    assert.equal(r.minority, null);
    assert.equal(r.minorityCount, 0);
  });
});

describe("mySafety — 내 표 + outcome 만으로 계산 (남의 표 안 봄)", () => {
  it("동률이면 무승부(draw)", () => {
    assert.equal(mySafety("fold", "tie"), "draw");
    assert.equal(mySafety("pass", "tie"), "draw");
  });
  it("내 표가 다수파면 safe", () => {
    assert.equal(mySafety("fold", "fold_majority"), "safe");
    assert.equal(mySafety("pass", "pass_majority"), "safe");
  });
  it("내 표가 소수파면 lost(-1)", () => {
    assert.equal(mySafety("pass", "fold_majority"), "lost");
    assert.equal(mySafety("fold", "pass_majority"), "lost");
  });
  it("내 표를 모르면 unknown", () => {
    assert.equal(mySafety(null, "fold_majority"), "unknown");
    assert.equal(mySafety(undefined, "pass_majority"), "unknown");
  });
});

describe("anyEliminated / eliminatedSeats", () => {
  const players = [
    { seat_label: "A-1", status: "playing", lives_remaining: 3 },
    { seat_label: "A-2", status: "penalty", lives_remaining: 0 },
  ];
  it("라이프 0/penalty 가 있으면 탈락 감지", () => {
    assert.equal(anyEliminated(players), true);
    assert.deepEqual(eliminatedSeats(players), ["A-2"]);
  });
  it("전원 생존이면 탈락 없음", () => {
    const alive = [{ seat_label: "A-1", status: "playing", lives_remaining: 5 }];
    assert.equal(anyEliminated(alive), false);
    assert.deepEqual(eliminatedSeats(alive), []);
  });
});

describe("★ 익명성 보증 (데이터 계층)", () => {
  it("repository는 exposed_votes 테이블을 절대 쿼리하지 않는다", async () => {
    const src = await readFile(
      path.join(PROJECT_ROOT, "src/repositories/games/exposedRepository.js"),
      "utf8",
    );
    // 투표는 RPC(cast_vote/tally_round)로만. votes 테이블 직접 from()/select 금지.
    // (주석에서 'exposed_votes'를 언급하는 건 허용 — 실제 쿼리 호출만 막는다)
    assert.equal(src.includes('from("exposed_votes"'), false);
    assert.equal(src.includes("from('exposed_votes'"), false);
  });

  it("마이그레이션은 exposed_votes에 SELECT 정책을 두지 않는다 (INSERT만)", async () => {
    const sql = await readFile(
      path.join(PROJECT_ROOT, "supabase/migrations/20260523000000_exposed.sql"),
      "utf8",
    );
    // INSERT 전용 정책만 존재
    assert.ok(sql.includes("exposed_votes_anon_insert"));
    assert.ok(/CREATE POLICY exposed_votes_anon_insert[\s\S]*?FOR INSERT/.test(sql));
    // votes에 대한 ALL/SELECT 전체 허용 정책이 없어야 함
    assert.equal(sql.includes("exposed_votes_anon_all"), false);
    // 집계는 DEFINER 함수로
    assert.ok(sql.includes("SECURITY DEFINER"));
  });

  it("매운맛 CHECK 제약에 hot(19금)이 없다", async () => {
    const sql = await readFile(
      path.join(PROJECT_ROOT, "supabase/migrations/20260523000000_exposed.sql"),
      "utf8",
    );
    assert.ok(sql.includes("spice_level IN ('mild', 'medium')"));
    assert.equal(/'hot'/.test(sql), false);
  });
});

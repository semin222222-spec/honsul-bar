import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  NOMINATION_QUESTIONS,
  pickRandomQuestion,
} from "../src/features/games/exposed/data/exposedQuestions.js";
import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  VOTE_SECONDS,
  calcSecondsLeft,
  voteComplete,
  tallyNominations,
  buildResultRows,
} from "../src/features/games/exposed/lib/exposedRules.js";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const V1 = "supabase/migrations/20260523000000_exposed.sql";
const V2 = "supabase/migrations/20260523010000_exposed_nominate.sql";

describe("exposed 지목 질문 풀", () => {
  it("질문이 10개 이상이고 모두 비어있지 않은 문자열", () => {
    assert.ok(NOMINATION_QUESTIONS.length >= 10);
    const bad = NOMINATION_QUESTIONS.filter(
      (q) => typeof q !== "string" || q.trim() === "",
    );
    assert.deepEqual(bad, []);
  });

  it("금지 표현(성적/신체)이 없다", () => {
    const banned = ["섹스", "자봤", "키스", "잠자리", "침대", "가슴", "엉덩이"];
    const hits = NOMINATION_QUESTIONS.filter((q) =>
      banned.some((b) => q.includes(b)),
    );
    assert.deepEqual(hits, []);
  });

  it("pickRandomQuestion은 사용한 질문을 제외한다", () => {
    const used = NOMINATION_QUESTIONS.slice(0, NOMINATION_QUESTIONS.length - 1);
    const remaining = NOMINATION_QUESTIONS[NOMINATION_QUESTIONS.length - 1];
    assert.equal(pickRandomQuestion(used), remaining);
  });

  it("모두 사용했으면 전체 풀에서 다시 뽑는다", () => {
    const picked = pickRandomQuestion(NOMINATION_QUESTIONS);
    assert.ok(NOMINATION_QUESTIONS.includes(picked));
  });
});

describe("exposed 상수", () => {
  it("최소 2명, 최대 8명, 투표 시간 양수", () => {
    assert.equal(MIN_PLAYERS, 2);
    assert.equal(MAX_PLAYERS, 8);
    assert.ok(VOTE_SECONDS > 0);
  });
});

describe("calcSecondsLeft", () => {
  it("시작 시각이 없으면 전체 시간", () => {
    assert.equal(calcSecondsLeft(null, 20), 20);
  });
  it("경과 시간을 뺀 남은 초", () => {
    const now = 100_000;
    assert.equal(calcSecondsLeft(now - 5_000, 20, now), 15);
  });
  it("음수로 내려가지 않는다", () => {
    const now = 100_000;
    assert.equal(calcSecondsLeft(now - 60_000, 20, now), 0);
  });
});

describe("voteComplete", () => {
  const players = [
    { session_id: "a" },
    { session_id: "b" },
    { session_id: "c" },
  ];
  it("전원 지목 시 true", () => {
    assert.equal(voteComplete({ players, votedSessions: ["a", "b", "c"] }), true);
  });
  it("일부 미지목이면 false", () => {
    assert.equal(voteComplete({ players, votedSessions: ["a"] }), false);
  });
  it("참가자 없으면 false", () => {
    assert.equal(voteComplete({ players: [], votedSessions: [] }), false);
  });
});

describe("tallyNominations — 최다 득표 집계", () => {
  it("최다 득표자를 가린다", () => {
    const votes = [
      { target_seat_label: "A-5" },
      { target_seat_label: "A-5" },
      { target_seat_label: "A-5" },
      { target_seat_label: "A-2" },
    ];
    const r = tallyNominations(votes);
    assert.equal(r.total, 4);
    assert.equal(r.topVotes, 3);
    assert.deepEqual(r.topSeats, ["A-5"]);
    assert.deepEqual(
      r.counts.map((c) => c.seat_label),
      ["A-5", "A-2"],
    );
  });

  it("동률이면 최다 득표 자리가 복수", () => {
    const votes = [
      { target_seat_label: "A-1" },
      { target_seat_label: "A-1" },
      { target_seat_label: "A-2" },
      { target_seat_label: "A-2" },
    ];
    const r = tallyNominations(votes);
    assert.equal(r.topVotes, 2);
    assert.equal(r.topSeats.length, 2);
    assert.ok(r.topSeats.includes("A-1") && r.topSeats.includes("A-2"));
  });

  it("표가 없으면 topSeats 빈 배열", () => {
    const r = tallyNominations([]);
    assert.equal(r.topVotes, 0);
    assert.deepEqual(r.topSeats, []);
    assert.deepEqual(r.counts, []);
  });
});

describe("buildResultRows — 0표 포함 전체 정렬", () => {
  it("득표 없는 참가자도 0표로 포함, 내림차순", () => {
    const players = [
      { seat_label: "A-1" },
      { seat_label: "A-2" },
      { seat_label: "A-3" },
    ];
    const counts = [{ seat_label: "A-2", votes: 2 }];
    const rows = buildResultRows(players, counts);
    assert.equal(rows.length, 3);
    assert.equal(rows[0].seat_label, "A-2");
    assert.equal(rows[0].votes, 2);
    assert.equal(rows[1].votes, 0);
    assert.equal(rows[2].votes, 0);
  });
});

describe("★ 익명성 보증 (데이터 계층)", () => {
  it("repository는 exposed_votes 테이블을 절대 쿼리하지 않는다", async () => {
    const src = await readFile(
      path.join(PROJECT_ROOT, "src/repositories/games/exposedRepository.js"),
      "utf8",
    );
    assert.equal(src.includes('from("exposed_votes"'), false);
    assert.equal(src.includes("from('exposed_votes'"), false);
  });

  it("v1 마이그레이션: exposed_votes는 INSERT 정책만 (SELECT 없음)", async () => {
    const sql = await readFile(path.join(PROJECT_ROOT, V1), "utf8");
    assert.ok(sql.includes("exposed_votes_anon_insert"));
    assert.ok(
      /CREATE POLICY exposed_votes_anon_insert[\s\S]*?FOR INSERT/.test(sql),
    );
    assert.equal(sql.includes("exposed_votes_anon_all"), false);
  });

  it("v2 마이그레이션: 지목 구조 + DEFINER 집계, 새 SELECT 정책 없음", async () => {
    const sql = await readFile(path.join(PROJECT_ROOT, V2), "utf8");
    // 사연 제출 폐지
    assert.ok(sql.includes("DROP FUNCTION IF EXISTS public.exposed_submit_question"));
    // 지목 대상 컬럼
    assert.ok(sql.includes("target_session_id"));
    assert.ok(sql.includes("target_seat_label"));
    // 집계는 서버에서만
    assert.ok(sql.includes("SECURITY DEFINER"));
    // v2는 어떤 정책도 새로 만들지 않는다(votes는 v1 INSERT 전용 유지)
    assert.equal(sql.includes("CREATE POLICY"), false);
  });
});

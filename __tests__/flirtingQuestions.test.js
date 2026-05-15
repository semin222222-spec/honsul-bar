import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FINAL_RESULTS,
  QUESTIONS_R1,
  QUESTIONS_R2,
  QUESTIONS_R3,
  QUESTIONS_R4,
  QUESTIONS_R5,
  ROUND_RESULTS,
  getRandomQuestions,
} from "../src/features/games/flirting/data/flirtingQuestions.js";

const QUESTION_SETS = [
  QUESTIONS_R1,
  QUESTIONS_R2,
  QUESTIONS_R3,
  QUESTIONS_R4,
  QUESTIONS_R5,
];

describe("flirting questions", () => {
  it("각 라운드는 30개 질문을 가진다", () => {
    assert.deepEqual(
      QUESTION_SETS.map((questions) => questions.length),
      [30, 30, 30, 30, 30],
    );
  });

  it("모든 질문은 a/b 선택지를 가진다", () => {
    const invalid = QUESTION_SETS.flat().filter((question) => {
      return !question.text || !question.a?.text || !question.b?.text;
    });

    assert.deepEqual(invalid, []);
  });

  it("랜덤 질문은 5라운드와 정해진 난이도 순서를 반환한다", () => {
    const questions = getRandomQuestions();

    assert.equal(questions.length, 5);
    assert.deepEqual(
      questions.map((question) => question.round),
      [1, 2, 3, 4, 5],
    );
    assert.deepEqual(
      questions.map((question) => question.level),
      ["normal", "normal", "spicy1", "spicy2", "spicy3"],
    );
  });

  it("최종 결과와 라운드 결과 멘트가 모든 점수/상태를 지원한다", () => {
    assert.deepEqual(Object.keys(FINAL_RESULTS).sort(), [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    assert.deepEqual(Object.keys(ROUND_RESULTS).sort(), ["match", "mismatch"]);
  });
});

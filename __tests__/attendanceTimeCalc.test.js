import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  workDateOf,
  kstTime,
  buildManualTimes,
  workMs,
  isOvernight,
  isAbnormal,
  formatDurationShort,
  formatDurationKo,
  todayKst,
} from "../src/features/attendance/utils/timeCalc.js";

const HOUR = 60 * 60 * 1000;

describe("attendance/timeCalc — KST 기준", () => {
  it("workDateOf: 출근 시각의 KST 달력 날짜를 돌려준다", () => {
    // 2026-05-17 18:30 KST
    assert.equal(workDateOf("2026-05-17T18:30:00+09:00"), "2026-05-17");
    // 2026-05-18 01:30 KST (= 2026-05-17 16:30Z) — 자정 넘어간 instant
    assert.equal(workDateOf("2026-05-17T16:30:00Z"), "2026-05-18");
  });

  it("kstTime: instant 를 KST HH:MM 으로", () => {
    assert.equal(kstTime("2026-05-17T18:30:00+09:00"), "18:30");
    assert.equal(kstTime("2026-05-17T16:30:00Z"), "01:30");
  });

  it("같은 날 정상 출퇴근: 09:00 → 18:00 = 9시간", () => {
    const { checkInAt, checkOutAt, overnight } = buildManualTimes(
      "2026-05-17",
      9,
      0,
      18,
      0,
    );
    assert.equal(overnight, false);
    assert.equal(workMs(checkInAt, checkOutAt), 9 * HOUR);
    assert.equal(isOvernight(checkInAt, checkOutAt), false);
    assert.equal(kstTime(checkInAt), "09:00");
    assert.equal(kstTime(checkOutAt), "18:00");
  });

  it("새벽 퇴근: 18:30 → 03:15 = 8시간 45분, 다음날로 인식", () => {
    const { checkInAt, checkOutAt, overnight } = buildManualTimes(
      "2026-05-17",
      18,
      30,
      3,
      15,
    );
    assert.equal(overnight, true);
    assert.equal(workMs(checkInAt, checkOutAt), 8 * HOUR + 45 * 60 * 1000);
    assert.equal(isOvernight(checkInAt, checkOutAt), true);
    // 출근일은 그대로 17일, 퇴근은 18일
    assert.equal(workDateOf(checkInAt), "2026-05-17");
    assert.equal(workDateOf(checkOutAt), "2026-05-18");
    assert.equal(kstTime(checkOutAt), "03:15");
  });

  it("퇴근 == 출근(동시각)은 다음날 24시간으로 처리", () => {
    const { checkInAt, checkOutAt, overnight } = buildManualTimes(
      "2026-05-17",
      18,
      0,
      18,
      0,
    );
    assert.equal(overnight, true);
    assert.equal(workMs(checkInAt, checkOutAt), 24 * HOUR);
  });

  it("퇴근 시각 없으면 checkOut=null, overnight=false", () => {
    const { checkOutAt, overnight } = buildManualTimes("2026-05-17", 19, 0, NaN, NaN);
    assert.equal(checkOutAt, null);
    assert.equal(overnight, false);
    assert.equal(workMs("2026-05-17T19:00:00+09:00", null), null);
  });

  it("isAbnormal: 24시간 초과 또는 0 이하만 true", () => {
    // 30시간 (비정상)
    assert.equal(
      isAbnormal("2026-05-17T00:00:00Z", "2026-05-18T06:00:00Z"),
      true,
    );
    // 정상 8시간
    assert.equal(
      isAbnormal("2026-05-17T09:00:00Z", "2026-05-17T17:00:00Z"),
      false,
    );
    // 정확히 24시간은 비정상 아님
    assert.equal(
      isAbnormal("2026-05-17T00:00:00Z", "2026-05-18T00:00:00Z"),
      false,
    );
  });

  it("기간 포맷", () => {
    const ms = 8 * HOUR + 45 * 60 * 1000;
    assert.equal(formatDurationShort(ms), "8h 45m");
    assert.equal(formatDurationKo(ms), "8시간 45분");
    assert.equal(formatDurationShort(null), "—");
    assert.equal(formatDurationKo(30 * 60 * 1000), "30분");
  });

  it("todayKst 는 YYYY-MM-DD 형식", () => {
    assert.match(todayKst(), /^\d{4}-\d{2}-\d{2}$/);
  });
});

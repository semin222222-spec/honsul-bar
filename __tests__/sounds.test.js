import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  disableSound,
  enableSound,
  isSoundEnabled,
  playOrderSuccess,
} from "../src/shared/lib/sounds.js";

function createStorageMock() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

class FakeAudioContext {
  constructor() {
    this.state = "running";
    this.currentTime = 0;
    this.destination = {};
    this.started = [];
  }

  resume() {
    this.state = "running";
  }

  createOscillator() {
    return {
      type: "sine",
      frequency: { value: 0 },
      connect: () => {},
      start: (time) => this.started.push(["start", time]),
      stop: (time) => this.started.push(["stop", time]),
    };
  }

  createGain() {
    return {
      connect: () => {},
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
    };
  }
}

beforeEach(() => {
  globalThis.localStorage = createStorageMock();
  globalThis.window = { AudioContext: FakeAudioContext };
});

describe("sounds", () => {
  it("사용자 설정에 따라 사운드 활성 상태를 저장한다", () => {
    assert.equal(enableSound(), true);
    assert.equal(isSoundEnabled(), true);

    disableSound();
    assert.equal(isSoundEnabled(), false);
  });

  it("사운드 재생 함수는 비활성 상태에서 예외 없이 종료한다", () => {
    disableSound();
    assert.doesNotThrow(() => playOrderSuccess());
  });
});

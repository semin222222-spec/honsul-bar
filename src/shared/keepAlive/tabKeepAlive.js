// ============================================================
// Tab Keep-Alive (백그라운드 throttle 회피)
//
// Chrome은 백그라운드 탭의 timer/fetch/WebSocket을 throttle한다.
// 하지만 오디오가 재생 중인 탭은 "playing media"로 분류되어 throttle하지 않음.
// 무음 오디오를 계속 흘려보내서 POS처럼 항상 켜져 있어야 하는 화면에서
// 백그라운드(다른 앱 위에 덮임)여도 풀스피드로 동작하게 한다.
//
// 사용법:
//   1) 첫 사용자 제스처(클릭/터치) 후에만 시작 가능 (Chrome autoplay 정책)
//   2) startTabKeepAlive() 호출. 실패하면 다음 제스처에서 재시도하면 됨.
//   3) installKeepAliveOnFirstGesture()로 자동 hook 가능.
// ============================================================

let audioContext = null;
let oscillator = null;
let started = false;

function getAudioContextClass() {
  if (typeof window === "undefined") return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

export function isKeepAliveActive() {
  return started;
}

export async function startTabKeepAlive(logger = console) {
  if (started) return true;

  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) {
    logger?.warn?.("[KeepAlive] AudioContext 미지원 - 백그라운드 throttle 회피 불가");
    return false;
  }

  try {
    if (!audioContext) audioContext = new AudioContextClass();

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    // 무음 oscillator: gain=0이라도 destination에 연결돼 있으면
    // Chrome이 "audible tab"으로 분류해서 백그라운드 throttle을 풀어준다.
    oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    gain.gain.value = 0;
    oscillator.frequency.value = 440;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();

    started = true;
    logger?.log?.("[KeepAlive] 백그라운드 throttle 회피 활성화");
    return true;
  } catch (err) {
    logger?.warn?.("[KeepAlive] 시작 실패 (다음 제스처에서 재시도):", err);
    return false;
  }
}

export function stopTabKeepAlive() {
  try {
    oscillator?.stop?.();
  } catch {
    // 이미 멈춘 상태
  }
  oscillator = null;
  // audioContext는 재사용을 위해 close하지 않는다
  started = false;
}

/**
 * 첫 사용자 제스처(pointerdown)에서 자동 시작.
 * 이미 active면 no-op. 호출 시점에 제스처 컨텍스트가 살아있어야 한다.
 *
 * @returns {() => void} 리스너 해제 함수
 */
export function installKeepAliveOnFirstGesture(options = {}) {
  const {
    targetWindow = typeof window !== "undefined" ? window : null,
    logger = console,
  } = options;

  if (!targetWindow) return () => {};
  if (started) return () => {};

  const handler = async () => {
    const ok = await startTabKeepAlive(logger);
    if (ok) cleanup();
  };

  const cleanup = () => {
    targetWindow.removeEventListener("pointerdown", handler, true);
    targetWindow.removeEventListener("keydown", handler, true);
    targetWindow.removeEventListener("touchstart", handler, true);
  };

  targetWindow.addEventListener("pointerdown", handler, true);
  targetWindow.addEventListener("keydown", handler, true);
  targetWindow.addEventListener("touchstart", handler, true);

  return cleanup;
}

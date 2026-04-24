/**
 * 사운드 유틸리티
 * - Web Audio API로 실시간 생성 (파일 필요 없음)
 * - 바 매장 환경 고려: 볼륨 ↑, 반복 ↑
 */

let audioContextInstance = null;
let soundEnabled = false;

// AudioContext 싱글톤
function getAudioContext() {
  if (!audioContextInstance) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioContextInstance = new Ctx();
    } catch (e) {
      console.warn("AudioContext 지원 안 됨:", e);
      return null;
    }
  }
  return audioContextInstance;
}

/**
 * 사용자 상호작용 후 호출하여 오디오 활성화
 */
export function enableSound() {
  const ctx = getAudioContext();
  if (!ctx) return false;

  if (ctx.state === "suspended") {
    ctx.resume();
  }

  soundEnabled = true;
  localStorage.setItem("honsul_sound_enabled", "true");
  return true;
}

export function disableSound() {
  soundEnabled = false;
  localStorage.setItem("honsul_sound_enabled", "false");
}

export function isSoundEnabled() {
  if (soundEnabled) return true;
  return localStorage.getItem("honsul_sound_enabled") === "true";
}

/**
 * 단일 톤 재생 (벨 느낌)
 */
function playTone({ frequency, duration = 0.3, volume = 0.3, type = "sine", delay = 0 }) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  const startTime = ctx.currentTime + delay;

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

/**
 * 🍸 새 주문 알림 (사장님용)
 * - "딩동~ 딩동~" 2번 반복, 볼륨 ↑ (배경음악 속에서도 들리도록)
 */
export function playOrderNotification() {
  if (!isSoundEnabled()) return;

  // 1회차
  playTone({ frequency: 880, duration: 0.4, volume: 0.5, type: "sine" });
  playTone({ frequency: 659, duration: 0.5, volume: 0.45, type: "sine", delay: 0.18 });

  // 2회차 (약 0.8초 뒤 반복)
  playTone({ frequency: 880, duration: 0.4, volume: 0.5, type: "sine", delay: 0.85 });
  playTone({ frequency: 659, duration: 0.5, volume: 0.45, type: "sine", delay: 1.03 });
}

/**
 * 🔴 SOS 알림 (사장님용)
 * - "딩딩동! 딩딩동!" 긴급, 2번 반복
 */
export function playSOSNotification() {
  if (!isSoundEnabled()) return;

  // 1회차 - 3음 긴급
  playTone({ frequency: 988, duration: 0.22, volume: 0.55, type: "sine" });
  playTone({ frequency: 988, duration: 0.22, volume: 0.55, type: "sine", delay: 0.13 });
  playTone({ frequency: 1319, duration: 0.5, volume: 0.6, type: "sine", delay: 0.3 });

  // 2회차 (0.9초 뒤 반복)
  playTone({ frequency: 988, duration: 0.22, volume: 0.55, type: "sine", delay: 0.95 });
  playTone({ frequency: 988, duration: 0.22, volume: 0.55, type: "sine", delay: 1.08 });
  playTone({ frequency: 1319, duration: 0.5, volume: 0.6, type: "sine", delay: 1.25 });
}

/**
 * ✅ 주문 완료 (손님용)
 * - "딩!" 짧고 경쾌 (손님은 바로 옆에서 들으니까 적당한 볼륨)
 */
export function playOrderSuccess() {
  if (!isSoundEnabled()) return;
  playTone({ frequency: 1047, duration: 0.2, volume: 0.3, type: "sine" });
  playTone({ frequency: 1568, duration: 0.35, volume: 0.25, type: "sine", delay: 0.08 });
}

/**
 * 🎊 정산 완료 (손님용)
 * - "띠딩띵~" 부드러운 마무리
 */
export function playSettled() {
  if (!isSoundEnabled()) return;
  playTone({ frequency: 523, duration: 0.3, volume: 0.22, type: "sine" });
  playTone({ frequency: 659, duration: 0.35, volume: 0.22, type: "sine", delay: 0.12 });
  playTone({ frequency: 784, duration: 0.5, volume: 0.28, type: "sine", delay: 0.24 });
}

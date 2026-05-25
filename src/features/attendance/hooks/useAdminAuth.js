import { useState, useEffect, useCallback } from "react";

// ============================================================
// 관리자 PIN 인증
//
// ⚠️ 한계: VITE_ATTENDANCE_ADMIN_PIN 은 빌드 시 클라이언트 번들에 인라인된다.
//   즉 배포된 JS 를 뜯어보면 값이 보인다 → "진짜 비밀"이 아니라, 같은 단말기에서
//   직원/관리자 화면을 가르는 UI 게이트다. 실제 보안 경계는 사장님 로그인 + RLS.
//   (소스/깃에는 안 남기므로 env 로 처리하는 것이 코드 박기보다는 낫다.)
//
//   - 4자리 입력, 5회 실패 시 30초 잠금(sessionStorage)
//   - 인증되면 sessionStorage 토큰 (탭/브라우저 닫을 때까지 유효)
// ============================================================

const PIN = import.meta.env.VITE_ATTENDANCE_ADMIN_PIN;
const AUTH_KEY = "honsul_attendance_admin_authed";
const FAIL_KEY = "honsul_attendance_pin_fails";
const LOCK_KEY = "honsul_attendance_lock_until";
const MAX_FAILS = 5;
const LOCK_MS = 30 * 1000;

function readNum(key) {
  try {
    return Number(sessionStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}
function writeNum(key, value) {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // sessionStorage 불가 환경 — 무시
  }
}

export function useAdminAuth() {
  const configured = typeof PIN === "string" && PIN.length > 0;

  const [authed, setAuthed] = useState(() => {
    try {
      return sessionStorage.getItem(AUTH_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [error, setError] = useState("");
  const [lockUntil, setLockUntil] = useState(() => readNum(LOCK_KEY));
  const [now, setNow] = useState(() => Date.now());

  // 잠금 카운트다운 틱
  useEffect(() => {
    if (lockUntil <= Date.now()) return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [lockUntil]);

  const locked = lockUntil > now;
  const lockRemainingSec = locked ? Math.ceil((lockUntil - now) / 1000) : 0;

  const submit = useCallback(
    (input) => {
      if (!configured) {
        setError("PIN이 설정되지 않았어요 (.env)");
        return false;
      }
      if (lockUntil > Date.now()) return false;

      if (input === PIN) {
        setAuthed(true);
        setError("");
        writeNum(FAIL_KEY, 0);
        try {
          sessionStorage.setItem(AUTH_KEY, "1");
        } catch {
          // 무시
        }
        return true;
      }

      const fails = readNum(FAIL_KEY) + 1;
      writeNum(FAIL_KEY, fails);
      if (fails >= MAX_FAILS) {
        const until = Date.now() + LOCK_MS;
        writeNum(LOCK_KEY, until);
        writeNum(FAIL_KEY, 0);
        setLockUntil(until);
        setNow(Date.now());
        setError(`5회 실패 — ${LOCK_MS / 1000}초 후 다시 시도하세요`);
      } else {
        setError(`비밀번호가 틀렸어요 (${fails}/${MAX_FAILS})`);
      }
      return false;
    },
    [configured, lockUntil],
  );

  const clearError = useCallback(() => setError(""), []);

  const logout = useCallback(() => {
    setAuthed(false);
    try {
      sessionStorage.removeItem(AUTH_KEY);
    } catch {
      // 무시
    }
  }, []);

  return {
    configured,
    authed,
    error,
    locked,
    lockRemainingSec,
    submit,
    clearError,
    logout,
  };
}

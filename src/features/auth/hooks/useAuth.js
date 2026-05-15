import { useState, useEffect, useCallback } from "react";
import { authRepository } from "@/repositories/auth/authRepository";

/**
 * useAuth
 * - 사장님 인증 상태 관리
 * - 로그인/로그아웃/회원가입
 * - 현재 사용자 + 매장 정보
 *
 * 사용:
 *   const { user, owner, store, loading, signIn, signUp, signOut } = useAuth();
 */
export function useAuth() {
  const [user, setUser] = useState(null); // Supabase Auth 사용자
  const [owner, setOwner] = useState(null); // store_owners 정보
  const [store, setStore] = useState(null); // 자기 매장 정보
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // owner + store 정보 로드
  const loadOwnerAndStore = useCallback(async (userId) => {
    if (!userId) {
      setOwner(null);
      setStore(null);
      return;
    }

    try {
      // 1. store_owners에서 owner 정보 가져오기
      let ownerData;
      try {
        ownerData = await authRepository.getOwnerByUserId(userId);
      } catch (ownerError) {
        console.error("Owner 조회 실패:", ownerError);
        setOwner(null);
        setStore(null);
        return;
      }

      setOwner(ownerData);

      // 2. owner의 매장 정보 가져오기
      try {
        const storeData = await authRepository.getStoreByOwnerId(ownerData.id);
        setStore(storeData);
      } catch (storeError) {
        // 매장이 아직 없을 수 있음 (가입 직후)
        console.log("아직 매장 없음:", storeError.message);
        setStore(null);
      }
    } catch (err) {
      console.error("정보 로드 실패:", err);
    }
  }, []);

  // 초기 세션 체크
  useEffect(() => {
    const initAuth = async () => {
      const session = await authRepository.getAuthSession();
      if (session?.user) {
        setUser(session.user);
        await loadOwnerAndStore(session.user.id);
      }
      setLoading(false);
    };

    initAuth();

    // 인증 상태 변경 감지
    const unsubscribe = authRepository.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await loadOwnerAndStore(session.user.id);
        } else {
          setUser(null);
          setOwner(null);
          setStore(null);
        }
      },
    );

    return unsubscribe;
  }, [loadOwnerAndStore]);

  // 회원가입
  const signUp = async ({
    email,
    password,
    name,
    phone,
    storeName,
    storeSlug,
  }) => {
    setError(null);

    try {
      // 1. Supabase Auth로 사용자 생성
      let authData;
      try {
        authData = await authRepository.signUpWithEmail({
          email,
          password,
        });
      } catch (authError) {
        setError(authError.message);
        return { ok: false, reason: authError.message };
      }

      if (!authData.user) {
        setError("사용자 생성 실패");
        return { ok: false, reason: "no_user" };
      }

      // 2. store_owners에 정보 저장
      let ownerData;
      try {
        ownerData = await authRepository.createOwner({
          userId: authData.user.id,
          email,
          name,
          phone,
        });
      } catch (ownerError) {
        setError("사장님 정보 저장 실패: " + ownerError.message);
        return { ok: false, reason: ownerError.message };
      }

      // 3. 매장 생성 (선택 사항)
      if (storeName && storeSlug) {
        try {
          await authRepository.createStore({
            slug: storeSlug,
            name: storeName,
            ownerId: ownerData.id,
          });
        } catch (storeError) {
          // 매장 생성 실패해도 회원가입은 완료
          console.error("매장 생성 실패:", storeError.message);
        }
      }

      return { ok: true, user: authData.user };
    } catch (err) {
      setError(err.message);
      return { ok: false, reason: err.message };
    }
  };

  // 로그인
  const signIn = async ({ email, password }) => {
    setError(null);

    try {
      const data = await authRepository.signInWithPassword({
        email,
        password,
      });

      return { ok: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return { ok: false, reason: err.message };
    }
  };

  // 로그아웃
  const signOut = async () => {
    setError(null);
    try {
      await authRepository.signOut();
    } catch (error) {
      setError(error.message);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  };

  return {
    user,
    owner,
    store,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    // 편의 플래그
    isLoggedIn: !!user,
    hasStore: !!store,
  };
}

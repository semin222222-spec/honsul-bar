import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

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
  const [user, setUser] = useState(null);          // Supabase Auth 사용자
  const [owner, setOwner] = useState(null);        // store_owners 정보
  const [store, setStore] = useState(null);        // 자기 매장 정보
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
      const { data: ownerData, error: ownerError } = await supabase
        .from("store_owners")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (ownerError) {
        console.error("Owner 조회 실패:", ownerError);
        setOwner(null);
        setStore(null);
        return;
      }

      setOwner(ownerData);

      // 2. owner의 매장 정보 가져오기
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", ownerData.id)
        .single();

      if (storeError) {
        // 매장이 아직 없을 수 있음 (가입 직후)
        console.log("아직 매장 없음:", storeError.message);
        setStore(null);
      } else {
        setStore(storeData);
      }
    } catch (err) {
      console.error("정보 로드 실패:", err);
    }
  }, []);

  // 초기 세션 체크
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadOwnerAndStore(session.user.id);
      }
      setLoading(false);
    };

    initAuth();

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await loadOwnerAndStore(session.user.id);
        } else {
          setUser(null);
          setOwner(null);
          setStore(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadOwnerAndStore]);

  // 회원가입
  const signUp = async ({ email, password, name, phone, storeName, storeSlug }) => {
    setError(null);

    try {
      // 1. Supabase Auth로 사용자 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return { ok: false, reason: authError.message };
      }

      if (!authData.user) {
        setError("사용자 생성 실패");
        return { ok: false, reason: "no_user" };
      }

      // 2. store_owners에 정보 저장
      const { data: ownerData, error: ownerError } = await supabase
        .from("store_owners")
        .insert({
          user_id: authData.user.id,
          email,
          name,
          phone,
        })
        .select()
        .single();

      if (ownerError) {
        setError("사장님 정보 저장 실패: " + ownerError.message);
        return { ok: false, reason: ownerError.message };
      }

      // 3. 매장 생성 (선택 사항)
      if (storeName && storeSlug) {
        const { error: storeError } = await supabase
          .from("stores")
          .insert({
            slug: storeSlug,
            name: storeName,
            owner_id: ownerData.id,
          });

        if (storeError) {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return { ok: false, reason: error.message };
      }

      return { ok: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return { ok: false, reason: err.message };
    }
  };

  // 로그아웃
  const signOut = async () => {
    setError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
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

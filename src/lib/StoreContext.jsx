import { createContext, useContext, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./supabaseClient";

/**
 * StoreContext
 * - URL에서 매장 slug 추출 (/:storeSlug)
 * - DB에서 해당 매장 정보 조회
 * - 모든 컴포넌트가 store 정보 사용 가능
 */

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const { storeSlug } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStore() {
      if (!storeSlug) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error: err } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", storeSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) return;

      if (err) {
        setError(err);
        setStore(null);
      } else if (!data) {
        setError(new Error("Store not found"));
        setStore(null);
      } else {
        setError(null);
        setStore(data);
      }
      setLoading(false);
    }

    fetchStore();
    return () => { cancelled = true; };
  }, [storeSlug]);

  return (
    <StoreContext.Provider value={{ store, loading, error, storeSlug }}>
      {children}
    </StoreContext.Provider>
  );
}

/**
 * 매장 정보 사용 훅
 * - 모든 컴포넌트/훅에서 useStore() 호출하면 매장 정보 사용 가능
 */
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be used within StoreProvider");
  }
  return ctx;
}

/**
 * 현재 storeId만 빠르게 가져오기 (편의 훅)
 */
export function useStoreId() {
  const { store } = useStore();
  return store?.id || null;
}

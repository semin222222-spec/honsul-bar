import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useMenus
 * - 매장의 메뉴 카테고리 + 메뉴 데이터 가져오기
 * - 실시간으로 메뉴 변경 감지
 *
 * @param {string} storeId - 매장 ID
 * @returns {object} { categories, menus, loading, error, refetch }
 */
export function useMenus(storeId) {
  const [categories, setCategories] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 카테고리 가져오기
    const { data: cats, error: catErr } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("store_id", storeId)
      .order("display_order");

    // 활성 메뉴만 가져오기
    const { data: items, error: menuErr } = await supabase
      .from("menus")
      .select("*")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("display_order");

    if (catErr || menuErr) {
      setError(catErr || menuErr);
    } else {
      setError(null);
      setCategories(cats || []);
      setMenus(items || []);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    fetchData();

    if (!storeId) return;

    // 실시간 업데이트 — 사장님이 메뉴 추가/수정/삭제하면 손님 화면도 자동 갱신
    const channel = supabase
      .channel(`menus-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menus",
          filter: `store_id=eq.${storeId}`,
        },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menu_categories",
          filter: `store_id=eq.${storeId}`,
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, fetchData]);

  return {
    categories,
    menus,
    loading,
    error,
    refetch: fetchData,
  };
}

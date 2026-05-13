import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useMenuOptionsCustomer
 * - 손님 화면용 옵션 조회 (읽기 전용)
 * - 매장의 모든 메뉴 옵션을 Map<menu_id, options[]>으로 반환
 */
export function useMenuOptionsCustomer(storeId) {
  const [optionsByMenu, setOptionsByMenu] = useState(new Map());
  const [loading, setLoading] = useState(true);

  const loadOptions = useCallback(async () => {
    if (!storeId) return;

    setLoading(true);
    try {
      // 1. 매장의 메뉴 ID들
      const { data: menus, error: menuError } = await supabase
        .from("menus")
        .select("id")
        .eq("store_id", storeId);

      if (menuError) throw menuError;
      if (!menus || menus.length === 0) {
        setOptionsByMenu(new Map());
        setLoading(false);
        return;
      }

      const menuIds = menus.map(m => m.id);

      // 2. 옵션 조회 (활성 옵션만)
      const { data: options, error } = await supabase
        .from("menu_options")
        .select("*")
        .in("menu_id", menuIds)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      // 3. menu_id 기준 그룹핑
      const map = new Map();
      (options || []).forEach(opt => {
        if (!map.has(opt.menu_id)) {
          map.set(opt.menu_id, []);
        }
        map.get(opt.menu_id).push(opt);
      });

      setOptionsByMenu(map);
    } catch (err) {
      console.error("옵션 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadOptions();

    if (!storeId) return;

    // 실시간 구독 — 옵션 변경 감지
    const channel = supabase
      .channel(`menu_options-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menu_options",
        },
        () => loadOptions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, loadOptions]);

  return { optionsByMenu, loading };
}

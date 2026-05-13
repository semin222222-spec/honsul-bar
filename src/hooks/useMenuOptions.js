import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useMenuOptions
 * - 메뉴별 옵션 (잔/바틀 등) 관리
 * - 모든 메뉴의 옵션을 한 번에 로드
 * - menu_id를 키로 그룹핑
 */
export function useMenuOptions(storeId) {
  const [optionsByMenu, setOptionsByMenu] = useState(new Map());
  const [loading, setLoading] = useState(true);

  // 옵션 로드 (해당 매장의 모든 메뉴에 대한 옵션)
  const loadOptions = useCallback(async () => {
    if (!storeId) return;

    setLoading(true);
    try {
      // 1. 해당 매장의 메뉴 ID들 가져오기
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

      // 2. 옵션 가져오기
      const { data: options, error } = await supabase
        .from("menu_options")
        .select("*")
        .in("menu_id", menuIds)
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
  }, [loadOptions]);

  // 옵션 추가
  const createOption = useCallback(async (menuId, data) => {
    if (!menuId) return { ok: false, reason: "no_menu" };

    // 마지막 순서 다음으로
    const existing = optionsByMenu.get(menuId) || [];
    const nextOrder = existing.length > 0
      ? Math.max(...existing.map(o => o.display_order || 0)) + 1
      : 0;

    const { error } = await supabase.from("menu_options").insert({
      menu_id: menuId,
      name: data.name,
      name_ja: data.name_ja || null,
      price: data.price,
      display_order: data.display_order ?? nextOrder,
      is_active: data.is_active ?? true,
    });

    if (error) {
      console.error("옵션 추가 실패:", error);
      return { ok: false, reason: error.message };
    }
    await loadOptions();
    return { ok: true };
  }, [loadOptions, optionsByMenu]);

  // 옵션 수정
  const updateOption = useCallback(async (optionId, data) => {
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.name_ja !== undefined) updates.name_ja = data.name_ja || null;
    if (data.price !== undefined) updates.price = data.price;
    if (data.display_order !== undefined) updates.display_order = data.display_order;
    if (data.is_active !== undefined) updates.is_active = data.is_active;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("menu_options")
      .update(updates)
      .eq("id", optionId);

    if (error) {
      console.error("옵션 수정 실패:", error);
      return { ok: false, reason: error.message };
    }
    await loadOptions();
    return { ok: true };
  }, [loadOptions]);

  // 옵션 삭제
  const deleteOption = useCallback(async (optionId) => {
    const { error } = await supabase
      .from("menu_options")
      .delete()
      .eq("id", optionId);

    if (error) {
      console.error("옵션 삭제 실패:", error);
      return { ok: false, reason: error.message };
    }
    await loadOptions();
    return { ok: true };
  }, [loadOptions]);

  return {
    optionsByMenu,    // Map<menu_id, options[]>
    loading,
    refetch: loadOptions,
    createOption,
    updateOption,
    deleteOption,
  };
}

import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useMenusAdmin
 * - 사장님용 메뉴 관리 (CRUD)
 * - 카테고리 + 메뉴 추가/수정/삭제
 *
 * @param {string} storeId - 매장 ID
 * @param {function} refetch - useMenus 의 refetch (변경 후 강제 갱신용 안전장치)
 */
export function useMenusAdmin(storeId, refetch) {
  // ───── 메뉴 ─────

  // 메뉴 추가
  const createMenu = useCallback(async (data) => {
    if (!storeId) return { ok: false, reason: "no_store" };

    const { error } = await supabase.from("menus").insert({
      store_id: storeId,
      category_id: data.category_id,
      name: data.name,
      icon: data.icon,
      price: data.price,
      description: data.description,
      abv: data.abv,
      taste: data.taste,
      display_order: data.display_order || 999,
      is_active: data.is_active ?? true,
    });

    if (error) {
      console.error("메뉴 추가 실패:", error);
      return { ok: false, reason: error.message };
    }
    if (refetch) await refetch();
    return { ok: true };
  }, [storeId, refetch]);

  // 메뉴 수정
  const updateMenu = useCallback(async (menuId, data) => {
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.icon !== undefined) updates.icon = data.icon;
    if (data.price !== undefined) updates.price = data.price;
    if (data.description !== undefined) updates.description = data.description;
    if (data.abv !== undefined) updates.abv = data.abv;
    if (data.taste !== undefined) updates.taste = data.taste;
    if (data.category_id !== undefined) updates.category_id = data.category_id;
    if (data.is_active !== undefined) updates.is_active = data.is_active;
    if (data.display_order !== undefined) updates.display_order = data.display_order;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("menus")
      .update(updates)
      .eq("id", menuId);

    if (error) {
      console.error("메뉴 수정 실패:", error);
      return { ok: false, reason: error.message };
    }
    if (refetch) await refetch();
    return { ok: true };
  }, [refetch]);

  // 메뉴 삭제
  const deleteMenu = useCallback(async (menuId) => {
    const { error } = await supabase
      .from("menus")
      .delete()
      .eq("id", menuId);

    if (error) {
      console.error("메뉴 삭제 실패:", error);
      return { ok: false, reason: error.message };
    }
    if (refetch) await refetch();
    return { ok: true };
  }, [refetch]);

  // ───── 카테고리 ─────

  // 카테고리 추가
  const createCategory = useCallback(async (data) => {
    if (!storeId) return { ok: false, reason: "no_store" };

    // 마지막 display_order 다음 순서로
    const { data: existing } = await supabase
      .from("menu_categories")
      .select("display_order")
      .eq("store_id", storeId)
      .order("display_order", { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.display_order || 0) + 1;

    const { error } = await supabase.from("menu_categories").insert({
      store_id: storeId,
      name: data.name,
      default_price: data.default_price,
      color: data.color,
      display_order: data.display_order ?? nextOrder,
    });

    if (error) {
      console.error("카테고리 추가 실패:", error);
      return { ok: false, reason: error.message };
    }
    if (refetch) await refetch();
    return { ok: true };
  }, [storeId, refetch]);

  // 카테고리 수정
  const updateCategory = useCallback(async (categoryId, data) => {
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.default_price !== undefined) updates.default_price = data.default_price;
    if (data.color !== undefined) updates.color = data.color;
    if (data.display_order !== undefined) updates.display_order = data.display_order;

    const { error } = await supabase
      .from("menu_categories")
      .update(updates)
      .eq("id", categoryId);

    if (error) {
      console.error("카테고리 수정 실패:", error);
      return { ok: false, reason: error.message };
    }
    if (refetch) await refetch();
    return { ok: true };
  }, [refetch]);

  // 카테고리 삭제 (메뉴는 category_id가 NULL로 됨 — ON DELETE SET NULL 설정)
  const deleteCategory = useCallback(async (categoryId) => {
    const { error } = await supabase
      .from("menu_categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      console.error("카테고리 삭제 실패:", error);
      return { ok: false, reason: error.message };
    }
    if (refetch) await refetch();
    return { ok: true };
  }, [refetch]);

  return {
    createMenu,
    updateMenu,
    deleteMenu,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

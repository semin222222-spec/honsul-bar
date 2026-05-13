import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useMenusAdmin
 * - 사장님용 메뉴 관리 (CRUD)
 * - image_url 지원
 */
export function useMenusAdmin(storeId, refetch) {
  const createMenu = useCallback(async (data) => {
    if (!storeId) return { ok: false, reason: "no_store" };

    const { error } = await supabase.from("menus").insert({
      store_id: storeId,
      category_id: data.category_id,
      name: data.name,
      name_ja: data.name_ja || null,
      icon: data.icon,
      price: data.price,
      description: data.description,
      description_ja: data.description_ja || null,
      abv: data.abv,
      taste: data.taste,
      display_order: data.display_order || 999,
      is_active: data.is_active ?? true,
      image_url: data.image_url || null,
    });

    if (error) {
      console.error("메뉴 추가 실패:", error);
      return { ok: false, reason: error.message };
    }
    if (refetch) await refetch();
    return { ok: true };
  }, [storeId, refetch]);

  const updateMenu = useCallback(async (menuId, data) => {
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.name_ja !== undefined) updates.name_ja = data.name_ja || null;
    if (data.icon !== undefined) updates.icon = data.icon;
    if (data.price !== undefined) updates.price = data.price;
    if (data.description !== undefined) updates.description = data.description;
    if (data.description_ja !== undefined) updates.description_ja = data.description_ja || null;
    if (data.abv !== undefined) updates.abv = data.abv;
    if (data.taste !== undefined) updates.taste = data.taste;
    if (data.category_id !== undefined) updates.category_id = data.category_id;
    if (data.is_active !== undefined) updates.is_active = data.is_active;
    if (data.display_order !== undefined) updates.display_order = data.display_order;
    if (data.image_url !== undefined) updates.image_url = data.image_url || null;
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

  const createCategory = useCallback(async (data) => {
    if (!storeId) return { ok: false, reason: "no_store" };

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
      name_ja: data.name_ja || null,
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

  const updateCategory = useCallback(async (categoryId, data) => {
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.name_ja !== undefined) updates.name_ja = data.name_ja || null;
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

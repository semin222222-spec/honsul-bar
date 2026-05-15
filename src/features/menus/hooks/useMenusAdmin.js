import { useCallback } from "react";
import { menuRepository } from "@/repositories/menus/menuRepository";
import { hasStoreScope } from "@/shared/lib/storeScope";

/**
 * useMenusAdmin
 * - 사장님용 메뉴 관리 (CRUD)
 * - image_url 지원
 */
export function useMenusAdmin(storeId, refetch) {
  const createMenu = useCallback(
    async (data) => {
      if (!hasStoreScope(storeId)) return { ok: false, reason: "no_store" };

      try {
        await menuRepository.createMenu(storeId, data);
      } catch (error) {
        console.error("메뉴 추가 실패:", error);
        return { ok: false, reason: error.message };
      }
      if (refetch) await refetch();
      return { ok: true };
    },
    [storeId, refetch],
  );

  const updateMenu = useCallback(
    async (menuId, data) => {
      if (!hasStoreScope(storeId)) return { ok: false, reason: "no_store" };

      const updates = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.name_ja !== undefined) updates.name_ja = data.name_ja || null;
      if (data.icon !== undefined) updates.icon = data.icon;
      if (data.price !== undefined) updates.price = data.price;
      if (data.description !== undefined)
        updates.description = data.description;
      if (data.description_ja !== undefined)
        updates.description_ja = data.description_ja || null;
      if (data.abv !== undefined) updates.abv = data.abv;
      if (data.taste !== undefined) updates.taste = data.taste;
      if (data.category_id !== undefined)
        updates.category_id = data.category_id;
      if (data.is_active !== undefined) updates.is_active = data.is_active;
      if (data.display_order !== undefined)
        updates.display_order = data.display_order;
      if (data.image_url !== undefined)
        updates.image_url = data.image_url || null;
      updates.updated_at = new Date().toISOString();

      try {
        await menuRepository.updateMenu({ storeId, menuId, updates });
      } catch (error) {
        console.error("메뉴 수정 실패:", error);
        return { ok: false, reason: error.message };
      }
      if (refetch) await refetch();
      return { ok: true };
    },
    [storeId, refetch],
  );

  const deleteMenu = useCallback(
    async (menuId) => {
      if (!hasStoreScope(storeId)) return { ok: false, reason: "no_store" };

      try {
        await menuRepository.deleteMenu({ storeId, menuId });
      } catch (error) {
        console.error("메뉴 삭제 실패:", error);
        return { ok: false, reason: error.message };
      }
      if (refetch) await refetch();
      return { ok: true };
    },
    [storeId, refetch],
  );

  const createCategory = useCallback(
    async (data) => {
      if (!hasStoreScope(storeId)) return { ok: false, reason: "no_store" };

      try {
        const nextOrder =
          (await menuRepository.getLastCategoryDisplayOrder(storeId)) + 1;
        await menuRepository.createCategory(storeId, {
          ...data,
          display_order: data.display_order ?? nextOrder,
        });
      } catch (error) {
        console.error("카테고리 추가 실패:", error);
        return { ok: false, reason: error.message };
      }
      if (refetch) await refetch();
      return { ok: true };
    },
    [storeId, refetch],
  );

  const updateCategory = useCallback(
    async (categoryId, data) => {
      if (!hasStoreScope(storeId)) return { ok: false, reason: "no_store" };

      const updates = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.name_ja !== undefined) updates.name_ja = data.name_ja || null;
      if (data.default_price !== undefined)
        updates.default_price = data.default_price;
      if (data.color !== undefined) updates.color = data.color;
      if (data.display_order !== undefined)
        updates.display_order = data.display_order;

      try {
        await menuRepository.updateCategory({ storeId, categoryId, updates });
      } catch (error) {
        console.error("카테고리 수정 실패:", error);
        return { ok: false, reason: error.message };
      }
      if (refetch) await refetch();
      return { ok: true };
    },
    [storeId, refetch],
  );

  const deleteCategory = useCallback(
    async (categoryId) => {
      if (!hasStoreScope(storeId)) return { ok: false, reason: "no_store" };

      try {
        await menuRepository.deleteCategory({ storeId, categoryId });
      } catch (error) {
        console.error("카테고리 삭제 실패:", error);
        return { ok: false, reason: error.message };
      }
      if (refetch) await refetch();
      return { ok: true };
    },
    [storeId, refetch],
  );

  return {
    createMenu,
    updateMenu,
    deleteMenu,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

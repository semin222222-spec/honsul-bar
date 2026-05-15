import { useState, useEffect, useCallback } from "react";
import { menuRepository } from "@/repositories/menus/menuRepository";
import { hasStoreScope } from "@/shared/lib/storeScope";

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
    if (!hasStoreScope(storeId)) {
      setOptionsByMenu(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const menuIds = await menuRepository.listStoreMenuIds(storeId);
      if (menuIds.length === 0) {
        setOptionsByMenu(new Map());
        setLoading(false);
        return;
      }

      const options = await menuRepository.listOptionsByMenuIds(menuIds);

      // 3. menu_id 기준 그룹핑
      const map = new Map();
      (options || []).forEach((opt) => {
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

  const getStoreMenuIds = useCallback(async () => {
    if (!hasStoreScope(storeId)) return [];

    try {
      return await menuRepository.listStoreMenuIds(storeId);
    } catch (error) {
      console.error("매장 메뉴 확인 실패:", error);
      return [];
    }
  }, [storeId]);

  useEffect(() => {
    const timer = setTimeout(loadOptions, 0);
    return () => clearTimeout(timer);
  }, [loadOptions]);

  // 옵션 추가
  const createOption = useCallback(
    async (menuId, data) => {
      if (!menuId || !hasStoreScope(storeId)) {
        return { ok: false, reason: "no_menu" };
      }

      const storeMenuIds = await getStoreMenuIds();
      if (!storeMenuIds.includes(menuId)) {
        return { ok: false, reason: "menu_out_of_scope" };
      }

      // 마지막 순서 다음으로
      const existing = optionsByMenu.get(menuId) || [];
      const nextOrder =
        existing.length > 0
          ? Math.max(...existing.map((o) => o.display_order || 0)) + 1
          : 0;

      try {
        await menuRepository.createOption(menuId, {
          ...data,
          display_order: data.display_order ?? nextOrder,
        });
      } catch (error) {
        console.error("옵션 추가 실패:", error);
        return { ok: false, reason: error.message };
      }
      await loadOptions();
      return { ok: true };
    },
    [storeId, loadOptions, optionsByMenu, getStoreMenuIds],
  );

  // 옵션 수정
  const updateOption = useCallback(
    async (optionId, data) => {
      if (!hasStoreScope(storeId)) return { ok: false, reason: "no_store" };

      const storeMenuIds = await getStoreMenuIds();
      if (storeMenuIds.length === 0) {
        return { ok: false, reason: "no_menu" };
      }

      const updates = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.name_ja !== undefined) updates.name_ja = data.name_ja || null;
      if (data.price !== undefined) updates.price = data.price;
      if (data.display_order !== undefined)
        updates.display_order = data.display_order;
      if (data.is_active !== undefined) updates.is_active = data.is_active;
      updates.updated_at = new Date().toISOString();

      try {
        await menuRepository.updateOption({ optionId, storeMenuIds, updates });
      } catch (error) {
        console.error("옵션 수정 실패:", error);
        return { ok: false, reason: error.message };
      }
      await loadOptions();
      return { ok: true };
    },
    [storeId, loadOptions, getStoreMenuIds],
  );

  // 옵션 삭제
  const deleteOption = useCallback(
    async (optionId) => {
      if (!hasStoreScope(storeId)) return { ok: false, reason: "no_store" };

      const storeMenuIds = await getStoreMenuIds();
      if (storeMenuIds.length === 0) {
        return { ok: false, reason: "no_menu" };
      }

      try {
        await menuRepository.deleteOption({ optionId, storeMenuIds });
      } catch (error) {
        console.error("옵션 삭제 실패:", error);
        return { ok: false, reason: error.message };
      }
      await loadOptions();
      return { ok: true };
    },
    [storeId, loadOptions, getStoreMenuIds],
  );

  return {
    optionsByMenu, // Map<menu_id, options[]>
    loading,
    refetch: loadOptions,
    createOption,
    updateOption,
    deleteOption,
  };
}

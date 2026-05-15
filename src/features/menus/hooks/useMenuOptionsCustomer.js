import { useState, useEffect, useCallback } from "react";
import { menuRepository } from "@/repositories/menus/menuRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";

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
      const menuIds = await menuRepository.listStoreMenuIds(storeId);
      if (menuIds.length === 0) {
        setOptionsByMenu(new Map());
        setLoading(false);
        return;
      }

      const options = await menuRepository.listOptionsByMenuIds(menuIds, {
        activeOnly: true,
      });

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

  useEffect(() => {
    const timer = setTimeout(loadOptions, 0);

    if (!storeId) return () => clearTimeout(timer);

    // 실시간 구독 — 옵션 변경 감지
    const unsubscribe = menuRepository.subscribeToMenuOptions({
      storeId,
      onChange: () => loadOptions(),
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Menu Options",
          onSubscribed: loadOptions,
          onRecoverable: loadOptions,
        });
      },
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [storeId, loadOptions]);

  return { optionsByMenu, loading };
}

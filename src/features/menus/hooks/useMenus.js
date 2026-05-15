import { useState, useEffect, useCallback } from "react";
import { menuRepository } from "@/repositories/menus/menuRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";

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

    try {
      const [cats, items] = await Promise.all([
        menuRepository.listMenuCategories(storeId),
        menuRepository.listActiveMenus(storeId),
      ]);
      setError(null);
      setCategories(cats);
      setMenus(items);
    } catch (err) {
      setError(err);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 0);

    if (!storeId) return () => clearTimeout(timer);

    // 실시간 업데이트 — 사장님이 메뉴 추가/수정/삭제하면 손님 화면도 자동 갱신
    const unsubscribe = menuRepository.subscribeToMenus({
      storeId,
      onChange: () => fetchData(),
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Menus",
          onSubscribed: fetchData,
          onRecoverable: fetchData,
        });
      },
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
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

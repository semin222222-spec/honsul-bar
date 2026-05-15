import { useState, useEffect, useCallback, useRef } from "react";
import { inventoryRepository } from "@/repositories/inventory/inventoryRepository";
import { hasStoreScope } from "@/shared/lib/storeScope";

/**
 * useInventory
 * - 사장님 화면용 재고 관리
 * - 재료 목록 + 재고 이력 조회
 * - 입고/조정/CRUD 함수 제공 (모두 RPC 방식으로 RLS 우회)
 *
 * @param {string} storeId
 * @param {object} options - { includeInactive: boolean } 비활성 재료도 가져올지
 */
export function useInventory(storeId, options = {}) {
  const { includeInactive = false } = options;
  const hasActiveScope = hasStoreScope(storeId);
  const [ingredients, setIngredients] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(hasActiveScope);
  const channelRef = useRef(null);

  // ───── 재료 목록 조회 ─────
  const fetchIngredients = useCallback(async () => {
    if (!hasStoreScope(storeId)) return;
    try {
      const data = await inventoryRepository.listIngredients({
        storeId,
        includeInactive,
      });
      setIngredients(data);
    } catch (error) {
      console.error("[Inventory] fetch ingredients error:", error);
    }
  }, [storeId, includeInactive]);

  // ───── 이력 조회 (최근 100개) ─────
  const fetchMovements = useCallback(async () => {
    if (!hasStoreScope(storeId)) return;
    try {
      const data = await inventoryRepository.listStockMovements(storeId);
      setMovements(data);
    } catch (error) {
      console.error("[Inventory] fetch movements error:", error);
    }
  }, [storeId]);

  // ───── 초기 로드 ─────
  useEffect(() => {
    if (!hasActiveScope) return;

    (async () => {
      setLoading(true);
      await Promise.all([fetchIngredients(), fetchMovements()]);
      setLoading(false);
    })();

    return () => {
      if (channelRef.current) {
        channelRef.current();
        channelRef.current = null;
      }
    };
  }, [storeId, hasActiveScope, fetchIngredients, fetchMovements]);

  const ingredientBelongsToStore = useCallback(
    async (ingredientId) => {
      if (!ingredientId || !hasStoreScope(storeId)) return false;

      try {
        return await inventoryRepository.ingredientBelongsToStore({
          storeId,
          ingredientId,
        });
      } catch (error) {
        console.error("[Inventory] scope check error:", error);
        return false;
      }
    },
    [storeId],
  );

  // ───── 입고 (병 단위) ─────
  const restock = useCallback(
    async (ingredientId, bottles, reason = null) => {
      if (!(await ingredientBelongsToStore(ingredientId))) {
        return { success: false, error: "매장 범위를 벗어난 재료입니다" };
      }

      let data;
      try {
        data = await inventoryRepository.restockIngredient({
          ingredientId,
          bottles,
          reason,
        });
      } catch (error) {
        console.error("[Inventory] restock error:", error);
        return { success: false, error: error.message };
      }

      setIngredients((prev) =>
        prev.map((ing) =>
          ing.id === ingredientId
            ? { ...ing, current_stock: data.new_stock }
            : ing,
        ),
      );
      fetchMovements();
      return { success: true, data };
    },
    [fetchMovements, ingredientBelongsToStore],
  );

  // ───── 수동 조정 (+/−) ─────
  const adjust = useCallback(
    async (ingredientId, delta, reason) => {
      if (!(await ingredientBelongsToStore(ingredientId))) {
        return { success: false, error: "매장 범위를 벗어난 재료입니다" };
      }

      if (!reason || reason.trim() === "") {
        return { success: false, error: "조정 사유를 입력해주세요" };
      }

      let data;
      try {
        data = await inventoryRepository.adjustIngredientStock({
          ingredientId,
          delta,
          reason,
        });
      } catch (error) {
        console.error("[Inventory] adjust error:", error);
        return { success: false, error: error.message };
      }

      setIngredients((prev) =>
        prev.map((ing) =>
          ing.id === ingredientId
            ? { ...ing, current_stock: data.new_stock }
            : ing,
        ),
      );
      fetchMovements();
      return { success: true, data };
    },
    [fetchMovements, ingredientBelongsToStore],
  );

  // ───── 재료 추가 (RPC) ─────
  const createIngredient = useCallback(
    async (payload) => {
      if (!hasStoreScope(storeId)) {
        return { success: false, error: "매장 정보 없음" };
      }
      if (!payload.name || !payload.name.trim()) {
        return { success: false, error: "재료명을 입력해주세요" };
      }

      let data;
      try {
        data = await inventoryRepository.createIngredient({
          storeId,
          payload,
        });
      } catch (error) {
        console.error("[Inventory] create error:", error);
        return { success: false, error: error.message };
      }

      setIngredients((prev) => [...prev, data]);
      return { success: true, data };
    },
    [storeId],
  );

  // ───── 재료 수정 (RPC) ─────
  const updateIngredient = useCallback(
    async (ingredientId, payload) => {
      if (!(await ingredientBelongsToStore(ingredientId))) {
        return { success: false, error: "매장 범위를 벗어난 재료입니다" };
      }

      if (payload.name !== undefined && !payload.name.trim()) {
        return { success: false, error: "재료명을 입력해주세요" };
      }

      let data;
      try {
        data = await inventoryRepository.updateIngredient({
          ingredientId,
          payload,
        });
      } catch (error) {
        console.error("[Inventory] update error:", error);
        return { success: false, error: error.message };
      }

      setIngredients((prev) =>
        prev.map((ing) =>
          ing.id === ingredientId ? { ...ing, ...data } : ing,
        ),
      );
      return { success: true, data };
    },
    [ingredientBelongsToStore],
  );

  // ───── 재료 삭제 (안전 삭제) ─────
  const deleteIngredient = useCallback(
    async (ingredientId) => {
      if (!(await ingredientBelongsToStore(ingredientId))) {
        return { success: false, error: "매장 범위를 벗어난 재료입니다" };
      }

      let data;
      try {
        data = await inventoryRepository.deleteIngredientSafe(ingredientId);
      } catch (error) {
        console.error("[Inventory] delete error:", error);
        return { success: false, error: error.message };
      }

      // mode: 'deleted' = 진짜 삭제 / 'deactivated' = 비활성화
      if (data.mode === "deleted") {
        setIngredients((prev) => prev.filter((ing) => ing.id !== ingredientId));
      } else {
        if (includeInactive) {
          setIngredients((prev) =>
            prev.map((ing) =>
              ing.id === ingredientId ? { ...ing, is_active: false } : ing,
            ),
          );
        } else {
          setIngredients((prev) =>
            prev.filter((ing) => ing.id !== ingredientId),
          );
        }
      }

      return { success: true, data };
    },
    [includeInactive, ingredientBelongsToStore],
  );

  // ───── 재료 복원 ─────
  const restoreIngredient = useCallback(
    async (ingredientId) => {
      if (!(await ingredientBelongsToStore(ingredientId))) {
        return { success: false, error: "매장 범위를 벗어난 재료입니다" };
      }

      try {
        await inventoryRepository.restoreIngredient(ingredientId);
      } catch (error) {
        console.error("[Inventory] restore error:", error);
        return { success: false, error: error.message };
      }

      fetchIngredients();
      return { success: true };
    },
    [fetchIngredients, ingredientBelongsToStore],
  );

  // ───── 삭제 전 사용 여부 확인 ─────
  const checkIngredientUsage = useCallback(
    async (ingredientId) => {
      if (!(await ingredientBelongsToStore(ingredientId))) {
        return {
          recipeCount: 0,
          movementCount: 0,
          isInUse: false,
        };
      }

      const { recipeCount, movementCount } =
        await inventoryRepository.getIngredientUsage(ingredientId);

      return {
        recipeCount: recipeCount || 0,
        movementCount: movementCount || 0,
        isInUse: (recipeCount || 0) > 0 || (movementCount || 0) > 0,
      };
    },
    [ingredientBelongsToStore],
  );

  // ───── 부족 재료 개수 ─────
  const scopedIngredients = hasActiveScope ? ingredients : [];
  const scopedMovements = hasActiveScope ? movements : [];
  const lowStockCount = scopedIngredients
    .filter((i) => i.is_active !== false)
    .filter((i) => i.current_stock <= (i.low_stock_threshold || 0)).length;

  return {
    ingredients: scopedIngredients,
    movements: scopedMovements,
    loading: hasActiveScope ? loading : false,
    lowStockCount,
    restock,
    adjust,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    restoreIngredient,
    checkIngredientUsage,
    refetch: () => {
      fetchIngredients();
      fetchMovements();
    },
  };
}

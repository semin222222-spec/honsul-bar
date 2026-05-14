import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

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
  const [ingredients, setIngredients] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  // ───── 재료 목록 조회 ─────
  const fetchIngredients = useCallback(async () => {
    if (!storeId) return;
    let query = supabase
      .from("ingredients")
      .select("*")
      .eq("store_id", storeId);

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.order("display_order", { ascending: true });

    if (error) {
      console.error("[Inventory] fetch ingredients error:", error);
      return;
    }
    setIngredients(data || []);
  }, [storeId, includeInactive]);

  // ───── 이력 조회 (최근 100개) ─────
  const fetchMovements = useCallback(async () => {
    if (!storeId) return;
    const { data, error } = await supabase
      .from("stock_movements")
      .select(`
        *,
        ingredient:ingredients(name, unit)
      `)
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Inventory] fetch movements error:", error);
      return;
    }
    setMovements(data || []);
  }, [storeId]);

  // ───── 초기 로드 ─────
  useEffect(() => {
    if (!storeId) return;

    (async () => {
      setLoading(true);
      await Promise.all([fetchIngredients(), fetchMovements()]);
      setLoading(false);
    })();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [storeId, fetchIngredients, fetchMovements]);

  // ───── 입고 (병 단위) ─────
  const restock = useCallback(async (ingredientId, bottles, reason = null) => {
    const { data, error } = await supabase.rpc("restock_ingredient", {
      p_ingredient_id: ingredientId,
      p_bottles: bottles,
      p_reason: reason,
    });

    if (error) {
      console.error("[Inventory] restock error:", error);
      return { success: false, error: error.message };
    }

    setIngredients((prev) =>
      prev.map((ing) =>
        ing.id === ingredientId
          ? { ...ing, current_stock: data.new_stock }
          : ing
      )
    );
    fetchMovements();
    return { success: true, data };
  }, [fetchMovements]);

  // ───── 수동 조정 (+/−) ─────
  const adjust = useCallback(async (ingredientId, delta, reason) => {
    if (!reason || reason.trim() === "") {
      return { success: false, error: "조정 사유를 입력해주세요" };
    }

    const { data, error } = await supabase.rpc("adjust_ingredient_stock", {
      p_ingredient_id: ingredientId,
      p_delta: delta,
      p_reason: reason,
    });

    if (error) {
      console.error("[Inventory] adjust error:", error);
      return { success: false, error: error.message };
    }

    setIngredients((prev) =>
      prev.map((ing) =>
        ing.id === ingredientId
          ? { ...ing, current_stock: data.new_stock }
          : ing
      )
    );
    fetchMovements();
    return { success: true, data };
  }, [fetchMovements]);

  // ───── 재료 추가 (RPC) ─────
  const createIngredient = useCallback(async (payload) => {
    if (!storeId) return { success: false, error: "매장 정보 없음" };
    if (!payload.name || !payload.name.trim()) {
      return { success: false, error: "재료명을 입력해주세요" };
    }

    const { data, error } = await supabase.rpc("create_ingredient", {
      p_store_id: storeId,
      p_name: payload.name,
      p_name_ja: payload.name_ja || null,
      p_category: payload.category || "other",
      p_bottle_size: Number(payload.bottle_size) || 700,
      p_low_stock_threshold: Number(payload.low_stock_threshold) || 0,
      p_cost_per_bottle: Number(payload.cost_per_bottle) || 0,
    });

    if (error) {
      console.error("[Inventory] create error:", error);
      return { success: false, error: error.message };
    }

    setIngredients((prev) => [...prev, data]);
    return { success: true, data };
  }, [storeId]);

  // ───── 재료 수정 (RPC) ─────
  const updateIngredient = useCallback(async (ingredientId, payload) => {
    if (payload.name !== undefined && !payload.name.trim()) {
      return { success: false, error: "재료명을 입력해주세요" };
    }

    const { data, error } = await supabase.rpc("update_ingredient", {
      p_ingredient_id: ingredientId,
      p_name: payload.name ?? null,
      p_name_ja: payload.name_ja ?? null,
      p_category: payload.category ?? null,
      p_bottle_size: payload.bottle_size != null ? Number(payload.bottle_size) : null,
      p_low_stock_threshold: payload.low_stock_threshold != null ? Number(payload.low_stock_threshold) : null,
      p_cost_per_bottle: payload.cost_per_bottle != null ? Number(payload.cost_per_bottle) : null,
    });

    if (error) {
      console.error("[Inventory] update error:", error);
      return { success: false, error: error.message };
    }

    setIngredients((prev) =>
      prev.map((ing) => (ing.id === ingredientId ? { ...ing, ...data } : ing))
    );
    return { success: true, data };
  }, []);

  // ───── 재료 삭제 (안전 삭제) ─────
  const deleteIngredient = useCallback(async (ingredientId) => {
    const { data, error } = await supabase.rpc("delete_ingredient_safe", {
      p_ingredient_id: ingredientId,
    });

    if (error) {
      console.error("[Inventory] delete error:", error);
      return { success: false, error: error.message };
    }

    // mode: 'deleted' = 진짜 삭제 / 'deactivated' = 비활성화
    if (data.mode === "deleted") {
      setIngredients((prev) => prev.filter((ing) => ing.id !== ingredientId));
    } else {
      if (includeInactive) {
        setIngredients((prev) =>
          prev.map((ing) => (ing.id === ingredientId ? { ...ing, is_active: false } : ing))
        );
      } else {
        setIngredients((prev) => prev.filter((ing) => ing.id !== ingredientId));
      }
    }

    return { success: true, data };
  }, [includeInactive]);

  // ───── 재료 복원 ─────
  const restoreIngredient = useCallback(async (ingredientId) => {
    const { error } = await supabase.rpc("restore_ingredient", {
      p_ingredient_id: ingredientId,
    });

    if (error) {
      console.error("[Inventory] restore error:", error);
      return { success: false, error: error.message };
    }

    fetchIngredients();
    return { success: true };
  }, [fetchIngredients]);

  // ───── 삭제 전 사용 여부 확인 ─────
  const checkIngredientUsage = useCallback(async (ingredientId) => {
    const [
      { count: recipeCount },
      { count: movementCount },
    ] = await Promise.all([
      supabase
        .from("menu_recipes")
        .select("*", { count: "exact", head: true })
        .eq("ingredient_id", ingredientId),
      supabase
        .from("stock_movements")
        .select("*", { count: "exact", head: true })
        .eq("ingredient_id", ingredientId),
    ]);

    return {
      recipeCount: recipeCount || 0,
      movementCount: movementCount || 0,
      isInUse: (recipeCount || 0) > 0 || (movementCount || 0) > 0,
    };
  }, []);

  // ───── 부족 재료 개수 ─────
  const lowStockCount = ingredients
    .filter((i) => i.is_active !== false)
    .filter((i) => i.current_stock <= (i.low_stock_threshold || 0))
    .length;

  return {
    ingredients,
    movements,
    loading,
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

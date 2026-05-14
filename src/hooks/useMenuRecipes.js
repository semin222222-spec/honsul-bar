import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useMenuRecipes
 * - 특정 메뉴의 레시피 (재료 목록) 관리
 * - 추가/수정/삭제 모두 RPC로 처리 (RLS 우회)
 *
 * @param {string} menuId - 메뉴 ID
 */
export function useMenuRecipes(menuId) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // ───── 레시피 조회 ─────
  const fetchRecipes = useCallback(async () => {
    if (!menuId) {
      setRecipes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("menu_recipes")
      .select(`
        *,
        ingredient:ingredients(id, name, unit, category, current_stock, is_active)
      `)
      .eq("menu_id", menuId)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[Recipes] fetch error:", error);
      setLoading(false);
      return;
    }
    setRecipes(data || []);
    setLoading(false);
  }, [menuId]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  // ───── 레시피 항목 추가 ─────
  const addRecipe = useCallback(async (ingredientId, amount, notes = null) => {
    if (!menuId) return { success: false, error: "메뉴 정보 없음" };
    if (!ingredientId) return { success: false, error: "재료를 선택해주세요" };
    if (!amount || amount <= 0) return { success: false, error: "용량을 입력해주세요" };

    const { data, error } = await supabase.rpc("add_menu_recipe", {
      p_menu_id: menuId,
      p_ingredient_id: ingredientId,
      p_amount: Number(amount),
      p_notes: notes,
    });

    if (error) {
      console.error("[Recipes] add error:", error);
      return { success: false, error: error.message };
    }

    // 새 행 가져오기 위해 refetch (ingredient join 필요)
    fetchRecipes();
    return { success: true, data };
  }, [menuId, fetchRecipes]);

  // ───── 레시피 항목 수정 ─────
  const updateRecipe = useCallback(async (recipeId, payload) => {
    const { amount, notes } = payload;
    if (amount !== undefined && (!amount || amount <= 0)) {
      return { success: false, error: "용량은 0보다 커야 합니다" };
    }

    const { data, error } = await supabase.rpc("update_menu_recipe", {
      p_recipe_id: recipeId,
      p_amount: amount !== undefined ? Number(amount) : null,
      p_notes: notes !== undefined ? notes : null,
    });

    if (error) {
      console.error("[Recipes] update error:", error);
      return { success: false, error: error.message };
    }

    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, ...data } : r))
    );
    return { success: true, data };
  }, []);

  // ───── 레시피 항목 삭제 ─────
  const deleteRecipe = useCallback(async (recipeId) => {
    const { error } = await supabase.rpc("delete_menu_recipe", {
      p_recipe_id: recipeId,
    });

    if (error) {
      console.error("[Recipes] delete error:", error);
      return { success: false, error: error.message };
    }

    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    return { success: true };
  }, []);

  return {
    recipes,
    loading,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    refetch: fetchRecipes,
  };
}

import { supabase } from "@/shared/api/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

export async function listIngredients({ storeId, includeInactive }) {
  let query = supabase.from("ingredients").select("*").eq("store_id", storeId);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.order("display_order", {
    ascending: true,
  });

  throwIfError(error);
  return data || [];
}

export async function listStockMovements(storeId) {
  const { data, error } = await supabase
    .from("stock_movements")
    .select(
      `
        *,
        ingredient:ingredients(name, unit)
      `,
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(100);

  throwIfError(error);
  return data || [];
}

export async function ingredientBelongsToStore({ storeId, ingredientId }) {
  const { data, error } = await supabase
    .from("ingredients")
    .select("id")
    .eq("id", ingredientId)
    .eq("store_id", storeId)
    .maybeSingle();

  throwIfError(error);
  return !!data;
}

export async function restockIngredient({ ingredientId, bottles, reason }) {
  const { data, error } = await supabase.rpc("restock_ingredient", {
    p_ingredient_id: ingredientId,
    p_bottles: bottles,
    p_reason: reason,
  });

  throwIfError(error);
  return data;
}

export async function adjustIngredientStock({ ingredientId, delta, reason }) {
  const { data, error } = await supabase.rpc("adjust_ingredient_stock", {
    p_ingredient_id: ingredientId,
    p_delta: delta,
    p_reason: reason,
  });

  throwIfError(error);
  return data;
}

export async function createIngredient({ storeId, payload }) {
  const { data, error } = await supabase.rpc("create_ingredient", {
    p_store_id: storeId,
    p_name: payload.name,
    p_name_ja: payload.name_ja || null,
    p_category: payload.category || "other",
    p_bottle_size: Number(payload.bottle_size) || 700,
    p_low_stock_threshold: Number(payload.low_stock_threshold) || 0,
    p_cost_per_bottle: Number(payload.cost_per_bottle) || 0,
  });

  throwIfError(error);
  return data;
}

export async function updateIngredient({ ingredientId, payload }) {
  const { data, error } = await supabase.rpc("update_ingredient", {
    p_ingredient_id: ingredientId,
    p_name: payload.name ?? null,
    p_name_ja: payload.name_ja ?? null,
    p_category: payload.category ?? null,
    p_bottle_size:
      payload.bottle_size != null ? Number(payload.bottle_size) : null,
    p_low_stock_threshold:
      payload.low_stock_threshold != null
        ? Number(payload.low_stock_threshold)
        : null,
    p_cost_per_bottle:
      payload.cost_per_bottle != null ? Number(payload.cost_per_bottle) : null,
  });

  throwIfError(error);
  return data;
}

export async function deleteIngredientSafe(ingredientId) {
  const { data, error } = await supabase.rpc("delete_ingredient_safe", {
    p_ingredient_id: ingredientId,
  });

  throwIfError(error);
  return data;
}

export async function restoreIngredient(ingredientId) {
  const { error } = await supabase.rpc("restore_ingredient", {
    p_ingredient_id: ingredientId,
  });

  throwIfError(error);
}

export async function getIngredientUsage(ingredientId) {
  const [{ count: recipeCount }, { count: movementCount }] = await Promise.all([
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
  };
}

export const inventoryRepository = {
  listIngredients,
  listStockMovements,
  ingredientBelongsToStore,
  restockIngredient,
  adjustIngredientStock,
  createIngredient,
  updateIngredient,
  deleteIngredientSafe,
  restoreIngredient,
  getIngredientUsage,
};

import { supabase } from "@/shared/api/supabaseClient";
import { subscribeShared } from "@/shared/realtime/sharedChannel";

function throwIfError(error) {
  if (error) throw error;
}

export async function listMenuCategories(storeId) {
  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("store_id", storeId)
    .order("display_order");

  throwIfError(error);
  return data || [];
}

export async function listActiveMenus(storeId) {
  const { data, error } = await supabase
    .from("menus")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("display_order");

  throwIfError(error);
  return data || [];
}

export async function listStoreMenuIds(storeId) {
  const { data, error } = await supabase
    .from("menus")
    .select("id")
    .eq("store_id", storeId);

  throwIfError(error);
  return (data || []).map((menu) => menu.id);
}

export async function listOptionsByMenuIds(
  menuIds,
  { activeOnly = false } = {},
) {
  if (!menuIds || menuIds.length === 0) return [];

  let query = supabase
    .from("menu_options")
    .select("*")
    .in("menu_id", menuIds)
    .order("display_order", { ascending: true });

  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;

  throwIfError(error);
  return data || [];
}

export async function createMenu(storeId, data) {
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

  throwIfError(error);
}

export async function updateMenu({ storeId, menuId, updates }) {
  const { error } = await supabase
    .from("menus")
    .update(updates)
    .eq("id", menuId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function deleteMenu({ storeId, menuId }) {
  const { error } = await supabase
    .from("menus")
    .delete()
    .eq("id", menuId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function getLastCategoryDisplayOrder(storeId) {
  const { data, error } = await supabase
    .from("menu_categories")
    .select("display_order")
    .eq("store_id", storeId)
    .order("display_order", { ascending: false })
    .limit(1);

  throwIfError(error);
  return data?.[0]?.display_order || 0;
}

export async function createCategory(storeId, data) {
  const { error } = await supabase.from("menu_categories").insert({
    store_id: storeId,
    name: data.name,
    name_ja: data.name_ja || null,
    default_price: data.default_price,
    color: data.color,
    display_order: data.display_order,
  });

  throwIfError(error);
}

export async function updateCategory({ storeId, categoryId, updates }) {
  const { error } = await supabase
    .from("menu_categories")
    .update(updates)
    .eq("id", categoryId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function deleteCategory({ storeId, categoryId }) {
  const { error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", categoryId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function createOption(menuId, data) {
  const { error } = await supabase.from("menu_options").insert({
    menu_id: menuId,
    name: data.name,
    name_ja: data.name_ja || null,
    price: data.price,
    display_order: data.display_order,
    is_active: data.is_active ?? true,
  });

  throwIfError(error);
}

export async function updateOption({ optionId, storeMenuIds, updates }) {
  const { error } = await supabase
    .from("menu_options")
    .update(updates)
    .eq("id", optionId)
    .in("menu_id", storeMenuIds);

  throwIfError(error);
}

export async function deleteOption({ optionId, storeMenuIds }) {
  const { error } = await supabase
    .from("menu_options")
    .delete()
    .eq("id", optionId)
    .in("menu_id", storeMenuIds);

  throwIfError(error);
}

export function subscribeToMenus({ storeId, onChange, onStatus }) {
  return subscribeShared({
    topic: `menus-${storeId}`,
    bindings: [
      {
        event: "*",
        schema: "public",
        table: "menus",
        filter: `store_id=eq.${storeId}`,
      },
      {
        event: "*",
        schema: "public",
        table: "menu_categories",
        filter: `store_id=eq.${storeId}`,
      },
    ],
    listeners: { onChange, onStatus },
  });
}

export function subscribeToMenuOptions({ storeId, onChange, onStatus }) {
  return subscribeShared({
    topic: `menu_options-${storeId}`,
    bindings: [
      {
        event: "*",
        schema: "public",
        table: "menu_options",
      },
    ],
    listeners: { onChange, onStatus },
  });
}

export const menuRepository = {
  listMenuCategories,
  listActiveMenus,
  listStoreMenuIds,
  listOptionsByMenuIds,
  createMenu,
  updateMenu,
  deleteMenu,
  getLastCategoryDisplayOrder,
  createCategory,
  updateCategory,
  deleteCategory,
  createOption,
  updateOption,
  deleteOption,
  subscribeToMenus,
  subscribeToMenuOptions,
};

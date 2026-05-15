import { supabase } from "@/shared/api/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

export async function getActiveStoreBySlug(storeSlug) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", storeSlug)
    .eq("is_active", true)
    .maybeSingle();

  throwIfError(error);
  return data || null;
}

export const storeRepository = {
  getActiveStoreBySlug,
};

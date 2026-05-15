import { supabase } from "@/shared/api/supabaseClient";
import { subscribeShared } from "@/shared/realtime/sharedChannel";

function throwIfError(error) {
  if (error) throw error;
}

export async function listOrdersSince({ storeId, since, columns = "*" }) {
  const { data, error } = await supabase
    .from("orders")
    .select(columns)
    .eq("store_id", storeId)
    .gte("created_at", since);

  throwIfError(error);
  return data || [];
}

export async function listOrdersBetween({
  storeId,
  from,
  to,
  columns = "price",
}) {
  const { data, error } = await supabase
    .from("orders")
    .select(columns)
    .eq("store_id", storeId)
    .gte("created_at", from)
    .lt("created_at", to);

  throwIfError(error);
  return data || [];
}

export async function listOrdersForMonthlyHistory({ storeId, since }) {
  const { data, error } = await supabase
    .from("orders")
    .select("price, created_at")
    .eq("store_id", storeId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  throwIfError(error);
  return data || [];
}

export async function listSessionsSince({ storeId, since, columns }) {
  const { data, error } = await supabase
    .from("sessions")
    .select(columns)
    .eq("store_id", storeId)
    .gte("opened_at", since);

  throwIfError(error);
  return data || [];
}

export function subscribeToSalesStats({ storeId, onChange, onStatus }) {
  return subscribeShared({
    topic: `sales-stats-${storeId}`,
    bindings: [
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `store_id=eq.${storeId}`,
      },
    ],
    listeners: { onChange, onStatus },
  });
}

export const salesRepository = {
  listOrdersSince,
  listOrdersBetween,
  listOrdersForMonthlyHistory,
  listSessionsSince,
  subscribeToSalesStats,
};

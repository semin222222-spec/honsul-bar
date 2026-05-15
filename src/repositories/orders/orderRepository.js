import { supabase } from "@/shared/api/supabaseClient";

const OPEN_ORDER_SELECT = `
  *,
  session:sessions!inner(
    id, seat_label, nickname, avatar, status
  )
`;

function throwIfError(error) {
  if (error) throw error;
}

export async function listSessionOrders({ storeId, sessionId }) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("store_id", storeId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  throwIfError(error);
  return data || [];
}

export async function listOpenStoreOrders(storeId) {
  const { data, error } = await supabase
    .from("orders")
    .select(OPEN_ORDER_SELECT)
    .eq("store_id", storeId)
    .eq("session.status", "open")
    .order("created_at", { ascending: false });

  throwIfError(error);
  return data || [];
}

export async function getOpenStoreOrderById({ storeId, orderId }) {
  const { data, error } = await supabase
    .from("orders")
    .select(OPEN_ORDER_SELECT)
    .eq("id", orderId)
    .eq("store_id", storeId)
    .eq("session.status", "open")
    .maybeSingle();

  throwIfError(error);
  return data || null;
}

export async function insertOrders(rows) {
  const { data, error } = await supabase.from("orders").insert(rows).select();

  throwIfError(error);
  return data || [];
}

export async function touchSession({ storeId, sessionId, touchedAt }) {
  const { error } = await supabase
    .from("sessions")
    .update({ last_active_at: touchedAt })
    .eq("id", sessionId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function markOrderServed({ storeId, orderId, servedAt }) {
  const { error } = await supabase
    .from("orders")
    .update({
      status: "served",
      served_at: servedAt,
    })
    .eq("id", orderId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function deleteOrder({ storeId, orderId }) {
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function deleteStoreOrder({ storeId, orderId }) {
  return deleteOrder({ storeId, orderId });
}

export function subscribeToSessionOrders({
  storeId,
  sessionId,
  onChange,
  onStatus,
}) {
  const channel = supabase
    .channel(`orders-${storeId}-${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `session_id=eq.${sessionId}`,
      },
      onChange,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export function subscribeToStoreOrders({
  storeId,
  onInsert,
  onUpdate,
  onDelete,
  onStatus,
}) {
  const channel = supabase
    .channel(`orders-admin-realtime-${storeId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "orders",
        filter: `store_id=eq.${storeId}`,
      },
      onInsert,
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `store_id=eq.${storeId}`,
      },
      onUpdate,
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "orders",
        filter: `store_id=eq.${storeId}`,
      },
      onDelete,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export const orderRepository = {
  listSessionOrders,
  listOpenStoreOrders,
  getOpenStoreOrderById,
  insertOrders,
  touchSession,
  markOrderServed,
  deleteOrder,
  deleteStoreOrder,
  subscribeToSessionOrders,
  subscribeToStoreOrders,
};

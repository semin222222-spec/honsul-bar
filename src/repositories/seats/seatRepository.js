import { supabase } from "@/shared/api/supabaseClient";
import { subscribeShared } from "@/shared/realtime/sharedChannel";

function throwIfError(error) {
  if (error) throw error;
}

export async function listSeatRows(storeId) {
  const { data, error } = await supabase
    .from("seat_rows")
    .select("*")
    .eq("store_id", storeId)
    .order("display_order");

  throwIfError(error);
  return data || [];
}

export async function getLastSeatRowDisplayOrder(storeId) {
  const { data, error } = await supabase
    .from("seat_rows")
    .select("display_order")
    .eq("store_id", storeId)
    .order("display_order", { ascending: false })
    .limit(1);

  throwIfError(error);
  return data?.[0]?.display_order || 0;
}

export async function createSeatRow(storeId, data) {
  const { error } = await supabase.from("seat_rows").insert({
    store_id: storeId,
    name: data.name,
    seat_count: data.seat_count,
    display_order: data.display_order,
  });

  throwIfError(error);
}

export async function updateSeatRow({ storeId, rowId, updates }) {
  const { error } = await supabase
    .from("seat_rows")
    .update(updates)
    .eq("id", rowId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function deleteSeatRow({ storeId, rowId }) {
  const { error } = await supabase
    .from("seat_rows")
    .delete()
    .eq("id", rowId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function listOpenSeatOccupancy(storeId) {
  const { data, error } = await supabase
    .from("sessions")
    .select("seat_label, nickname, avatar, customer_id")
    .eq("store_id", storeId)
    .eq("status", "open");

  throwIfError(error);
  return data || [];
}

export async function updateSeatLayout({ storeId, rowId, layout }) {
  const { error } = await supabase
    .from("seat_rows")
    .update({ layout })
    .eq("id", rowId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function resetSeatLayout({ storeId, rowId }) {
  const { error } = await supabase
    .from("seat_rows")
    .update({ layout: null })
    .eq("id", rowId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export function subscribeToSeatRows({ storeId, onChange, onStatus }) {
  return subscribeShared({
    topic: `seat-rows-${storeId}`,
    bindings: [
      {
        event: "*",
        schema: "public",
        table: "seat_rows",
        filter: `store_id=eq.${storeId}`,
      },
    ],
    listeners: { onChange, onStatus },
  });
}

export function subscribeToSeatOccupancy({ storeId, onChange, onStatus }) {
  return subscribeShared({
    topic: `seat-occupancy-${storeId}`,
    bindings: [
      {
        event: "*",
        schema: "public",
        table: "sessions",
        filter: `store_id=eq.${storeId}`,
      },
    ],
    listeners: { onChange, onStatus },
  });
}

export const seatRepository = {
  listSeatRows,
  getLastSeatRowDisplayOrder,
  createSeatRow,
  updateSeatRow,
  deleteSeatRow,
  listOpenSeatOccupancy,
  updateSeatLayout,
  resetSeatLayout,
  subscribeToSeatRows,
  subscribeToSeatOccupancy,
};

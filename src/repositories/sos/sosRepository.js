import { supabase } from "@/shared/api/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

export async function insertSOSSignal({ storeId, seatLabel, requestType }) {
  const { error } = await supabase.from("sos_signals").insert({
    store_id: storeId,
    seat_label: seatLabel,
    request_type: requestType,
  });

  throwIfError(error);
}

export async function listActiveSOSSignals({ storeId, cutoff }) {
  const { data, error } = await supabase
    .from("sos_signals")
    .select("*")
    .eq("store_id", storeId)
    .in("state", ["pending", "accepted"])
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false });

  throwIfError(error);
  return data || [];
}

export async function resolveSOSSignal({ signalId, state }) {
  const { error } = await supabase.rpc("resolve_sos", {
    signal_id: signalId,
    new_state: state,
  });

  throwIfError(error);
}

export function subscribeToSOSSignals({
  storeId,
  onInsert,
  onUpdate,
  onStatus,
}) {
  const channel = supabase
    .channel(`sos-admin-realtime-${storeId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "sos_signals",
        filter: `store_id=eq.${storeId}`,
      },
      onInsert,
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "sos_signals",
        filter: `store_id=eq.${storeId}`,
      },
      onUpdate,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export const sosRepository = {
  insertSOSSignal,
  listActiveSOSSignals,
  resolveSOSSignal,
  subscribeToSOSSignals,
};

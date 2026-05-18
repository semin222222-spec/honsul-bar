import { supabase } from "@/shared/api/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

// ============================================================
// liar_rooms CRUD
// ============================================================

export async function listRoomsByStore(storeId) {
  const { data, error } = await supabase
    .from("liar_rooms")
    .select("*")
    .eq("store_id", storeId)
    .in("status", ["waiting", "word_reveal", "speech", "voting"])
    .order("created_at", { ascending: false });

  throwIfError(error);
  return data || [];
}

export async function getRoom(roomId) {
  const { data, error } = await supabase
    .from("liar_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  throwIfError(error);
  return data;
}

export async function createRoom(payload) {
  const { data, error } = await supabase
    .from("liar_rooms")
    .insert(payload)
    .select()
    .single();

  throwIfError(error);
  return data;
}

export async function updateRoom({ roomId, updates, returning = true, guard }) {
  let query = supabase.from("liar_rooms").update(updates).eq("id", roomId);

  if (guard && typeof guard === "object") {
    for (const [k, v] of Object.entries(guard)) {
      query = query.eq(k, v);
    }
  }

  if (returning) {
    query = query.select().maybeSingle();
  }

  const { data, error } = await query;
  throwIfError(error);
  return data ?? null;
}

export async function deleteRoom(roomId) {
  const { error } = await supabase
    .from("liar_rooms")
    .delete()
    .eq("id", roomId);
  throwIfError(error);
}

// ============================================================
// RPC
// ============================================================

export async function leaveRoomRpc({ roomId, sessionId }) {
  const { error } = await supabase.rpc("leave_liar_room", {
    p_room_id: roomId,
    p_session_id: sessionId,
  });
  throwIfError(error);
}

export async function heartbeatRpc({ roomId, sessionId }) {
  const { error } = await supabase.rpc("liar_room_heartbeat", {
    p_room_id: roomId,
    p_session_id: sessionId,
  });
  throwIfError(error);
}

export async function cleanupRoomsRpc({ storeId } = {}) {
  const { error } = await supabase.rpc("cleanup_liar_rooms", {
    p_store_id: storeId ?? null,
  });
  throwIfError(error);
}

// ============================================================
// 페이지 이탈 시 fire-and-forget leave
//
// navigator.sendBeacon은 apikey/Authorization 헤더를 못 보내고
// Supabase REST가 요구해서 안 통한다. fetch keepalive로 대체.
// (쉴드/캐치마인드와 동일 패턴)
// ============================================================
export function sendLeaveBeacon({ roomId, sessionId }) {
  if (!roomId || !sessionId) return false;
  if (typeof fetch !== "function") return false;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;

  try {
    fetch(`${url}/rest/v1/rpc/leave_liar_room`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        p_room_id: roomId,
        p_session_id: sessionId,
      }),
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Realtime
// ============================================================

export function subscribeToStoreRooms({ storeId, onChange, onStatus }) {
  const channel = supabase
    .channel(`liar-lobby-${storeId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "liar_rooms",
        filter: `store_id=eq.${storeId}`,
      },
      onChange,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export function subscribeToRoom({ roomId, onRoomChange, onStatus }) {
  const channel = supabase
    .channel(`liar-room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "liar_rooms",
        filter: `id=eq.${roomId}`,
      },
      onRoomChange,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export const liarRepository = {
  listRoomsByStore,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  leaveRoomRpc,
  heartbeatRpc,
  cleanupRoomsRpc,
  sendLeaveBeacon,
  subscribeToStoreRooms,
  subscribeToRoom,
};

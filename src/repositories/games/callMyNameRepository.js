import { supabase } from "@/shared/api/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

// ============================================================
// call_my_name_rooms CRUD
// ============================================================

export async function listRoomsByStore(storeId) {
  const { data, error } = await supabase
    .from("call_my_name_rooms")
    .select("*")
    .eq("store_id", storeId)
    .in("status", ["waiting", "playing"])
    .order("created_at", { ascending: false });

  throwIfError(error);
  return data || [];
}

export async function getRoom(roomId) {
  const { data, error } = await supabase
    .from("call_my_name_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  throwIfError(error);
  return data;
}

export async function createRoom(payload) {
  const { data, error } = await supabase
    .from("call_my_name_rooms")
    .insert(payload)
    .select()
    .single();

  throwIfError(error);
  return data;
}

export async function updateRoom({ roomId, updates, returning = true, guard }) {
  let query = supabase
    .from("call_my_name_rooms")
    .update(updates)
    .eq("id", roomId);

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
    .from("call_my_name_rooms")
    .delete()
    .eq("id", roomId);
  throwIfError(error);
}

// ============================================================
// RPC
// ============================================================

export async function attemptRpc({ roomId, sessionId, guess }) {
  const { data, error } = await supabase.rpc("call_my_name_attempt", {
    p_room_id: roomId,
    p_session_id: sessionId,
    p_guess: guess,
  });
  throwIfError(error);
  return data ?? null;
}

export async function leaveRoomRpc({ roomId, sessionId }) {
  const { error } = await supabase.rpc("leave_call_my_name_room", {
    p_room_id: roomId,
    p_session_id: sessionId,
  });
  throwIfError(error);
}

export async function heartbeatRpc({ roomId, sessionId }) {
  const { error } = await supabase.rpc("call_my_name_room_heartbeat", {
    p_room_id: roomId,
    p_session_id: sessionId,
  });
  throwIfError(error);
}

export async function cleanupRoomsRpc({ storeId } = {}) {
  const { error } = await supabase.rpc("cleanup_call_my_name_rooms", {
    p_store_id: storeId ?? null,
  });
  throwIfError(error);
}

// ============================================================
// 페이지 이탈 시 fire-and-forget leave (라이어/드립과 동일 패턴)
//
// navigator.sendBeacon은 apikey/Authorization 헤더를 못 보내 Supabase REST가
// 거부하므로 fetch keepalive로 대체.
// ============================================================
export function sendLeaveBeacon({ roomId, sessionId }) {
  if (!roomId || !sessionId) return false;
  if (typeof fetch !== "function") return false;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;

  try {
    fetch(`${url}/rest/v1/rpc/leave_call_my_name_room`, {
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
    .channel(`cmn-lobby-${storeId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "call_my_name_rooms",
        filter: `store_id=eq.${storeId}`,
      },
      onChange,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export function subscribeToRoom({ roomId, onRoomChange, onStatus }) {
  const channel = supabase
    .channel(`cmn-room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "call_my_name_rooms",
        filter: `id=eq.${roomId}`,
      },
      onRoomChange,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export const callMyNameRepository = {
  listRoomsByStore,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  attemptRpc,
  leaveRoomRpc,
  heartbeatRpc,
  cleanupRoomsRpc,
  sendLeaveBeacon,
  subscribeToStoreRooms,
  subscribeToRoom,
};

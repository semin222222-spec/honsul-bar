import { supabase } from "@/shared/api/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

// ============================================================
// catchmind_rooms
// ============================================================

export async function listRoomsByStore(storeId) {
  const { data, error } = await supabase
    .from("catchmind_rooms")
    .select("*")
    .eq("store_id", storeId)
    .in("status", ["waiting", "countdown", "playing", "transition"])
    .order("created_at", { ascending: false });

  throwIfError(error);
  return data || [];
}

export async function getRoom(roomId) {
  const { data, error } = await supabase
    .from("catchmind_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  throwIfError(error);
  return data;
}

export async function findActiveRoomForSession({ storeId, sessionId }) {
  const { data, error } = await supabase
    .from("catchmind_rooms")
    .select("*")
    .eq("store_id", storeId)
    .in("status", ["waiting", "countdown", "playing", "transition"])
    .contains("players", JSON.stringify([{ session_id: sessionId }]))
    .order("created_at", { ascending: false })
    .limit(1);

  throwIfError(error);
  return (data && data[0]) || null;
}

export async function createRoom(payload) {
  const { data, error } = await supabase
    .from("catchmind_rooms")
    .insert(payload)
    .select()
    .single();

  throwIfError(error);
  return data;
}

export async function updateRoom({ roomId, updates, returning = true, guard }) {
  let query = supabase.from("catchmind_rooms").update(updates).eq("id", roomId);

  // guard: { status: 'playing' } 같은 조건부 업데이트 (race condition 방지)
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
    .from("catchmind_rooms")
    .delete()
    .eq("id", roomId);
  throwIfError(error);
}

export function subscribeToStoreRooms({ storeId, onChange, onStatus }) {
  const channel = supabase
    .channel(`catchmind-lobby-${storeId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "catchmind_rooms",
        filter: `store_id=eq.${storeId}`,
      },
      onChange,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export function subscribeToRoom({
  roomId,
  onRoomChange,
  onStrokeInsert,
  onMessageInsert,
  onStatus,
}) {
  const channel = supabase
    .channel(`catchmind-room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "catchmind_rooms",
        filter: `id=eq.${roomId}`,
      },
      onRoomChange,
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "catchmind_strokes",
        filter: `room_id=eq.${roomId}`,
      },
      onStrokeInsert,
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "catchmind_messages",
        filter: `room_id=eq.${roomId}`,
      },
      onMessageInsert,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

// ============================================================
// catchmind_strokes
// ============================================================

export async function insertStroke({ roomId, roundNumber, strokeData }) {
  const { error } = await supabase.from("catchmind_strokes").insert({
    room_id: roomId,
    round_number: roundNumber,
    stroke_data: strokeData,
  });
  throwIfError(error);
}

export async function listStrokes({ roomId, roundNumber }) {
  const { data, error } = await supabase
    .from("catchmind_strokes")
    .select("*")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber)
    .order("id", { ascending: true });
  throwIfError(error);
  return data || [];
}

// ============================================================
// catchmind_messages
// ============================================================

export async function insertMessage(payload) {
  const { error } = await supabase.from("catchmind_messages").insert(payload);
  throwIfError(error);
}

export async function listMessages({ roomId, limit = 100 }) {
  const { data, error } = await supabase
    .from("catchmind_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("id", { ascending: true })
    .limit(limit);
  throwIfError(error);
  return data || [];
}

export const catchmindRepository = {
  listRoomsByStore,
  getRoom,
  findActiveRoomForSession,
  createRoom,
  updateRoom,
  deleteRoom,
  subscribeToStoreRooms,
  subscribeToRoom,
  insertStroke,
  listStrokes,
  insertMessage,
  listMessages,
};

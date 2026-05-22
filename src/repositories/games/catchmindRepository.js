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

// 원자적 leave (RPC) — race condition 없이 players 제거 + 호스트 위임 + 빈 방 삭제
export async function leaveRoomRpc({ roomId, sessionId }) {
  const { error } = await supabase.rpc("leave_catchmind_room", {
    p_room_id: roomId,
    p_session_id: sessionId,
  });
  throwIfError(error);
}

// 좀비 방 정리 (RPC)
export async function cleanupRooms() {
  const { data, error } = await supabase.rpc("cleanup_catchmind_rooms");
  throwIfError(error);
  return data || 0;
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

// 그리는 도중의 부분 선(live stroke)은 DB를 거치지 않고 Broadcast로 흘려보낸다.
//  - postgres_changes(=DB INSERT)는 지연이 커서 손 뗄 때마다 툭툭 끊겨 보인다.
//  - Broadcast는 ephemeral pub/sub이라 저지연. 보는 사람이 선이 그려지는 과정을
//    실시간으로 본다. 영구 기록(늦게 들어온 사람/재접속/clear 후 redraw)은
//    pointerup 때 insertStroke로 따로 남긴다.
//
// 반환값: { unsubscribe, sendLiveDraw }
//  - sendLiveDraw(payload): 그리는 사람이 부분 선을 broadcast (fire-and-forget)
//  - onLiveDraw(payload): 보는 사람이 부분 선을 수신
export function subscribeToRoom({
  roomId,
  onRoomChange,
  onStrokeInsert,
  onMessageInsert,
  onLiveDraw,
  onStatus,
}) {
  const channel = supabase
    .channel(`catchmind-room-${roomId}`, {
      // self:false → 본인이 보낸 broadcast는 본인에게 안 옴 (그리는 사람은
      // 로컬에 이미 그리므로 echo 불필요)
      config: { broadcast: { self: false } },
    })
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
    .on("broadcast", { event: "draw" }, (msg) => onLiveDraw?.(msg.payload))
    .subscribe(onStatus);

  const sendLiveDraw = (payload) => {
    // 구독 전이거나 채널이 죽었으면 조용히 무시 (DB 기록이 있으니 손실돼도 안전)
    try {
      channel.send({ type: "broadcast", event: "draw", payload });
    } catch {
      // ignore
    }
  };

  return {
    unsubscribe: () => supabase.removeChannel(channel),
    sendLiveDraw,
  };
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
  leaveRoomRpc,
  cleanupRooms,
  subscribeToStoreRooms,
  subscribeToRoom,
  insertStroke,
  listStrokes,
  insertMessage,
  listMessages,
};

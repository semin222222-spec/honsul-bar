import { supabase } from "@/shared/api/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

// ============================================================
// drip_battle_rooms CRUD
// ============================================================

export async function listRoomsByStore(storeId) {
  const { data, error } = await supabase
    .from("drip_battle_rooms")
    .select("*")
    .eq("store_id", storeId)
    .in("status", ["waiting", "phase_input", "phase_vote", "phase_result"])
    .order("created_at", { ascending: false });

  throwIfError(error);
  return data || [];
}

export async function getRoom(roomId) {
  const { data, error } = await supabase
    .from("drip_battle_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  throwIfError(error);
  return data;
}

export async function createRoom(payload) {
  const { data, error } = await supabase
    .from("drip_battle_rooms")
    .insert(payload)
    .select()
    .single();

  throwIfError(error);
  return data;
}

export async function updateRoom({ roomId, updates, returning = true, guard }) {
  let query = supabase.from("drip_battle_rooms").update(updates).eq("id", roomId);

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
    .from("drip_battle_rooms")
    .delete()
    .eq("id", roomId);
  throwIfError(error);
}

// ============================================================
// drip_battle_answers
// ============================================================

export async function listAnswers({ roomId, roundNumber }) {
  let query = supabase
    .from("drip_battle_answers")
    .select("*")
    .eq("room_id", roomId);
  if (roundNumber != null) query = query.eq("round_number", roundNumber);

  const { data, error } = await query.order("created_at", { ascending: true });
  throwIfError(error);
  return data || [];
}

export async function insertAnswer(payload) {
  const { data, error } = await supabase
    .from("drip_battle_answers")
    .insert(payload)
    .select()
    .single();
  throwIfError(error);
  return data;
}

// ============================================================
// drip_battle_votes
// ============================================================

export async function listVotes({ roomId, roundNumber }) {
  let query = supabase
    .from("drip_battle_votes")
    .select("*")
    .eq("room_id", roomId);
  if (roundNumber != null) query = query.eq("round_number", roundNumber);

  const { data, error } = await query;
  throwIfError(error);
  return data || [];
}

export async function insertVote(payload) {
  const { data, error } = await supabase
    .from("drip_battle_votes")
    .insert(payload)
    .select()
    .single();
  throwIfError(error);
  return data;
}

// ============================================================
// RPC
// ============================================================

export async function leaveRoomRpc({ roomId, sessionId }) {
  const { error } = await supabase.rpc("leave_drip_battle_room", {
    p_room_id: roomId,
    p_session_id: sessionId,
  });
  throwIfError(error);
}

export async function heartbeatRpc({ roomId, sessionId }) {
  const { error } = await supabase.rpc("drip_battle_room_heartbeat", {
    p_room_id: roomId,
    p_session_id: sessionId,
  });
  throwIfError(error);
}

export async function cleanupRoomsRpc({ storeId } = {}) {
  const { error } = await supabase.rpc("cleanup_drip_battle_rooms", {
    p_store_id: storeId ?? null,
  });
  throwIfError(error);
}

// ============================================================
// 페이지 이탈 시 fire-and-forget leave (라이어와 동일 패턴)
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
    fetch(`${url}/rest/v1/rpc/leave_drip_battle_room`, {
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
    .channel(`drip-lobby-${storeId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "drip_battle_rooms",
        filter: `store_id=eq.${storeId}`,
      },
      onChange,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export function subscribeToRoom({ roomId, onRoomChange, onStatus }) {
  const channel = supabase
    .channel(`drip-room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "drip_battle_rooms",
        filter: `id=eq.${roomId}`,
      },
      onRoomChange,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

// 한 방의 답변 + 투표 변경을 한 채널로 구독
export function subscribeToRoundData({
  roomId,
  onAnswerChange,
  onVoteChange,
  onStatus,
}) {
  const channel = supabase
    .channel(`drip-round-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "drip_battle_answers",
        filter: `room_id=eq.${roomId}`,
      },
      onAnswerChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "drip_battle_votes",
        filter: `room_id=eq.${roomId}`,
      },
      onVoteChange,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export const dripBattleRepository = {
  listRoomsByStore,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  listAnswers,
  insertAnswer,
  listVotes,
  insertVote,
  leaveRoomRpc,
  heartbeatRpc,
  cleanupRoomsRpc,
  sendLeaveBeacon,
  subscribeToStoreRooms,
  subscribeToRoom,
  subscribeToRoundData,
};

import { supabase } from "@/shared/api/supabaseClient";

/**
 * 익명 폭로전 데이터 접근층.
 *
 * ★ exposed_votes 는 절대 SELECT 하지 않는다(읽기 함수 자체가 없다).
 *   투표는 cast_vote RPC 로만 쓰고, 집계는 tally_round RPC(서버)만 한다.
 *   클라이언트가 보는 모든 것은 exposed_rooms row 한 곳에서 온다.
 */

function throwIfError(error) {
  if (error) throw error;
}

// ============================================================
// exposed_rooms CRUD
// ============================================================

export async function listRoomsByStore(storeId) {
  const { data, error } = await supabase
    .from("exposed_rooms")
    .select("*")
    .eq("store_id", storeId)
    .in("status", ["waiting", "phase_input", "phase_vote", "phase_result"])
    .order("created_at", { ascending: false });

  throwIfError(error);
  return data || [];
}

export async function getRoom(roomId) {
  const { data, error } = await supabase
    .from("exposed_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  throwIfError(error);
  return data;
}

export async function createRoom(payload) {
  const { data, error } = await supabase
    .from("exposed_rooms")
    .insert(payload)
    .select()
    .single();

  throwIfError(error);
  return data;
}

export async function updateRoom({ roomId, updates, returning = true, guard }) {
  let query = supabase.from("exposed_rooms").update(updates).eq("id", roomId);

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
    .from("exposed_rooms")
    .delete()
    .eq("id", roomId);
  throwIfError(error);
}

// ============================================================
// RPC
// ============================================================

export async function submitQuestionRpc({ roomId, sessionId, text }) {
  const { error } = await supabase.rpc("exposed_submit_question", {
    p_room_id: roomId,
    p_session_id: sessionId,
    p_text: text,
  });
  throwIfError(error);
}

export async function castVoteRpc({ roomId, sessionId, round, vote }) {
  const { error } = await supabase.rpc("exposed_cast_vote", {
    p_room_id: roomId,
    p_session_id: sessionId,
    p_round: round,
    p_vote: vote,
  });
  throwIfError(error);
}

export async function tallyRoundRpc({ roomId, round }) {
  const { error } = await supabase.rpc("exposed_tally_round", {
    p_room_id: roomId,
    p_round: round,
  });
  throwIfError(error);
}

export async function restartGameRpc({ roomId, sessionId }) {
  const { error } = await supabase.rpc("exposed_restart_game", {
    p_room_id: roomId,
    p_session_id: sessionId,
  });
  throwIfError(error);
}

export async function leaveRoomRpc({ roomId, sessionId }) {
  const { error } = await supabase.rpc("leave_exposed_room", {
    p_room_id: roomId,
    p_session_id: sessionId,
  });
  throwIfError(error);
}

export async function heartbeatRpc({ roomId, sessionId }) {
  const { error } = await supabase.rpc("exposed_room_heartbeat", {
    p_room_id: roomId,
    p_session_id: sessionId,
  });
  throwIfError(error);
}

export async function cleanupRoomsRpc({ storeId } = {}) {
  const { error } = await supabase.rpc("cleanup_exposed_rooms", {
    p_store_id: storeId ?? null,
  });
  throwIfError(error);
}

// ============================================================
// 페이지 이탈 시 fire-and-forget leave (드립/라이어와 동일 패턴)
//
// navigator.sendBeacon은 apikey/Authorization 헤더를 못 보내 REST가 거부하므로
// fetch keepalive로 대체.
// ============================================================
export function sendLeaveBeacon({ roomId, sessionId }) {
  if (!roomId || !sessionId) return false;
  if (typeof fetch !== "function") return false;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;

  try {
    fetch(`${url}/rest/v1/rpc/leave_exposed_room`, {
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
// Realtime — rooms 만 구독 (votes는 구독 대상이 아니다)
// ============================================================

export function subscribeToStoreRooms({ storeId, onChange, onStatus }) {
  const channel = supabase
    .channel(`exposed-lobby-${storeId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "exposed_rooms",
        filter: `store_id=eq.${storeId}`,
      },
      onChange,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export function subscribeToRoom({ roomId, onRoomChange, onStatus }) {
  const channel = supabase
    .channel(`exposed-room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "exposed_rooms",
        filter: `id=eq.${roomId}`,
      },
      onRoomChange,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export const exposedRepository = {
  listRoomsByStore,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  submitQuestionRpc,
  castVoteRpc,
  tallyRoundRpc,
  restartGameRpc,
  leaveRoomRpc,
  heartbeatRpc,
  cleanupRoomsRpc,
  sendLeaveBeacon,
  subscribeToStoreRooms,
  subscribeToRoom,
};

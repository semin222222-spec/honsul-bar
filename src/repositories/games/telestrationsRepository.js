import { supabase } from "@/shared/api/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

// ============================================================
// telestrations_rooms CRUD
// ============================================================

export async function listRoomsByStore(storeId) {
  const { data, error } = await supabase
    .from("telestrations_rooms")
    .select("*")
    .eq("store_id", storeId)
    .in("status", ["waiting", "word_reveal", "playing"])
    .order("created_at", { ascending: false });

  throwIfError(error);
  return data || [];
}

export async function getRoom(roomId) {
  const { data, error } = await supabase
    .from("telestrations_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  throwIfError(error);
  return data;
}

export async function createRoom(payload) {
  const { data, error } = await supabase
    .from("telestrations_rooms")
    .insert(payload)
    .select()
    .single();

  throwIfError(error);
  return data;
}

/**
 * 조건부 update.
 *   - guard: { status: 'playing', current_step: 0 } 와 같은 추가 WHERE 절
 *     (race condition 방지용 — 방장 외 누가 동시 update 못 하도록)
 *   - returning: 결과 row 반환 여부
 */
export async function updateRoom({ roomId, updates, returning = true, guard }) {
  let query = supabase
    .from("telestrations_rooms")
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
    .from("telestrations_rooms")
    .delete()
    .eq("id", roomId);
  throwIfError(error);
}

// ============================================================
// telestrations_entries
// ============================================================

/**
 * 한 단계 제출.
 *   - UNIQUE(room_id, chain_starter_session_id, step) 제약으로 중복 INSERT 시 23505 에러
 *   - 호출자가 catch 해서 "이미 제출됨" 처리
 */
export async function insertEntry(payload) {
  const { data, error } = await supabase
    .from("telestrations_entries")
    .insert(payload)
    .select()
    .single();

  throwIfError(error);
  return data;
}

/**
 * 방의 모든 entry (결과 화면용)
 */
export async function listEntriesByRoom(roomId) {
  const { data, error } = await supabase
    .from("telestrations_entries")
    .select("*")
    .eq("room_id", roomId)
    .order("step", { ascending: true });

  throwIfError(error);
  return data || [];
}

/**
 * 특정 step 의 entry 목록 (제출 카운트/단계 전환 판단용)
 */
export async function listEntriesForStep({ roomId, step }) {
  const { data, error } = await supabase
    .from("telestrations_entries")
    .select("author_session_id")
    .eq("room_id", roomId)
    .eq("step", step);

  throwIfError(error);
  return data || [];
}

/**
 * 내가 받을 chain 의 직전 step entry (현재 step 의 입력 자료)
 *   - 그리기 단계: 직전 step 의 단어
 *   - 추측 단계: 직전 step 의 그림
 */
/**
 * 방 전체 entries 삭제 — "한 판 더" 시 호출 (방 유지, entries 만 비움)
 */
export async function deleteEntriesByRoom(roomId) {
  const { error } = await supabase
    .from("telestrations_entries")
    .delete()
    .eq("room_id", roomId);
  throwIfError(error);
}

export async function getEntry({ roomId, chainStarterSessionId, step }) {
  const { data, error } = await supabase
    .from("telestrations_entries")
    .select("*")
    .eq("room_id", roomId)
    .eq("chain_starter_session_id", chainStarterSessionId)
    .eq("step", step)
    .maybeSingle();

  throwIfError(error);
  return data;
}

// ============================================================
// RPC
// ============================================================

export async function leaveRoomRpc({ roomId, sessionId }) {
  const { error } = await supabase.rpc("leave_telestrations_room", {
    p_room_id: roomId,
    p_session_id: sessionId,
  });
  throwIfError(error);
}

export async function heartbeatRpc({ roomId, sessionId }) {
  const { error } = await supabase.rpc("telestrations_room_heartbeat", {
    p_room_id: roomId,
    p_session_id: sessionId,
  });
  throwIfError(error);
}

export async function cleanupRoomsRpc({ storeId } = {}) {
  const { error } = await supabase.rpc("cleanup_telestrations_rooms", {
    p_store_id: storeId ?? null,
  });
  throwIfError(error);
}

// ============================================================
// 페이지 이탈 fire-and-forget leave
//   - 라이어/캐치마인드와 동일 패턴 (fetch keepalive)
// ============================================================
export function sendLeaveBeacon({ roomId, sessionId }) {
  if (!roomId || !sessionId) return false;
  if (typeof fetch !== "function") return false;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;

  try {
    fetch(`${url}/rest/v1/rpc/leave_telestrations_room`, {
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
    .channel(`telestrations-lobby-${storeId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "telestrations_rooms",
        filter: `store_id=eq.${storeId}`,
      },
      onChange,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export function subscribeToRoom({ roomId, onRoomChange, onStatus }) {
  const channel = supabase
    .channel(`telestrations-room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "telestrations_rooms",
        filter: `id=eq.${roomId}`,
      },
      onRoomChange,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export function subscribeToEntries({ roomId, onInsert, onStatus }) {
  const channel = supabase
    .channel(`telestrations-entries-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "telestrations_entries",
        filter: `room_id=eq.${roomId}`,
      },
      onInsert,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export const telestrationsRepository = {
  listRoomsByStore,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  insertEntry,
  listEntriesByRoom,
  listEntriesForStep,
  getEntry,
  deleteEntriesByRoom,
  leaveRoomRpc,
  heartbeatRpc,
  cleanupRoomsRpc,
  sendLeaveBeacon,
  subscribeToStoreRooms,
  subscribeToRoom,
  subscribeToEntries,
};

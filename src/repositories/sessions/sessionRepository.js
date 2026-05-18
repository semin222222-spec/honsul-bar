import { supabase } from "@/shared/api/supabaseClient";
import { subscribeShared } from "@/shared/realtime/sharedChannel";

function throwIfError(error) {
  if (error) throw error;
}

export async function getSessionById({ storeId, sessionId }) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("store_id", storeId)
    .maybeSingle();

  throwIfError(error);
  return data || null;
}

export async function getOpenSessionById({ storeId, sessionId }) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("store_id", storeId)
    .eq("status", "open")
    .maybeSingle();

  throwIfError(error);
  return data || null;
}

export async function touchSession({ storeId, sessionId, touchedAt }) {
  const { error } = await supabase
    .from("sessions")
    .update({ last_active_at: touchedAt })
    .eq("id", sessionId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function listOpenSessionsByCustomer({ storeId, customerId }) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, seat_label")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .eq("status", "open");

  throwIfError(error);
  return data || [];
}

export async function closeSessionsByIds({ storeId, sessionIds, closedAt }) {
  if (!sessionIds || sessionIds.length === 0) return;

  const { error } = await supabase
    .from("sessions")
    .update({ status: "closed", closed_at: closedAt })
    .eq("store_id", storeId)
    .in("id", sessionIds);

  throwIfError(error);
}

export async function getLatestOpenSessionByCustomer({ storeId, customerId }) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error);
  return data || null;
}

export async function getLatestOpenSessionBySeatAndCustomer({
  storeId,
  customerId,
  seatLabel,
}) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .eq("seat_label", seatLabel)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error);
  return data || null;
}

export async function takeoverSession({
  storeId,
  sessionId,
  seatLabel,
  customerId,
  touchedAt,
}) {
  const { data, error } = await supabase
    .from("sessions")
    .update({
      customer_id: customerId,
      last_active_at: touchedAt,
    })
    .eq("id", sessionId)
    .eq("store_id", storeId)
    .eq("seat_label", seatLabel)
    .eq("status", "open")
    .select()
    .single();

  throwIfError(error);
  return data || null;
}

export async function getOpenSessionBySeat({ storeId, seatLabel }) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("store_id", storeId)
    .eq("seat_label", seatLabel)
    .eq("status", "open")
    .maybeSingle();

  throwIfError(error);
  return data || null;
}

export async function createSession({
  storeId,
  seatLabel,
  customerId,
  nickname,
  avatar,
}) {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      store_id: storeId,
      seat_label: seatLabel,
      customer_id: customerId,
      nickname,
      avatar,
      status: "open",
    })
    .select()
    .single();

  throwIfError(error);
  return data;
}

export async function listOpenSessions(storeId) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "open")
    .order("opened_at", { ascending: false });

  throwIfError(error);
  return data || [];
}

export async function listOpenSessionsBasic(storeId) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, store_id, seat_label, nickname, nickname_ja, avatar, status")
    .eq("store_id", storeId)
    .eq("status", "open")
    .order("opened_at", { ascending: false });

  throwIfError(error);
  return data || [];
}

export async function getTodayClosedSessionRevenue({ storeId, todayStart }) {
  const { data, error } = await supabase
    .from("orders")
    .select("price, session:sessions!inner(status, closed_at)")
    .eq("store_id", storeId)
    .eq("session.status", "closed")
    .gte("session.closed_at", todayStart);

  throwIfError(error);
  return (data || []).reduce((sum, order) => sum + (order.price || 0), 0);
}

export async function closeSession({ storeId, sessionId, closedAt }) {
  const { error } = await supabase
    .from("sessions")
    .update({
      status: "closed",
      closed_at: closedAt,
    })
    .eq("id", sessionId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function markPendingOrdersServed({
  storeId,
  sessionId,
  servedAt,
}) {
  const { error } = await supabase
    .from("orders")
    .update({ status: "served", served_at: servedAt })
    .eq("store_id", storeId)
    .eq("session_id", sessionId)
    .eq("status", "pending");

  throwIfError(error);
}

export async function moveSessionSeat({
  storeId,
  sessionId,
  newSeatLabel,
  touchedAt,
}) {
  const { error } = await supabase
    .from("sessions")
    .update({
      seat_label: newSeatLabel,
      last_active_at: touchedAt,
    })
    .eq("id", sessionId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function updateOrderSeatLabel({ storeId, sessionId, seatLabel }) {
  const { error } = await supabase
    .from("orders")
    .update({ seat_label: seatLabel })
    .eq("store_id", storeId)
    .eq("session_id", sessionId);

  throwIfError(error);
}

export async function transferOrdersToSession({
  storeId,
  fromSessionId,
  toSessionId,
  toSeatLabel,
}) {
  const { error } = await supabase
    .from("orders")
    .update({
      session_id: toSessionId,
      seat_label: toSeatLabel,
    })
    .eq("store_id", storeId)
    .eq("session_id", fromSessionId);

  throwIfError(error);
}

export async function updateSession({ storeId, sessionId, updates }) {
  const { error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", sessionId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function updateSessionOnboarding({
  storeId,
  sessionId,
  mbti,
  mood,
}) {
  const { error } = await supabase
    .from("sessions")
    .update({ mbti, mood })
    .eq("id", sessionId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export function subscribeToSession({ storeId, sessionId, onUpdate, onStatus }) {
  return subscribeShared({
    topic: `session-${storeId}-${sessionId}`,
    bindings: [
      {
        event: "UPDATE",
        schema: "public",
        table: "sessions",
        filter: `id=eq.${sessionId}`,
      },
    ],
    listeners: { onUpdate, onStatus },
  });
}

export function subscribeToSessionsAdmin({
  storeId,
  onSessionsChange,
  onOrdersChange,
  onStatus,
}) {
  return subscribeShared({
    topic: `sessions-admin-${storeId}`,
    bindings: [
      {
        event: "*",
        schema: "public",
        table: "sessions",
        filter: `store_id=eq.${storeId}`,
        route: "onSessionsChange",
      },
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `store_id=eq.${storeId}`,
        route: "onOrdersChange",
      },
    ],
    listeners: { onSessionsChange, onOrdersChange, onStatus },
  });
}

export function subscribeToStoreSessions({ storeId, onChange, onStatus }) {
  return subscribeShared({
    topic: `store-sessions-${storeId}`,
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

export const sessionRepository = {
  getSessionById,
  getOpenSessionById,
  touchSession,
  listOpenSessionsByCustomer,
  closeSessionsByIds,
  getLatestOpenSessionByCustomer,
  getLatestOpenSessionBySeatAndCustomer,
  takeoverSession,
  getOpenSessionBySeat,
  createSession,
  listOpenSessions,
  listOpenSessionsBasic,
  getTodayClosedSessionRevenue,
  closeSession,
  markPendingOrdersServed,
  moveSessionSeat,
  updateOrderSeatLabel,
  transferOrdersToSession,
  updateSession,
  updateSessionOnboarding,
  subscribeToSession,
  subscribeToSessionsAdmin,
  subscribeToStoreSessions,
};

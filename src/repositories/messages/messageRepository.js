import { supabase } from "@/shared/api/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

export async function listRecentMessages({ storeId, cutoff, limit }) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("store_id", storeId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(limit);

  throwIfError(error);
  return data || [];
}

export async function insertMessage({ storeId, nickname, content }) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ store_id: storeId, nickname, content })
    .select()
    .single();

  throwIfError(error);
  return data;
}

export async function incrementHearts(messageId) {
  const { error } = await supabase.rpc("increment_hearts", {
    msg_id: messageId,
  });

  throwIfError(error);
}

export async function incrementCurious(messageId) {
  const { error } = await supabase.rpc("increment_curious", {
    msg_id: messageId,
  });

  throwIfError(error);
}

export async function listRecentChatMessages({ storeId, cutoff, limit }) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("store_id", storeId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(limit);

  throwIfError(error);
  return data || [];
}

export async function insertChatMessage({
  storeId,
  sessionId,
  seatLabel,
  nickname,
  avatar,
  content,
}) {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      store_id: storeId,
      session_id: sessionId,
      seat_label: seatLabel,
      nickname,
      avatar,
      content,
    })
    .select()
    .single();

  throwIfError(error);
  return data;
}

export async function deleteChatMessage(messageId) {
  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("id", messageId);

  throwIfError(error);
}

export function subscribeToMessages({
  storeId,
  onInsert,
  onUpdate,
  onDelete,
  onStatus,
}) {
  const channel = supabase
    .channel(`messages-realtime-${storeId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `store_id=eq.${storeId}`,
      },
      onInsert,
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `store_id=eq.${storeId}`,
      },
      onUpdate,
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "messages",
        filter: `store_id=eq.${storeId}`,
      },
      onDelete,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export function subscribeToChatMessages({
  storeId,
  onInsert,
  onDelete,
  onStatus,
}) {
  const channel = supabase
    .channel(`chat-room-${storeId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `store_id=eq.${storeId}`,
      },
      onInsert,
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "chat_messages",
        filter: `store_id=eq.${storeId}`,
      },
      onDelete,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export const messageRepository = {
  listRecentMessages,
  insertMessage,
  incrementHearts,
  incrementCurious,
  subscribeToMessages,
  listRecentChatMessages,
  insertChatMessage,
  deleteChatMessage,
  subscribeToChatMessages,
};

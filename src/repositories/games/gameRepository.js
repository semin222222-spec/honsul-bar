import { supabase } from "@/shared/api/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

export async function listTopRankings({ storeId, limit = 5 }) {
  const { data, error } = await supabase
    .from("game_rankings")
    .select("*")
    .eq("store_id", storeId)
    .order("score", { ascending: false })
    .limit(limit);

  throwIfError(error);
  return data || [];
}

export async function insertRanking({ storeId, nickname, score }) {
  const { error } = await supabase
    .from("game_rankings")
    .insert({ store_id: storeId, nickname, score });

  throwIfError(error);
}

export function subscribeToRankings({ storeId, onInsert, onStatus }) {
  const channel = supabase
    .channel(`rankings-realtime-${storeId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "game_rankings",
        filter: `store_id=eq.${storeId}`,
      },
      onInsert,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export async function listPendingFlirtingGames({ storeId, sessionId }) {
  const { data, error } = await supabase
    .from("flirting_games")
    .select("*")
    .eq("store_id", storeId)
    .eq("invitee_session_id", sessionId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  throwIfError(error);
  return data || [];
}

export async function finishFlirtingGame({
  storeId,
  gameId,
  score,
  finishedAt,
}) {
  const { error } = await supabase
    .from("flirting_games")
    .update({
      status: "finished",
      final_score: score,
      finished_at: finishedAt,
    })
    .eq("id", gameId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export async function listFlirtingChoices(gameId) {
  const { data, error } = await supabase
    .from("flirting_choices")
    .select("*")
    .eq("game_id", gameId);

  throwIfError(error);
  return data || [];
}

export async function listActiveFlirtingGames({ storeId, sessionId }) {
  const { data, error } = await supabase
    .from("flirting_games")
    .select("*")
    .eq("store_id", storeId)
    .or(`inviter_session_id.eq.${sessionId},invitee_session_id.eq.${sessionId}`)
    .in("status", ["pending", "accepted", "playing"]);

  throwIfError(error);
  return data || [];
}

export async function createFlirtingGame(payload) {
  const { data, error } = await supabase
    .from("flirting_games")
    .insert(payload)
    .select()
    .single();

  throwIfError(error);
  return data;
}

export async function updateFlirtingGame({
  storeId,
  gameId,
  updates,
  returning = false,
}) {
  let query = supabase
    .from("flirting_games")
    .update(updates)
    .eq("id", gameId)
    .eq("store_id", storeId);

  if (returning) {
    query = query.select().single();
  }

  const { data, error } = await query;
  throwIfError(error);
  return data || null;
}

export async function insertFlirtingChoice(payload) {
  const { error } = await supabase.from("flirting_choices").insert(payload);
  throwIfError(error);
}

export function subscribeToFlirtingIncoming({ sessionId, onInsert, onStatus }) {
  const channel = supabase
    .channel(`flirting-incoming-${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "flirting_games",
        filter: `invitee_session_id=eq.${sessionId}`,
      },
      onInsert,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export function subscribeToFlirtingGame({
  gameId,
  onGameChange,
  onChoiceInsert,
  onStatus,
}) {
  const channel = supabase
    .channel(`flirting-game-${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "flirting_games",
        filter: `id=eq.${gameId}`,
      },
      onGameChange,
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "flirting_choices",
        filter: `game_id=eq.${gameId}`,
      },
      onChoiceInsert,
    )
    .subscribe(onStatus);

  return () => supabase.removeChannel(channel);
}

export function createNineMatchChannel(matchId) {
  return supabase.channel(`nine-match-${matchId}`, {
    config: { broadcast: { self: false } },
  });
}

export function createNineInviteChannel(userId) {
  return supabase.channel(`nine-invite-${userId}`, {
    config: { broadcast: { self: false } },
  });
}

export function removeRealtimeChannel(channel) {
  return supabase.removeChannel(channel);
}

export const gameRepository = {
  listTopRankings,
  insertRanking,
  subscribeToRankings,
  listPendingFlirtingGames,
  finishFlirtingGame,
  listFlirtingChoices,
  listActiveFlirtingGames,
  createFlirtingGame,
  updateFlirtingGame,
  insertFlirtingChoice,
  subscribeToFlirtingIncoming,
  subscribeToFlirtingGame,
  createNineMatchChannel,
  createNineInviteChannel,
  removeRealtimeChannel,
};

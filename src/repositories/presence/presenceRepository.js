import { supabase } from "@/shared/api/supabaseClient";

export function createBarPresenceChannel(myId) {
  return supabase.channel("bar-presence", {
    config: { presence: { key: myId } },
  });
}

export function removePresenceChannel(channel) {
  return supabase.removeChannel(channel);
}

export const presenceRepository = {
  createBarPresenceChannel,
  removePresenceChannel,
};

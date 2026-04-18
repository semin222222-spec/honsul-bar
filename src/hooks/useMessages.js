import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

const PAGE_SIZE = 50;

export function useMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchErr } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (fetchErr) {
      console.error("[useMessages] fetch error:", fetchErr.message);
      setError(fetchErr.message);
    } else {
      setMessages(data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? payload.new : m))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) =>
            prev.filter((m) => m.id !== payload.old.id)
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[useMessages] Realtime 구독 성공");
        }
        if (status === "CHANNEL_ERROR") {
          console.error("[useMessages] Realtime 채널 에러");
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchMessages]);

  const postMessage = useCallback(async (nickname, content) => {
    const optimistic = {
      id: crypto.randomUUID(),
      nickname,
      content,
      hearts: 0,
      curious: 0,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };

    setMessages((prev) => [optimistic, ...prev]);

    const { data, error: insertErr } = await supabase
      .from("messages")
      .insert({ nickname, content })
      .select()
      .single();

    if (insertErr) {
      console.error("[useMessages] insert error:", insertErr.message);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      return { success: false, error: insertErr.message };
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === optimistic.id ? data : m))
    );

    return { success: true, data };
  }, []);

  const addHeart = useCallback(async (messageId) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, hearts: m.hearts + 1 } : m
      )
    );

    const { error: rpcErr } = await supabase.rpc("increment_hearts", {
      msg_id: messageId,
    });

    if (rpcErr) {
      console.error("[useMessages] heart error:", rpcErr.message);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, hearts: m.hearts - 1 } : m
        )
      );
    }
  }, []);

  const addCurious = useCallback(async (messageId) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, curious: m.curious + 1 } : m
      )
    );

    const { error: rpcErr } = await supabase.rpc("increment_curious", {
      msg_id: messageId,
    });

    if (rpcErr) {
      console.error("[useMessages] curious error:", rpcErr.message);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, curious: m.curious - 1 } : m
        )
      );
    }
  }, []);

  return {
    messages,
    loading,
    error,
    postMessage,
    addHeart,
    addCurious,
    refetch: fetchMessages,
  };
}
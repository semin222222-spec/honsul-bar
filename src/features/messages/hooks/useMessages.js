import { useState, useEffect, useCallback, useRef } from "react";
import { messageRepository } from "@/repositories/messages/messageRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";

const PAGE_SIZE = 50;

function isWithin24Hours(isoString) {
  return Date.now() - new Date(isoString).getTime() < 24 * 60 * 60 * 1000;
}

export function useMessages(storeId) {
  const hasScopedStore = hasStoreScope(storeId);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(hasScopedStore);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    if (!hasScopedStore) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
      const data = await messageRepository.listRecentMessages({
        storeId,
        cutoff,
        limit: PAGE_SIZE,
      });
      setMessages(data);
    } catch (fetchErr) {
      console.error("[useMessages] fetch error:", fetchErr.message);
      setError(fetchErr.message);
    }

    setLoading(false);
  }, [hasScopedStore, storeId]);

  useEffect(() => {
    if (!hasScopedStore) return;

    const fetchTimer = setTimeout(fetchMessages, 0);

    const unsubscribe = messageRepository.subscribeToMessages({
      storeId,
      onInsert: (payload) => {
        if (!isWithin24Hours(payload.new.created_at)) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.new.id)) return prev;
          return [payload.new, ...prev];
        });
      },
      onUpdate: (payload) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.new.id ? payload.new : m)),
        );
      },
      onDelete: (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
      },
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "useMessages",
          onSubscribed: fetchMessages,
          onRecoverable: fetchMessages,
        });
      },
    });

    channelRef.current = unsubscribe;

    // 5분마다 오래된 메시지 화면에서 제거
    const cleanupTimer = setInterval(
      () => {
        setMessages((prev) =>
          prev.filter((m) => isWithin24Hours(m.created_at)),
        );
      },
      5 * 60 * 1000,
    );

    return () => {
      clearTimeout(fetchTimer);
      if (channelRef.current) {
        channelRef.current();
        channelRef.current = null;
      }
      clearInterval(cleanupTimer);
    };
  }, [hasScopedStore, storeId, fetchMessages]);

  const postMessage = useCallback(
    async (nickname, content) => {
      if (!hasStoreScope(storeId)) {
        return { success: false, error: "매장 정보 없음" };
      }

      const optimistic = {
        id: crypto.randomUUID(),
        store_id: storeId,
        nickname,
        content,
        hearts: 0,
        curious: 0,
        created_at: new Date().toISOString(),
        _optimistic: true,
      };

      setMessages((prev) => [optimistic, ...prev]);

      let data;
      try {
        data = await messageRepository.insertMessage({
          storeId,
          nickname,
          content,
        });
      } catch (insertErr) {
        console.error("[useMessages] insert error:", insertErr.message);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        return { success: false, error: insertErr.message };
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? data : m)),
      );

      return { success: true, data };
    },
    [storeId],
  );

  const addHeart = useCallback(
    async (messageId) => {
      if (!hasScopedStore) return;
      if (!messages.some((m) => m.id === messageId)) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, hearts: m.hearts + 1 } : m,
        ),
      );

      try {
        await messageRepository.incrementHearts(messageId);
      } catch (rpcErr) {
        console.error("[useMessages] heart error:", rpcErr.message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, hearts: m.hearts - 1 } : m,
          ),
        );
      }
    },
    [hasScopedStore, messages],
  );

  const addCurious = useCallback(
    async (messageId) => {
      if (!hasScopedStore) return;
      if (!messages.some((m) => m.id === messageId)) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, curious: m.curious + 1 } : m,
        ),
      );

      try {
        await messageRepository.incrementCurious(messageId);
      } catch (rpcErr) {
        console.error("[useMessages] curious error:", rpcErr.message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, curious: m.curious - 1 } : m,
          ),
        );
      }
    },
    [hasScopedStore, messages],
  );

  return {
    messages: hasScopedStore ? messages : [],
    loading: hasScopedStore ? loading : false,
    error,
    postMessage,
    addHeart,
    addCurious,
    refetch: fetchMessages,
  };
}

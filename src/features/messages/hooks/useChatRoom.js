import { useState, useEffect, useCallback, useRef } from "react";
import { messageRepository } from "@/repositories/messages/messageRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";

/**
 * useChatRoom
 *
 * 익명 라운지 채팅방 훅
 *
 * 기능:
 * - 12시간 이내 메시지만 표시
 * - 실시간 새 메시지 수신
 * - 메시지 전송 (1초 쿨다운으로 스팸 방지)
 * - 100자 제한
 *
 * @param {string} storeId - 매장 ID
 * @param {string} sessionId - 내 세션 ID
 * @param {string} seatLabel - 좌석
 * @param {string} nickname - 닉네임
 * @param {string} avatar - 아바타 이모지
 */
export function useChatRoom(storeId, sessionId, seatLabel, nickname, avatar) {
  const hasScopedStore = hasStoreScope(storeId);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(hasScopedStore);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const lastSentRef = useRef(0); // 마지막 전송 시간 (쿨다운)
  const channelRef = useRef(null);

  // ─────────────────────────────────────────
  // 메시지 가져오기 (12시간 이내만)
  // ─────────────────────────────────────────
  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!hasStoreScope(storeId)) {
        setMessages([]);
        setLoading(false);
        return;
      }

      if (!silent) setLoading(true);

      const twelveHoursAgo = new Date(
        Date.now() - 12 * 60 * 60 * 1000,
      ).toISOString();

      try {
        const data = await messageRepository.listRecentChatMessages({
          storeId,
          cutoff: twelveHoursAgo,
          limit: 200,
        });
        setError(null);
        setMessages(data);
      } catch (err) {
        console.error("[ChatRoom] fetch 실패:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [storeId],
  );

  // ─────────────────────────────────────────
  // 실시간 구독
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!hasScopedStore) {
      const resetTimer = setTimeout(() => {
        setMessages([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    let cancelled = false;
    const fetchTimer = setTimeout(fetchMessages, 0);

    const unsubscribe = messageRepository.subscribeToChatMessages({
      storeId,
      onInsert: (payload) => {
        if (cancelled) return;
        const newMsg = payload.new;
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      },
      onDelete: (payload) => {
        if (cancelled) return;
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
      },
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "ChatRoom",
          onSubscribed: () => fetchMessages(true),
          onRecoverable: () => fetchMessages(true),
        });
      },
    });

    channelRef.current = unsubscribe;

    return () => {
      cancelled = true;
      clearTimeout(fetchTimer);
      if (channelRef.current) {
        channelRef.current();
        channelRef.current = null;
      }
    };
  }, [storeId, hasScopedStore, fetchMessages]);

  // ─────────────────────────────────────────
  // 메시지 전송
  // ─────────────────────────────────────────
  const sendMessage = useCallback(async (content) => {
    if (!sessionId || !hasStoreScope(storeId)) {
      return { ok: false, error: "세션이 없어요" };
    }

    const trimmed = (content || "").trim();
    if (!trimmed) {
      return { ok: false, error: "메시지를 입력해주세요" };
    }
    if (trimmed.length > 100) {
      return { ok: false, error: "100자 이내로 입력해주세요" };
    }

    // 1초 쿨다운
    const now = Date.now();
    if (now - lastSentRef.current < 1000) {
      return { ok: false, error: "잠시 후 다시 시도해주세요" };
    }

    if (sending) return { ok: false, error: "전송 중이에요" };

    setSending(true);
    lastSentRef.current = now;

    try {
      const data = await messageRepository.insertChatMessage({
        storeId,
        sessionId,
        seatLabel,
        nickname,
        avatar,
        content: trimmed,
      });

      // 낙관적 업데이트 (실시간 INSERT가 오기 전에 미리 표시)
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });

      setSending(false);
      return { ok: true, message: data };
    } catch (err) {
      console.error("[ChatRoom] 전송 예외:", err);
      setSending(false);
      return { ok: false, error: "전송 중 오류가 발생했어요" };
    }
  }, [storeId, sessionId, seatLabel, nickname, avatar, sending]);

  // ─────────────────────────────────────────
  // 메시지 삭제 (내 메시지만 또는 어드민)
  // ─────────────────────────────────────────
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await messageRepository.deleteChatMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      return { ok: true };
    } catch (err) {
      console.error("[ChatRoom] 삭제 예외:", err);
      return { ok: false };
    }
  }, []);

  // ─────────────────────────────────────────
  // 주기적으로 12시간 지난 메시지 화면에서 제거 (1분마다)
  // ─────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
      setMessages((prev) =>
        prev.filter((m) => new Date(m.created_at).getTime() >= twelveHoursAgo),
      );
    }, 60000); // 1분마다

    return () => clearInterval(interval);
  }, []);

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    deleteMessage,
    refetch: fetchMessages,
  };
}

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

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
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const lastSentRef = useRef(0); // 마지막 전송 시간 (쿨다운)
  const channelRef = useRef(null);

  // ─────────────────────────────────────────
  // 메시지 가져오기 (12시간 이내만)
  // ─────────────────────────────────────────
  const fetchMessages = useCallback(async (silent = false) => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    // 12시간 전 시간 계산
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    try {
      const { data, error: err } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("store_id", storeId)
        .gte("created_at", twelveHoursAgo)
        .order("created_at", { ascending: true })
        .limit(200); // 최대 200개

      if (err) {
        console.error("[ChatRoom] fetch 실패:", err);
        setError(err);
      } else {
        setError(null);
        setMessages(data || []);
      }
    } catch (err) {
      console.error("[ChatRoom] fetch 예외:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  // ─────────────────────────────────────────
  // 실시간 구독
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetchMessages();

    // 이전 채널 정리
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`chat-room-${storeId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          if (cancelled) return;
          const newMsg = payload.new;
          setMessages((prev) => {
            // 중복 방지
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_messages",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          if (cancelled) return;
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // ─────────────────────────────────────────
  // 메시지 전송
  // ─────────────────────────────────────────
  const sendMessage = useCallback(async (content) => {
    if (!sessionId || !storeId) {
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
      const { data, error: err } = await supabase
        .from("chat_messages")
        .insert({
          store_id: storeId,
          session_id: sessionId,
          seat_label: seatLabel,
          nickname: nickname,
          avatar: avatar,
          content: trimmed,
        })
        .select()
        .single();

      if (err) {
        console.error("[ChatRoom] 전송 실패:", err);
        setSending(false);
        return { ok: false, error: "전송에 실패했어요" };
      }

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
      const { error: err } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", messageId);

      if (err) {
        console.error("[ChatRoom] 삭제 실패:", err);
        return { ok: false };
      }

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
        prev.filter((m) => new Date(m.created_at).getTime() >= twelveHoursAgo)
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

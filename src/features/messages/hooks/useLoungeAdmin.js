import { useState, useEffect, useCallback, useRef } from "react";
import { messageRepository } from "@/repositories/messages/messageRepository";
import {
  handleRealtimeSubscribeStatus,
  onRealtimeRecover,
} from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";
import { countUnread, latestCreatedAt } from "@/features/messages/lib/loungeUnread";
import { AUTHOR_OWNER, OWNER_IDENTITY } from "@/features/messages/lib/loungeMessage";

/**
 * useLoungeAdmin
 *
 * 어드민에서 익명 라운지(chat_messages)를 보고 사장님 글을 쓰는 훅.
 * - 손님 앱과 동일한 repository(listRecentChatMessages / subscribeToChatMessages) 재사용
 * - 12시간 이내 글만 조회, Realtime으로 새 글 즉시 반영
 * - 읽음 컬럼이 없으므로 "마지막 본 시각(lastSeenAt)" 기준으로 미확인 카운트
 *   (lastSeenAt은 매장별로 localStorage에 저장 → 새로고침해도 유지)
 * - 사장님 글 작성: author_type='owner'로 INSERT (RLS가 위변조 차단)
 */

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const FETCH_LIMIT = 200;
const OWNER_MAX_LEN = 200;

function seenStorageKey(storeId) {
  return `honsul_lounge_seen_${storeId}`;
}

function readSeen(storeId) {
  try {
    return window.localStorage.getItem(seenStorageKey(storeId)) || null;
  } catch {
    return null;
  }
}

function writeSeen(storeId, iso) {
  if (!iso) return;
  try {
    window.localStorage.setItem(seenStorageKey(storeId), iso);
  } catch {
    // localStorage 사용 불가 환경은 무시 (메모리 상태로만 동작)
  }
}

export function useLoungeAdmin(storeId) {
  const hasActiveScope = hasStoreScope(storeId);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(hasActiveScope);
  const [sending, setSending] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(() =>
    hasActiveScope ? readSeen(storeId) : null,
  );

  const lastSeenRef = useRef(lastSeenAt);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // lastSeenRef는 fetchMessages가 매번 새로 만들어지지 않도록 최신 값을 따로 들고 있는다.
  useEffect(() => {
    lastSeenRef.current = lastSeenAt;
  }, [lastSeenAt]);

  // 매장이 바뀌면 저장된 마지막 본 시각을 다시 읽어 리셋한다.
  // effect 대신 렌더 중 조정(React 권장 패턴)으로 cascading render를 피한다.
  const [trackedStoreId, setTrackedStoreId] = useState(storeId);
  if (storeId !== trackedStoreId) {
    setTrackedStoreId(storeId);
    setLastSeenAt(hasActiveScope ? readSeen(storeId) : null);
  }

  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!hasStoreScope(storeId)) {
        setMessages([]);
        setLoading(false);
        return;
      }

      if (!silent) setLoading(true);

      const cutoff = new Date(Date.now() - TWELVE_HOURS_MS).toISOString();

      try {
        const data = await messageRepository.listRecentChatMessages({
          storeId,
          cutoff,
          limit: FETCH_LIMIT,
        });
        setMessages(data);

        // 최초 진입(저장된 기준선 없음): 기존 글을 미확인으로 띄우지 않도록
        // 가장 최근 글 시각을 기준선으로 잡는다.
        if (!lastSeenRef.current) {
          const baseline = latestCreatedAt(data);
          if (baseline) {
            lastSeenRef.current = baseline;
            setLastSeenAt(baseline);
            writeSeen(storeId, baseline);
          }
        }
      } catch (error) {
        console.error("[Lounge Admin] fetch error:", error);
      }

      if (!silent) setLoading(false);
    },
    [storeId],
  );

  useEffect(() => {
    if (!hasActiveScope) return;

    const fetchTimer = setTimeout(fetchMessages, 0);

    const unsubscribe = messageRepository.subscribeToChatMessages({
      storeId,
      onInsert: (payload) => {
        const newMsg = payload.new;
        setMessages((prev) =>
          prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg],
        );
      },
      onDelete: (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
      },
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Lounge Admin",
          onSubscribed: () => fetchMessages(true),
          onRecoverable: () => fetchMessages(true),
        });
      },
    });

    const offRecover = onRealtimeRecover(() => fetchMessages(true));

    // 1분마다 12시간 지난 글을 화면에서 정리
    const cleanupTimer = setInterval(() => {
      const cutoffMs = Date.now() - TWELVE_HOURS_MS;
      setMessages((prev) =>
        prev.filter((m) => new Date(m.created_at).getTime() >= cutoffMs),
      );
    }, 60 * 1000);

    return () => {
      clearTimeout(fetchTimer);
      offRecover();
      unsubscribe();
      clearInterval(cleanupTimer);
    };
  }, [storeId, hasActiveScope, fetchMessages]);

  // 라운지를 확인했을 때 호출 → 현재 글 기준으로 미확인 카운트를 0으로.
  const markAllRead = useCallback(() => {
    const baseline =
      latestCreatedAt(messagesRef.current) || new Date().toISOString();
    lastSeenRef.current = baseline;
    setLastSeenAt(baseline);
    writeSeen(storeId, baseline);
  }, [storeId]);

  // 사장님 글 작성 (author_type='owner'). RLS가 인증된 매장 사장님만 허용.
  const sendOwnerMessage = useCallback(
    async (content) => {
      if (!hasStoreScope(storeId)) {
        return { ok: false, error: "매장 정보가 없어요" };
      }
      const trimmed = (content || "").trim();
      if (!trimmed) return { ok: false, error: "내용을 입력해주세요" };
      if (trimmed.length > OWNER_MAX_LEN) {
        return { ok: false, error: `${OWNER_MAX_LEN}자 이내로 입력해주세요` };
      }
      if (sending) return { ok: false, error: "전송 중이에요" };

      setSending(true);
      try {
        const data = await messageRepository.insertChatMessage({
          storeId,
          sessionId: null,
          seatLabel: null,
          nickname: OWNER_IDENTITY.nickname,
          avatar: OWNER_IDENTITY.avatar,
          content: trimmed,
          authorType: AUTHOR_OWNER,
        });

        // 낙관적 업데이트 (Realtime INSERT가 오기 전에 미리 표시)
        setMessages((prev) =>
          prev.some((m) => m.id === data.id) ? prev : [...prev, data],
        );
        return { ok: true, message: data };
      } catch (err) {
        console.error("[Lounge Admin] owner post error:", err);
        return { ok: false, error: "전송에 실패했어요" };
      } finally {
        setSending(false);
      }
    },
    [storeId, sending],
  );

  const unreadCount = hasActiveScope ? countUnread(messages, lastSeenAt) : 0;

  return {
    messages: hasActiveScope ? messages : [],
    loading: hasActiveScope ? loading : false,
    unreadCount,
    sending,
    sendOwnerMessage,
    markAllRead,
    refetch: fetchMessages,
  };
}

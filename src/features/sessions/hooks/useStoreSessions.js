import { useState, useEffect, useCallback } from "react";
import { sessionRepository } from "@/repositories/sessions/sessionRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";

export function useStoreSessions(storeId) {
  const hasActiveScope = hasStoreScope(storeId);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(hasActiveScope);

  const fetchSessions = useCallback(async () => {
    if (!hasStoreScope(storeId)) {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      const data = await sessionRepository.listOpenSessionsBasic(storeId);
      setSessions(data);
    } catch (error) {
      console.error("[Store Sessions] fetch error:", error);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    if (!hasActiveScope) return;

    const fetchTimer = setTimeout(fetchSessions, 0);

    const unsubscribe = sessionRepository.subscribeToStoreSessions({
      storeId,
      onChange: fetchSessions,
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Store Sessions",
          onSubscribed: fetchSessions,
          onRecoverable: fetchSessions,
        });
      },
    });

    return () => {
      clearTimeout(fetchTimer);
      unsubscribe();
    };
  }, [storeId, hasActiveScope, fetchSessions]);

  return {
    sessions: hasActiveScope ? sessions : [],
    loading: hasActiveScope ? loading : false,
    refetch: fetchSessions,
  };
}

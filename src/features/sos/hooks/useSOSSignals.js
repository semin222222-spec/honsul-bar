import { useState, useEffect, useCallback, useRef } from "react";
import { sosRepository } from "@/repositories/sos/sosRepository";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";

function isWithin24Hours(isoString) {
  return Date.now() - new Date(isoString).getTime() < 24 * 60 * 60 * 1000;
}

export function useSOSSend(storeId) {
  const [sending, setSending] = useState(false);

  const sendSOS = useCallback(
    async (seatLabel, requestType) => {
      if (!hasStoreScope(storeId)) {
        return { success: false, error: "매장 정보 없음" };
      }

      setSending(true);

      try {
        await sosRepository.insertSOSSignal({
          storeId,
          seatLabel,
          requestType,
        });
      } catch (error) {
        setSending(false);
        console.error("[SOS] 전송 실패:", error.message);
        return { success: false, error: error.message };
      }

      setSending(false);
      return { success: true };
    },
    [storeId],
  );

  return { sendSOS, sending };
}

export function useSOSAdmin(storeId) {
  const hasActiveScope = hasStoreScope(storeId);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(hasActiveScope);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  const fetchSignals = useCallback(
    async (silent = false) => {
      if (!hasStoreScope(storeId)) {
        setSignals([]);
        setLoading(false);
        return;
      }

      if (!silent) setLoading(true);
      setError(null);

      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      try {
        const data = await sosRepository.listActiveSOSSignals({
          storeId,
          cutoff,
        });
        setSignals(data);
      } catch (fetchErr) {
        console.error("[SOS Admin] fetch error:", fetchErr.message);
        setError(fetchErr.message);
      }

      if (!silent) setLoading(false);
    },
    [storeId],
  );

  useEffect(() => {
    if (!hasActiveScope) return;

    const fetchTimer = setTimeout(fetchSignals, 0);

    const unsubscribe = sosRepository.subscribeToSOSSignals({
      storeId,
      onInsert: (payload) => {
        if (!isWithin24Hours(payload.new.created_at)) return;
        setSignals((prev) => {
          if (prev.some((s) => s.id === payload.new.id)) return prev;
          return [payload.new, ...prev];
        });
      },
      onUpdate: (payload) => {
        if (payload.new.state === "resolved") {
          setSignals((prev) => prev.filter((s) => s.id !== payload.new.id));
        } else {
          setSignals((prev) =>
            prev.map((s) => (s.id === payload.new.id ? payload.new : s)),
          );
        }
      },
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "SOS Admin",
          onSubscribed: () => fetchSignals(true),
          onRecoverable: () => fetchSignals(true),
        });
      },
    });

    channelRef.current = unsubscribe;

    const cleanupTimer = setInterval(
      () => {
        setSignals((prev) => prev.filter((s) => isWithin24Hours(s.created_at)));
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
  }, [storeId, hasActiveScope, fetchSignals]);

  const acceptSignal = useCallback(
    async (signalId) => {
      if (!hasStoreScope(storeId)) return;

      setSignals((prev) =>
        prev.map((s) => (s.id === signalId ? { ...s, state: "accepted" } : s)),
      );

      try {
        await sosRepository.resolveSOSSignal({
          signalId,
          state: "accepted",
        });
      } catch (error) {
        console.error("[SOS Admin] accept error:", error.message);
        setSignals((prev) =>
          prev.map((s) => (s.id === signalId ? { ...s, state: "pending" } : s)),
        );
      }
    },
    [storeId],
  );

  const resolveSignal = useCallback(
    async (signalId) => {
      if (!hasStoreScope(storeId)) return;

      setSignals((prev) => prev.filter((s) => s.id !== signalId));

      try {
        await sosRepository.resolveSOSSignal({
          signalId,
          state: "resolved",
        });
      } catch (error) {
        console.error("[SOS Admin] resolve error:", error.message);
        fetchSignals();
      }
    },
    [storeId, fetchSignals],
  );

  return {
    signals: hasActiveScope ? signals : [],
    loading: hasActiveScope ? loading : false,
    error,
    acceptSignal,
    resolveSignal,
    refetch: fetchSignals,
  };
}

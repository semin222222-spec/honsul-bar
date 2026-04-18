import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

function isWithin24Hours(isoString) {
  return Date.now() - new Date(isoString).getTime() < 24 * 60 * 60 * 1000;
}

export function useSOSSend() {
  const [sending, setSending] = useState(false);

  const sendSOS = useCallback(async (seatLabel, requestType) => {
    setSending(true);

    const { error } = await supabase
      .from("sos_signals")
      .insert({
        seat_label: seatLabel,
        request_type: requestType,
      });

    setSending(false);

    if (error) {
      console.error("[SOS] 전송 실패:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  }, []);

  return { sendSOS, sending };
}

export function useSOSAdmin() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error: fetchErr } = await supabase
      .from("sos_signals")
      .select("*")
      .in("state", ["pending", "accepted"])
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });

    if (fetchErr) {
      console.error("[SOS Admin] fetch error:", fetchErr.message);
      setError(fetchErr.message);
    } else {
      setSignals(data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSignals();

    const channel = supabase
      .channel("sos-admin-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sos_signals" },
        (payload) => {
          if (!isWithin24Hours(payload.new.created_at)) return;
          setSignals((prev) => {
            if (prev.some((s) => s.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sos_signals" },
        (payload) => {
          if (payload.new.state === "resolved") {
            setSignals((prev) =>
              prev.filter((s) => s.id !== payload.new.id)
            );
          } else {
            setSignals((prev) =>
              prev.map((s) => (s.id === payload.new.id ? payload.new : s))
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[SOS Admin] Realtime 구독 성공");
        }
      });

    channelRef.current = channel;

    const cleanupTimer = setInterval(() => {
      setSignals((prev) => prev.filter((s) => isWithin24Hours(s.created_at)));
    }, 5 * 60 * 1000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      clearInterval(cleanupTimer);
    };
  }, [fetchSignals]);

  const acceptSignal = useCallback(async (signalId) => {
    setSignals((prev) =>
      prev.map((s) =>
        s.id === signalId ? { ...s, state: "accepted" } : s
      )
    );

    const { error } = await supabase.rpc("resolve_sos", {
      signal_id: signalId,
      new_state: "accepted",
    });

    if (error) {
      console.error("[SOS Admin] accept error:", error.message);
      setSignals((prev) =>
        prev.map((s) =>
          s.id === signalId ? { ...s, state: "pending" } : s
        )
      );
    }
  }, []);

  const resolveSignal = useCallback(async (signalId) => {
    setSignals((prev) => prev.filter((s) => s.id !== signalId));

    const { error } = await supabase.rpc("resolve_sos", {
      signal_id: signalId,
      new_state: "resolved",
    });

    if (error) {
      console.error("[SOS Admin] resolve error:", error.message);
      fetchSignals();
    }
  }, [fetchSignals]);

  return {
    signals,
    loading,
    error,
    acceptSignal,
    resolveSignal,
    refetch: fetchSignals,
  };
}
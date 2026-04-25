import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useSeatRows
 * - 매장의 좌석 행 설정 가져오기 (A줄 20석, B줄 20석 등)
 * - 실시간 변경 감지
 *
 * @param {string} storeId - 매장 ID
 * @returns {object} { rows, allSeats, loading, error, refetch }
 *   - rows: [{ id, name, seat_count, display_order }, ...]
 *   - allSeats: ['A-1', 'A-2', ..., 'B-1', ...] (편의용)
 */
export function useSeatRows(storeId) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  const fetchRows = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    const { data, error: err } = await supabase
      .from("seat_rows")
      .select("*")
      .eq("store_id", storeId)
      .order("display_order");

    if (err) {
      setError(err);
    } else {
      setError(null);
      setRows(data || []);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // 초기 로드
    fetchRows();

    // 이전 채널이 남아있다면 정리 (StrictMode 안전장치)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // 새 채널 생성
    const channel = supabase
      .channel(`seat-rows-${storeId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "seat_rows",
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          if (!cancelled) fetchRows();
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

  // 모든 좌석 평탄화 — A줄 20석 + B줄 20석 → ['A-1', 'A-2', ..., 'B-20']
  const allSeats = rows.flatMap(row =>
    Array.from({ length: row.seat_count }, (_, i) => `${row.name}-${i + 1}`)
  );

  return {
    rows,
    allSeats,
    loading,
    error,
    refetch: fetchRows,
  };
}

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

export function useOrdersAdmin() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  // 전체 fetch (초기 로드 + refetch 버튼용)
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        session:sessions!inner(
          id, seat_label, nickname, avatar, status
        )
      `)
      .eq("session.status", "open")
      .order("created_at", { ascending: false });

    if (!error) {
      setOrders(data || []);
    } else {
      console.error("[Orders Admin] fetch error:", error);
    }
    setLoading(false);
  }, []);

  // 단일 주문 fetch (Realtime INSERT 시 session 정보까지 한 번에 가져오기 위해)
  const fetchSingleOrder = useCallback(async (orderId) => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        session:sessions!inner(
          id, seat_label, nickname, avatar, status
        )
      `)
      .eq("id", orderId)
      .eq("session.status", "open")
      .maybeSingle();

    if (error) {
      console.error("[Orders Admin] single fetch error:", error);
      return null;
    }
    return data;
  }, []);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("orders-admin-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          console.log("[Orders Admin] INSERT:", payload.new);
          // session 정보까지 같이 가져와서 추가
          const fullOrder = await fetchSingleOrder(payload.new.id);
          if (fullOrder) {
            setOrders((prev) => {
              if (prev.some((o) => o.id === fullOrder.id)) return prev;
              return [fullOrder, ...prev];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          console.log("[Orders Admin] UPDATE:", payload.new);
          setOrders((prev) =>
            prev.map((o) =>
              o.id === payload.new.id ? { ...o, ...payload.new } : o
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "orders" },
        (payload) => {
          console.log("[Orders Admin] DELETE:", payload.old);
          setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Orders Admin] Realtime 구독 성공");
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []); // ⭐ 의존성 빈 배열 (마운트 시 한 번만)

  // 주문 제공 완료 (낙관적 업데이트)
  const markServed = useCallback(async (orderId) => {
    // 1. UI 즉시 업데이트
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: "served", served_at: new Date().toISOString() }
          : o
      )
    );

    // 2. DB 업데이트
    const { error } = await supabase
      .from("orders")
      .update({
        status: "served",
        served_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("[Orders Admin] markServed error:", error);
      // 실패 시 롤백
      fetchOrders();
      return false;
    }
    return true;
  }, [fetchOrders]);

  // 주문 취소 (낙관적 업데이트)
  const cancelOrder = useCallback(async (orderId) => {
    // 1. UI 즉시 제거
    setOrders((prev) => prev.filter((o) => o.id !== orderId));

    // 2. DB 삭제
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (error) {
      console.error("[Orders Admin] cancelOrder error:", error);
      fetchOrders(); // 실패 시 롤백
      return false;
    }
    return true;
  }, [fetchOrders]);

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return {
    orders,
    pendingCount,
    loading,
    markServed,
    cancelOrder,
    refetch: fetchOrders,
  };
}
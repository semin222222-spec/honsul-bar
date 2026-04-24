import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useOrdersAdmin
 * - 사장님 화면용
 * - 활성 세션들의 주문 전체 조회 (pending 우선)
 * - 주문 상태 변경 (제공 완료)
 */
export function useOrdersAdmin() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    // 오늘의 주문 중 아직 활성 세션에 묶인 것들만
    // (closed된 세션의 주문은 정산 완료 처리된 것이므로 제외)
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
      console.error("주문 조회 실패:", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("orders-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => fetchOrders()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
        },
        () => fetchOrders() // 세션 닫히면 주문도 필터링 됨
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // 주문 제공 완료
  const markServed = useCallback(async (orderId) => {
    const { error } = await supabase
      .from("orders")
      .update({
        status: "served",
        served_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("주문 상태 변경 실패:", error);
      return false;
    }
    return true;
  }, []);

  // 주문 취소 (삭제)
  const cancelOrder = useCallback(async (orderId) => {
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (error) {
      console.error("주문 취소 실패:", error);
      return false;
    }
    return true;
  }, []);

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

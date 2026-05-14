import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useOrders
 * - 손님 화면용 주문 관리
 * - 현재 세션의 주문 목록 실시간 조회
 * - 새 주문 생성 (옵션 + 수량 지원)
 *
 * @param {string} sessionId - 현재 세션 ID
 * @param {string} seatLabel - 좌석
 */
export function useOrders(sessionId, seatLabel) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!sessionId) {
      setOrders([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (!error) {
      setOrders(data || []);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchOrders();

    if (!sessionId) return;

    const channel = supabase
      .channel(`orders-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `session_id=eq.${sessionId}`,
        },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, fetchOrders]);

  // 🆕 주문 생성 (수량 + 옵션 지원)
  const createOrder = useCallback(
    async ({ menuName, menuIcon, price, optionId, optionName, quantity = 1 }) => {
      if (!sessionId || !seatLabel) {
        console.error("세션 없이 주문 불가");
        return null;
      }

      // 수량 검증 (1 ~ 10)
      const qty = Math.max(1, Math.min(10, parseInt(quantity) || 1));

      // 기본 주문 데이터
      const baseOrder = {
        session_id: sessionId,
        seat_label: seatLabel,
        menu_name: menuName,
        menu_icon: menuIcon,
        price: parseInt(price),
        status: "pending",
      };

      if (optionId) baseOrder.option_id = optionId;
      if (optionName) baseOrder.option_name = optionName;

      // 🆕 수량만큼 주문 행 N개 생성
      const orderRows = Array.from({ length: qty }, () => ({ ...baseOrder }));

      const { data, error } = await supabase
        .from("orders")
        .insert(orderRows)
        .select();

      if (error) {
        console.error("주문 생성 실패:", error);
        return null;
      }

      // 세션 활동 시간 갱신
      await supabase
        .from("sessions")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", sessionId);

      return {
        orders: data,
        quantity: qty,
        totalPrice: parseInt(price) * qty,
      };
    },
    [sessionId, seatLabel]
  );

  const totalAmount = orders.reduce((sum, o) => sum + (o.price || 0), 0);

  return {
    orders,
    totalAmount,
    loading,
    createOrder,
  };
}

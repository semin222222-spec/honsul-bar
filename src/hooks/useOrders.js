import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useOrders
 * - 손님 화면용 주문 관리
 * - 현재 세션의 주문 목록 실시간 조회
 * - 새 주문 생성 (옵션 지원)
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

  // 주문 생성 (옵션 정보 추가)
  const createOrder = useCallback(
    async ({ menuName, menuIcon, price, optionId, optionName }) => {
      if (!sessionId || !seatLabel) {
        console.error("세션 없이 주문 불가");
        return null;
      }

      const orderData = {
        session_id: sessionId,
        seat_label: seatLabel,
        menu_name: menuName,
        menu_icon: menuIcon,
        price: parseInt(price),
        status: "pending",
      };

      // 옵션 정보가 있으면 추가
      if (optionId) orderData.option_id = optionId;
      if (optionName) orderData.option_name = optionName;

      const { data, error } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (error) {
        console.error("주문 생성 실패:", error);
        return null;
      }
      return data;
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

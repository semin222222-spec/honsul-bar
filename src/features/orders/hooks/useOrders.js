import { useState, useEffect, useCallback } from "react";
import { orderRepository } from "@/repositories/orders/orderRepository";
import {
  createCustomerOrder,
  getOrdersTotal,
} from "@/services/orders/orderService";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";

/**
 * useOrders
 * - 손님 화면용 주문 관리
 * - 현재 세션의 주문 목록 실시간 조회
 * - 새 주문 생성 (옵션 + 수량 지원)
 *
 * @param {string} sessionId - 현재 세션 ID
 * @param {string} seatLabel - 좌석
 * @param {string} storeId - 매장 ID
 */
export function useOrders(sessionId, seatLabel, storeId) {
  const hasActiveScope = Boolean(sessionId && hasStoreScope(storeId));
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!sessionId || !hasStoreScope(storeId)) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await orderRepository.listSessionOrders({
        storeId,
        sessionId,
      });
      setOrders(data);
    } catch (error) {
      console.error("[Orders] fetch error:", error);
    }
    setLoading(false);
  }, [sessionId, storeId]);

  useEffect(() => {
    if (!hasActiveScope) return;

    const timer = setTimeout(fetchOrders, 0);

    const unsubscribe = orderRepository.subscribeToSessionOrders({
      storeId,
      sessionId,
      onChange: () => fetchOrders(),
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Orders",
          onSubscribed: fetchOrders,
          onRecoverable: fetchOrders,
        });
      },
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [sessionId, storeId, hasActiveScope, fetchOrders]);

  // 🆕 주문 생성 (수량 + 옵션 지원)
  const createOrder = useCallback(
    async ({
      menuName,
      menuIcon,
      price,
      optionId,
      optionName,
      quantity = 1,
    }) => {
      if (!sessionId || !seatLabel || !hasStoreScope(storeId)) {
        console.error("세션 없이 주문 불가");
        return null;
      }

      try {
        return await createCustomerOrder(
          {
            storeId,
            sessionId,
            seatLabel,
            menuName,
            menuIcon,
            price,
            optionId,
            optionName,
            quantity,
          },
          { repository: orderRepository },
        );
      } catch (error) {
        console.error("주문 생성 실패:", error);
        return null;
      }
    },
    [sessionId, seatLabel, storeId],
  );

  const scopedOrders = hasActiveScope ? orders : [];
  const totalAmount = getOrdersTotal(scopedOrders);

  return {
    orders: scopedOrders,
    totalAmount,
    loading: hasActiveScope ? loading : false,
    createOrder,
  };
}

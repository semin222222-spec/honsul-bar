import { useState, useEffect, useCallback } from "react";
import { orderRepository } from "@/repositories/orders/orderRepository";
import {
  cancelOrder as cancelOrderService,
  countPendingOrders,
  createServedOrderPatch,
  markOrderServed,
} from "@/services/orders/orderService";
import { handleRealtimeSubscribeStatus } from "@/shared/realtime/realtimeHealth";
import { hasStoreScope } from "@/shared/lib/storeScope";

export function useOrdersAdmin(storeId) {
  const hasActiveScope = hasStoreScope(storeId);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(hasActiveScope);

  // 전체 fetch (초기 로드 + refetch 버튼용)
  const fetchOrders = useCallback(
    async (silent = false) => {
      if (!hasStoreScope(storeId)) {
        setOrders([]);
        setLoading(false);
        return;
      }

      if (!silent) setLoading(true);
      try {
        const data = await orderRepository.listOpenStoreOrders(storeId);
        setOrders(data);
      } catch (error) {
        console.error("[Orders Admin] fetch error:", error);
      }
      if (!silent) setLoading(false);
    },
    [storeId],
  );

  // 단일 주문 fetch (Realtime INSERT 시 session 정보까지 한 번에 가져오기 위해)
  const fetchSingleOrder = useCallback(
    async (orderId) => {
      if (!hasStoreScope(storeId)) return null;

      try {
        return await orderRepository.getOpenStoreOrderById({
          storeId,
          orderId,
        });
      } catch (error) {
        console.error("[Orders Admin] single fetch error:", error);
        return null;
      }
    },
    [storeId],
  );

  useEffect(() => {
    if (!hasActiveScope) return;

    const fetchTimer = setTimeout(fetchOrders, 0);

    const unsubscribe = orderRepository.subscribeToStoreOrders({
      storeId,
      onInsert: async (payload) => {
        console.log("[Orders Admin] INSERT:", payload.new);
        // session 정보까지 같이 가져와서 추가
        const fullOrder = await fetchSingleOrder(payload.new.id);
        if (fullOrder) {
          setOrders((prev) => {
            if (prev.some((o) => o.id === fullOrder.id)) return prev;
            return [fullOrder, ...prev];
          });
        }
      },
      onUpdate: (payload) => {
        console.log("[Orders Admin] UPDATE:", payload.new);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === payload.new.id ? { ...o, ...payload.new } : o,
          ),
        );
      },
      onDelete: (payload) => {
        console.log("[Orders Admin] DELETE:", payload.old);
        setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
      },
      onStatus: (status) => {
        handleRealtimeSubscribeStatus(status, {
          label: "Orders Admin",
          onSubscribed: () => fetchOrders(true),
          onRecoverable: () => fetchOrders(true),
        });
      },
    });

    return () => {
      clearTimeout(fetchTimer);
      unsubscribe();
    };
  }, [storeId, hasActiveScope, fetchOrders, fetchSingleOrder]);

  // 주문 제공 완료 (낙관적 업데이트)
  const markServed = useCallback(
    async (orderId) => {
      if (!hasStoreScope(storeId)) return false;
      const patch = createServedOrderPatch();

      // 1. UI 즉시 업데이트
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)),
      );

      // 2. DB 업데이트
      try {
        return await markOrderServed(
          { storeId, orderId, servedAt: patch.served_at },
          { repository: orderRepository },
        );
      } catch (error) {
        console.error("[Orders Admin] markServed error:", error);
        // 실패 시 롤백
        fetchOrders();
        return false;
      }
    },
    [storeId, fetchOrders],
  );

  // 주문 취소 (낙관적 업데이트)
  const cancelOrder = useCallback(
    async (orderId) => {
      if (!hasStoreScope(storeId)) return false;

      // 1. UI 즉시 제거
      setOrders((prev) => prev.filter((o) => o.id !== orderId));

      // 2. DB 삭제
      try {
        return await cancelOrderService(
          { storeId, orderId },
          { repository: orderRepository },
        );
      } catch (error) {
        console.error("[Orders Admin] cancelOrder error:", error);
        fetchOrders(); // 실패 시 롤백
        return false;
      }
    },
    [storeId, fetchOrders],
  );

  const scopedOrders = hasActiveScope ? orders : [];
  const pendingCount = countPendingOrders(scopedOrders);

  return {
    orders: scopedOrders,
    pendingCount,
    loading: hasActiveScope ? loading : false,
    markServed,
    cancelOrder,
    refetch: fetchOrders,
  };
}

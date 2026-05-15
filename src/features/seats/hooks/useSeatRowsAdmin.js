import { useCallback } from "react";
import { seatRepository } from "@/repositories/seats/seatRepository";
import { hasStoreScope } from "@/shared/lib/storeScope";

/**
 * useSeatRowsAdmin
 * - 사장님용 좌석 행 관리 (CRUD)
 *
 * @param {string} storeId - 매장 ID
 * @param {function} refetch - useSeatRows 의 refetch (변경 후 강제 갱신)
 */
export function useSeatRowsAdmin(storeId, refetch) {
  // 행 추가
  const createRow = useCallback(
    async (data) => {
      if (!hasStoreScope(storeId)) return { ok: false, reason: "no_store" };

      try {
        const nextOrder =
          (await seatRepository.getLastSeatRowDisplayOrder(storeId)) + 1;
        await seatRepository.createSeatRow(storeId, {
          ...data,
          display_order: data.display_order ?? nextOrder,
        });
      } catch (error) {
        console.error("좌석 행 추가 실패:", error);
        return { ok: false, reason: error.message };
      }
      if (refetch) await refetch();
      return { ok: true };
    },
    [storeId, refetch],
  );

  // 행 수정 (이름, 개수 변경)
  const updateRow = useCallback(
    async (rowId, data) => {
      if (!hasStoreScope(storeId)) return { ok: false, reason: "no_store" };

      const updates = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.seat_count !== undefined) updates.seat_count = data.seat_count;
      if (data.display_order !== undefined)
        updates.display_order = data.display_order;

      try {
        await seatRepository.updateSeatRow({ storeId, rowId, updates });
      } catch (error) {
        console.error("좌석 행 수정 실패:", error);
        return { ok: false, reason: error.message };
      }
      if (refetch) await refetch();
      return { ok: true };
    },
    [storeId, refetch],
  );

  // 행 삭제
  const deleteRow = useCallback(
    async (rowId) => {
      if (!hasStoreScope(storeId)) return { ok: false, reason: "no_store" };

      try {
        await seatRepository.deleteSeatRow({ storeId, rowId });
      } catch (error) {
        console.error("좌석 행 삭제 실패:", error);
        return { ok: false, reason: error.message };
      }
      if (refetch) await refetch();
      return { ok: true };
    },
    [storeId, refetch],
  );

  return {
    createRow,
    updateRow,
    deleteRow,
  };
}

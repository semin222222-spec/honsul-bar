import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useSeatRowsAdmin
 * - 사장님용 좌석 행 관리 (CRUD)
 *
 * @param {string} storeId - 매장 ID
 * @param {function} refetch - useSeatRows 의 refetch (변경 후 강제 갱신)
 */
export function useSeatRowsAdmin(storeId, refetch) {
  // 행 추가
  const createRow = useCallback(async (data) => {
    if (!storeId) return { ok: false, reason: "no_store" };

    // 마지막 display_order 다음 순서로
    const { data: existing } = await supabase
      .from("seat_rows")
      .select("display_order")
      .eq("store_id", storeId)
      .order("display_order", { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.display_order || 0) + 1;

    const { error } = await supabase.from("seat_rows").insert({
      store_id: storeId,
      name: data.name,
      seat_count: data.seat_count,
      display_order: data.display_order ?? nextOrder,
    });

    if (error) {
      console.error("좌석 행 추가 실패:", error);
      return { ok: false, reason: error.message };
    }
    if (refetch) await refetch();
    return { ok: true };
  }, [storeId, refetch]);

  // 행 수정 (이름, 개수 변경)
  const updateRow = useCallback(async (rowId, data) => {
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.seat_count !== undefined) updates.seat_count = data.seat_count;
    if (data.display_order !== undefined) updates.display_order = data.display_order;

    const { error } = await supabase
      .from("seat_rows")
      .update(updates)
      .eq("id", rowId);

    if (error) {
      console.error("좌석 행 수정 실패:", error);
      return { ok: false, reason: error.message };
    }
    if (refetch) await refetch();
    return { ok: true };
  }, [refetch]);

  // 행 삭제
  const deleteRow = useCallback(async (rowId) => {
    const { error } = await supabase
      .from("seat_rows")
      .delete()
      .eq("id", rowId);

    if (error) {
      console.error("좌석 행 삭제 실패:", error);
      return { ok: false, reason: error.message };
    }
    if (refetch) await refetch();
    return { ok: true };
  }, [refetch]);

  return {
    createRow,
    updateRow,
    deleteRow,
  };
}

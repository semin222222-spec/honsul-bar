import { supabase } from "@/shared/api/supabaseClient";
import { subscribeShared } from "@/shared/realtime/sharedChannel";

// 근태 데이터 접근층. 시간 계산이 들어가는 쓰기(출근/퇴근/수동저장)는 RPC로
// 원자 처리하고, 단순 조회/삭제는 RLS(소유자 스코프) 직접 쿼리로 한다.

function throwIfError(error) {
  if (error) throw error;
}

// ───────── 알바(staff) ─────────
export async function listStaff(storeId, { includeInactive = false } = {}) {
  let query = supabase
    .from("attendance_staff")
    .select("*")
    .eq("store_id", storeId);

  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  throwIfError(error);
  return data || [];
}

export async function addStaff({ storeId, name, hiredAt }) {
  const { data, error } = await supabase
    .from("attendance_staff")
    .insert({ store_id: storeId, name, hired_at: hiredAt || null })
    .select()
    .single();

  throwIfError(error);
  return data;
}

// 이름 등 수정
export async function updateStaff({ storeId, staffId, name }) {
  const { error } = await supabase
    .from("attendance_staff")
    .update({ name })
    .eq("id", staffId)
    .eq("store_id", storeId);

  throwIfError(error);
}

// soft delete — 데이터 보존, is_active만 false
export async function deactivateStaff({ storeId, staffId }) {
  const { error } = await supabase
    .from("attendance_staff")
    .update({ is_active: false })
    .eq("id", staffId)
    .eq("store_id", storeId);

  throwIfError(error);
}

// ───────── 기록(records) ─────────
// work_date 가 [from, to) 범위인 기록 조회 (from/to = 'YYYY-MM-DD')
export async function listRecordsBetween({ storeId, from, to, staffId }) {
  let query = supabase
    .from("attendance_records")
    .select("*")
    .eq("store_id", storeId)
    .gte("work_date", from)
    .lt("work_date", to)
    .order("work_date", { ascending: false });

  if (staffId) query = query.eq("staff_id", staffId);

  const { data, error } = await query;
  throwIfError(error);
  return data || [];
}

// 현재 근무 중(미마감) 기록
export async function listOpenRecords(storeId) {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("store_id", storeId)
    .is("check_out_at", null);

  throwIfError(error);
  return data || [];
}

export async function checkIn({ storeId, staffId }) {
  const { data, error } = await supabase.rpc("attendance_check_in", {
    p_store_id: storeId,
    p_staff_id: staffId,
  });
  throwIfError(error);
  return data;
}

export async function checkOut({ storeId, staffId }) {
  const { data, error } = await supabase.rpc("attendance_check_out", {
    p_store_id: storeId,
    p_staff_id: staffId,
  });
  throwIfError(error);
  return data;
}

export async function saveManual({
  storeId,
  staffId,
  workDate,
  checkInAt,
  checkOutAt,
  note,
  recordId,
}) {
  const toIso = (v) => (v == null ? null : new Date(v).toISOString());
  const { data, error } = await supabase.rpc("attendance_save_manual", {
    p_store_id: storeId,
    p_staff_id: staffId,
    p_work_date: workDate,
    p_check_in: toIso(checkInAt),
    p_check_out: toIso(checkOutAt),
    p_note: note ?? null,
    p_record_id: recordId ?? null,
  });
  throwIfError(error);
  return data;
}

export async function deleteRecord({ storeId, recordId }) {
  const { error } = await supabase
    .from("attendance_records")
    .delete()
    .eq("id", recordId)
    .eq("store_id", storeId);

  throwIfError(error);
}

export function subscribeAttendance({ storeId, onChange, onStatus }) {
  return subscribeShared({
    topic: `attendance-${storeId}`,
    bindings: [
      {
        event: "*",
        schema: "public",
        table: "attendance_records",
        filter: `store_id=eq.${storeId}`,
      },
      {
        event: "*",
        schema: "public",
        table: "attendance_staff",
        filter: `store_id=eq.${storeId}`,
      },
    ],
    listeners: { onChange, onStatus },
  });
}

export const attendanceRepository = {
  listStaff,
  addStaff,
  updateStaff,
  deactivateStaff,
  listRecordsBetween,
  listOpenRecords,
  checkIn,
  checkOut,
  saveManual,
  deleteRecord,
  subscribeAttendance,
};

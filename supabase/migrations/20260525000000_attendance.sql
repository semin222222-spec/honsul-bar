-- ============================================================
-- 근태관리 (알바 출퇴근 + 시간 집계)
--
-- 테이블 2개 + RPC 3개
--   - attendance_staff    : 알바 마스터 (soft delete = is_active)
--   - attendance_records  : 출퇴근 기록 (work_date = 출근일 기준, 새벽 퇴근 대응)
--   - attendance_check_in / attendance_check_out / attendance_save_manual
--
-- 보안 모델
--   - 어드민 페이지는 ProtectedRoute(사장님 로그인) 뒤에 있고, 직원 모드/관리자 모드
--     모두 "로그인된 사장님 세션"으로 동작한다. → RLS는 소유자(store_owners) 스코프.
--   - PIN(VITE_ATTENDANCE_ADMIN_PIN)은 같은 단말기에서 직원/관리자 화면을 가르는
--     UI 게이트일 뿐, 보안 경계가 아니다. 실제 권한은 아래 RLS + 사장님 인증.
--   - 매핑: auth.uid() → store_owners.user_id → store_owners.id → stores.owner_id → stores.id
--
-- ⚠️ 운영 적용 전 dev/staging 에서 먼저 확인. (SUPABASE.md 절차)
-- ============================================================

-- ============================================================
-- 1. attendance_staff (알바 마스터)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name        text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,   -- 퇴사 = soft delete (데이터 보존)
  hired_at    date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attendance_staff_store_idx
  ON public.attendance_staff (store_id, is_active);

-- ============================================================
-- 2. attendance_records (출퇴근 기록)
--   - work_date: 출근한 날짜(KST). 새벽 퇴근이어도 출근일 기준으로 묶는다.
--   - check_in_at / check_out_at: 실제 시각(timestamptz). 새벽 퇴근이면 check_out_at은
--     자연스럽게 다음날 timestamp가 된다.
--   - UNIQUE(staff_id, work_date): 한 사람이 같은 출근일에 1건만 (단순화).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  staff_id          uuid NOT NULL REFERENCES public.attendance_staff(id) ON DELETE RESTRICT,
  work_date         date NOT NULL,
  check_in_at       timestamptz NOT NULL,
  check_out_at      timestamptz,                -- null = 근무 중
  is_manual         boolean NOT NULL DEFAULT false,
  modified_by_admin boolean NOT NULL DEFAULT false,
  modified_at       timestamptz,
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_unique_day UNIQUE (staff_id, work_date),
  CONSTRAINT attendance_out_after_in
    CHECK (check_out_at IS NULL OR check_out_at > check_in_at)
);

CREATE INDEX IF NOT EXISTS attendance_records_store_date_idx
  ON public.attendance_records (store_id, work_date);
CREATE INDEX IF NOT EXISTS attendance_records_staff_date_idx
  ON public.attendance_records (staff_id, work_date);
-- 근무 중(미마감) 빠른 조회
CREATE INDEX IF NOT EXISTS attendance_records_open_idx
  ON public.attendance_records (store_id)
  WHERE check_out_at IS NULL;

-- ============================================================
-- 3. updated_at 트리거 (attendance_staff)
-- ============================================================
CREATE OR REPLACE FUNCTION public.attendance_staff_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS attendance_staff_updated_at_trg ON public.attendance_staff;
CREATE TRIGGER attendance_staff_updated_at_trg
  BEFORE UPDATE ON public.attendance_staff
  FOR EACH ROW EXECUTE FUNCTION public.attendance_staff_touch_updated_at();

-- ============================================================
-- 4. Realtime publication (관리자 화면 실시간 '근무 중' 반영)
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_staff;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 5. RLS — 소유자(store_owners) 스코프. authenticated 사장님만.
--   anon 은 근태에 접근하지 않는다(어드민은 로그인 뒤).
-- ============================================================
ALTER TABLE public.attendance_staff   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_staff   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;

-- 내가 소유한 매장인지 판별하는 표현식을 정책마다 재사용한다.
--   store_id IN (SELECT s.id FROM stores s JOIN store_owners o ON o.id=s.owner_id WHERE o.user_id=auth.uid())

-- attendance_staff 정책
DROP POLICY IF EXISTS attendance_staff_owner_select ON public.attendance_staff;
CREATE POLICY attendance_staff_owner_select ON public.attendance_staff
  FOR SELECT TO authenticated
  USING (store_id IN (
    SELECT s.id FROM public.stores s
    JOIN public.store_owners o ON o.id = s.owner_id
    WHERE o.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS attendance_staff_owner_insert ON public.attendance_staff;
CREATE POLICY attendance_staff_owner_insert ON public.attendance_staff
  FOR INSERT TO authenticated
  WITH CHECK (store_id IN (
    SELECT s.id FROM public.stores s
    JOIN public.store_owners o ON o.id = s.owner_id
    WHERE o.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS attendance_staff_owner_update ON public.attendance_staff;
CREATE POLICY attendance_staff_owner_update ON public.attendance_staff
  FOR UPDATE TO authenticated
  USING (store_id IN (
    SELECT s.id FROM public.stores s
    JOIN public.store_owners o ON o.id = s.owner_id
    WHERE o.user_id = auth.uid()
  ))
  WITH CHECK (store_id IN (
    SELECT s.id FROM public.stores s
    JOIN public.store_owners o ON o.id = s.owner_id
    WHERE o.user_id = auth.uid()
  ));

-- attendance_records 정책 (SELECT/INSERT/UPDATE/DELETE 모두 소유자 스코프)
DROP POLICY IF EXISTS attendance_records_owner_select ON public.attendance_records;
CREATE POLICY attendance_records_owner_select ON public.attendance_records
  FOR SELECT TO authenticated
  USING (store_id IN (
    SELECT s.id FROM public.stores s
    JOIN public.store_owners o ON o.id = s.owner_id
    WHERE o.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS attendance_records_owner_insert ON public.attendance_records;
CREATE POLICY attendance_records_owner_insert ON public.attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (store_id IN (
    SELECT s.id FROM public.stores s
    JOIN public.store_owners o ON o.id = s.owner_id
    WHERE o.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS attendance_records_owner_update ON public.attendance_records;
CREATE POLICY attendance_records_owner_update ON public.attendance_records
  FOR UPDATE TO authenticated
  USING (store_id IN (
    SELECT s.id FROM public.stores s
    JOIN public.store_owners o ON o.id = s.owner_id
    WHERE o.user_id = auth.uid()
  ))
  WITH CHECK (store_id IN (
    SELECT s.id FROM public.stores s
    JOIN public.store_owners o ON o.id = s.owner_id
    WHERE o.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS attendance_records_owner_delete ON public.attendance_records;
CREATE POLICY attendance_records_owner_delete ON public.attendance_records
  FOR DELETE TO authenticated
  USING (store_id IN (
    SELECT s.id FROM public.stores s
    JOIN public.store_owners o ON o.id = s.owner_id
    WHERE o.user_id = auth.uid()
  ));

-- ============================================================
-- 6. 소유자 검증 헬퍼 (RPC 내부에서 호출)
--   SECURITY DEFINER 함수는 RLS를 우회하므로 매장 소유를 반드시 직접 검증한다.
-- ============================================================
CREATE OR REPLACE FUNCTION public.attendance_assert_owner(p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.stores s
    JOIN public.store_owners o ON o.id = s.owner_id
    WHERE s.id = p_store_id AND o.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION '권한 없음: 해당 매장의 소유자가 아닙니다.';
  END IF;
END;
$$;

-- ============================================================
-- 7. attendance_check_in — 출근
--   - work_date 는 서버에서 KST로 계산 (now() AT TIME ZONE 'Asia/Seoul')::date
--   - 이미 열린(미마감) 기록이 있으면 새로 만들지 않고 그대로 반환 (중복 출근 방지)
--   - 같은 출근일에 이미 기록이 있으면(마감됐든) 그 기록 반환 (하루 1건)
-- ============================================================
CREATE OR REPLACE FUNCTION public.attendance_check_in(
  p_store_id uuid,
  p_staff_id uuid
)
RETURNS public.attendance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
  v_rec   public.attendance_records;
BEGIN
  PERFORM public.attendance_assert_owner(p_store_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.attendance_staff
    WHERE id = p_staff_id AND store_id = p_store_id AND is_active
  ) THEN
    RAISE EXCEPTION '알바를 찾을 수 없습니다.';
  END IF;

  -- 미마감 기록이 있으면 이미 근무 중 → 그대로 반환
  SELECT * INTO v_rec
  FROM public.attendance_records
  WHERE staff_id = p_staff_id AND store_id = p_store_id AND check_out_at IS NULL
  ORDER BY check_in_at DESC
  LIMIT 1;
  IF FOUND THEN
    RETURN v_rec;
  END IF;

  v_today := (now() AT TIME ZONE 'Asia/Seoul')::date;

  INSERT INTO public.attendance_records (store_id, staff_id, work_date, check_in_at)
  VALUES (p_store_id, p_staff_id, v_today, now())
  ON CONFLICT (staff_id, work_date) DO NOTHING
  RETURNING * INTO v_rec;

  IF NOT FOUND THEN
    -- 오늘 이미 (마감된) 기록이 있는 경우 → 그 기록 반환
    SELECT * INTO v_rec
    FROM public.attendance_records
    WHERE staff_id = p_staff_id AND work_date = v_today;
  END IF;

  RETURN v_rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attendance_check_in(uuid, uuid) TO authenticated;

-- ============================================================
-- 8. attendance_check_out — 퇴근
--   - 가장 최근의 미마감 기록을 now() 로 마감. (없으면 no-op → null 반환)
--   - 비활성 알바라도 열린 기록은 마감 가능.
-- ============================================================
CREATE OR REPLACE FUNCTION public.attendance_check_out(
  p_store_id uuid,
  p_staff_id uuid
)
RETURNS public.attendance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec public.attendance_records;
BEGIN
  PERFORM public.attendance_assert_owner(p_store_id);

  UPDATE public.attendance_records
  SET check_out_at = now()
  WHERE id = (
    SELECT id FROM public.attendance_records
    WHERE staff_id = p_staff_id AND store_id = p_store_id AND check_out_at IS NULL
    ORDER BY check_in_at DESC
    LIMIT 1
  )
  RETURNING * INTO v_rec;

  RETURN v_rec;  -- 열린 기록이 없으면 null
END;
$$;

GRANT EXECUTE ON FUNCTION public.attendance_check_out(uuid, uuid) TO authenticated;

-- ============================================================
-- 9. attendance_save_manual — 수동 입력/수정 (관리자)
--   - p_record_id 있으면 그 기록 UPDATE, 없으면 (staff_id, work_date) upsert.
--   - 항상 is_manual=true, modified_by_admin=true, modified_at=now() 마킹.
--   - check_out 은 null 허용(근무 중으로 저장 가능). 있으면 check_out>check_in 검증.
--   - check_in / check_out 의 정확한 시각(새벽 퇴근 → 다음날)은 클라이언트가
--     KST 벽시계를 instant 로 변환해 전달한다.
-- ============================================================
CREATE OR REPLACE FUNCTION public.attendance_save_manual(
  p_store_id   uuid,
  p_staff_id   uuid,
  p_work_date  date,
  p_check_in   timestamptz,
  p_check_out  timestamptz DEFAULT NULL,
  p_note       text DEFAULT NULL,
  p_record_id  uuid DEFAULT NULL
)
RETURNS public.attendance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec public.attendance_records;
BEGIN
  PERFORM public.attendance_assert_owner(p_store_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.attendance_staff
    WHERE id = p_staff_id AND store_id = p_store_id
  ) THEN
    RAISE EXCEPTION '알바를 찾을 수 없습니다.';
  END IF;

  IF p_check_out IS NOT NULL AND p_check_out <= p_check_in THEN
    RAISE EXCEPTION '퇴근 시각은 출근 시각보다 뒤여야 합니다.';
  END IF;

  IF p_record_id IS NOT NULL THEN
    UPDATE public.attendance_records
    SET work_date = p_work_date,
        check_in_at = p_check_in,
        check_out_at = p_check_out,
        note = p_note,
        is_manual = true,
        modified_by_admin = true,
        modified_at = now()
    WHERE id = p_record_id AND store_id = p_store_id
    RETURNING * INTO v_rec;

    IF NOT FOUND THEN
      RAISE EXCEPTION '기록을 찾을 수 없습니다.';
    END IF;
    RETURN v_rec;
  END IF;

  INSERT INTO public.attendance_records
    (store_id, staff_id, work_date, check_in_at, check_out_at,
     note, is_manual, modified_by_admin, modified_at)
  VALUES
    (p_store_id, p_staff_id, p_work_date, p_check_in, p_check_out,
     p_note, true, true, now())
  ON CONFLICT (staff_id, work_date) DO UPDATE
    SET check_in_at = EXCLUDED.check_in_at,
        check_out_at = EXCLUDED.check_out_at,
        note = EXCLUDED.note,
        is_manual = true,
        modified_by_admin = true,
        modified_at = now()
  RETURNING * INTO v_rec;

  RETURN v_rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attendance_save_manual(uuid, uuid, date, timestamptz, timestamptz, text, uuid) TO authenticated;

-- ============================================================
-- 적용 후 점검
--
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('attendance_staff','attendance_records');
--   -- 둘 다 relrowsecurity = t
--
--   SELECT polcmd, polname FROM pg_policy
--   WHERE polrelid IN ('public.attendance_staff'::regclass,
--                      'public.attendance_records'::regclass)
--   ORDER BY 1;
--   -- staff: r/a/w(3),  records: r/a/w/d(4) — anon 정책 없음
--
--   SELECT proname, pg_get_function_identity_arguments(oid)
--   FROM pg_proc
--   WHERE proname IN ('attendance_check_in','attendance_check_out',
--                     'attendance_save_manual','attendance_assert_owner');
--   -- 네 함수 모두 결과에 나옴
--
--   SELECT tablename FROM pg_publication_tables
--   WHERE pubname='supabase_realtime'
--     AND tablename IN ('attendance_records','attendance_staff');
--   -- 두 줄
-- ============================================================

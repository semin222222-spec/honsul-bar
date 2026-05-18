-- ============================================================
-- 캐치마인드 라이프사이클 강화
--
-- 1. updated_at 컬럼 + 자동 trigger
-- 2. cleanup_catchmind_rooms() — 좀비 방 정리
-- 3. leave_catchmind_room(room_id, session_id) — 원자적 leave + 호스트 위임 + 빈 방 삭제
--
-- 모두 idempotent. 여러 번 실행해도 안전.
-- ============================================================

-- 1) updated_at 컬럼 추가 + auto-update trigger
ALTER TABLE public.catchmind_rooms
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.catchmind_rooms_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS catchmind_rooms_updated_at_trg ON public.catchmind_rooms;
CREATE TRIGGER catchmind_rooms_updated_at_trg
  BEFORE UPDATE ON public.catchmind_rooms
  FOR EACH ROW EXECUTE FUNCTION public.catchmind_rooms_touch_updated_at();

-- 2) 좀비 방 정리 함수 — anon에서 호출 가능
CREATE OR REPLACE FUNCTION public.cleanup_catchmind_rooms()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int;
BEGIN
  WITH deleted AS (
    DELETE FROM public.catchmind_rooms
    WHERE
      -- 종료된 지 5분 이상
      (status = 'finished' AND coalesce(finished_at, updated_at) < now() - interval '5 minutes')
      -- 30분 이상 변화 없음
      OR (updated_at < now() - interval '30 minutes')
      -- players가 빈 채로 1분 이상
      OR (jsonb_array_length(coalesce(players, '[]'::jsonb)) = 0
          AND created_at < now() - interval '1 minute')
    RETURNING 1
  )
  SELECT count(*)::int INTO deleted_count FROM deleted;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_catchmind_rooms() TO anon, authenticated;

-- 3) 원자적 leave 함수 — race 없이 한 방에 처리
--    · 해당 session_id를 players에서 제거
--    · 0명이 되면 방 자체를 DELETE
--    · 방장이면 다음 사람에게 자동 위임
CREATE OR REPLACE FUNCTION public.leave_catchmind_room(
  p_room_id uuid,
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_players jsonb;
  v_new_players jsonb;
  v_host_session text;
BEGIN
  SELECT players, host_session_id
    INTO v_players, v_host_session
  FROM public.catchmind_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF v_players IS NULL THEN
    RETURN; -- 이미 사라진 방
  END IF;

  SELECT COALESCE(jsonb_agg(p), '[]'::jsonb) INTO v_new_players
  FROM jsonb_array_elements(v_players) p
  WHERE p->>'session_id' IS DISTINCT FROM p_session_id;

  IF jsonb_array_length(v_new_players) = 0 THEN
    DELETE FROM public.catchmind_rooms WHERE id = p_room_id;
    RETURN;
  END IF;

  IF v_host_session = p_session_id THEN
    UPDATE public.catchmind_rooms
    SET
      players = v_new_players,
      host_session_id = v_new_players->0->>'session_id',
      host_seat_label = v_new_players->0->>'seat_label'
    WHERE id = p_room_id;
  ELSE
    UPDATE public.catchmind_rooms
    SET players = v_new_players
    WHERE id = p_room_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_catchmind_room(uuid, text) TO anon, authenticated;

-- ============================================================
-- 적용 후 점검
--
--   SELECT proname FROM pg_proc WHERE proname IN (
--     'cleanup_catchmind_rooms', 'leave_catchmind_room',
--     'catchmind_rooms_touch_updated_at'
--   );
--   -- 셋 다 나옴
--
--   -- 좀비 방 정리 즉시 실행
--   SELECT public.cleanup_catchmind_rooms();
-- ============================================================

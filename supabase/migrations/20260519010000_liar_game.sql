-- ============================================================
-- 라이어 게임
--
-- 테이블 1개 + RPC 3개
--   - liar_rooms                 : 방 / 게임 상태
--   - leave_liar_room(rpc)       : 페이지 이탈 / 나가기 (player 제거 + 0명이면 방 삭제, 방장 위임)
--   - liar_room_heartbeat(rpc)   : 30초마다 호출 (last_seen_at 갱신)
--   - cleanup_liar_rooms(rpc)    : 로비 진입 시 호출 (좀비 방 정리)
--
-- 정책: 매장(store_id) 스코프. anon/authenticated 모두 ALL 허용.
-- 캐치마인드/쉴드와 동일한 RLS 패턴.
-- ============================================================

-- ============================================================
-- 1. liar_rooms
-- ============================================================
CREATE TABLE IF NOT EXISTS public.liar_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  host_session_id text NOT NULL,
  host_seat_label text NOT NULL,

  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'word_reveal', 'speech', 'voting', 'finished')),

  -- players: [{
  --   session_id, seat_label,
  --   role: 'citizen' | 'liar' | null,
  --   word_confirmed: bool,
  --   speech_done: bool,
  --   voted_for: string | null,
  --   joined_at, last_seen_at
  -- }]
  players jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- 게임 설정
  category text,
  answer_word text,
  liar_session_id text,

  -- 진행
  current_speech_index int NOT NULL DEFAULT 0,
  speech_started_at timestamptz,

  -- 결과
  -- vote_result: { accused_session_id, accused_seat_label, citizen_win, is_tie, vote_count: { session_id: n } }
  vote_result jsonb,

  -- 라이프사이클
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS liar_rooms_store_status_idx
  ON public.liar_rooms (store_id, status, created_at DESC);

-- ============================================================
-- 2. Realtime publication
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.liar_rooms;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. RLS — anon/authenticated 전체 허용 (쉴드/캐치마인드와 동일 패턴)
-- ============================================================
ALTER TABLE public.liar_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS liar_rooms_anon_all ON public.liar_rooms;
CREATE POLICY liar_rooms_anon_all
  ON public.liar_rooms
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. leave_liar_room RPC
--   - 페이지 이탈/나가기에서 호출
--   - players에서 해당 session 제거. 0명이면 방 자체 DELETE.
--   - 방장이 나가면 다음 player가 방장 위임.
--   - 게임 중에도 단순 제거 (라이어 게임은 나간 사람을 표시할 필요가 없음 — 1라운드로 끝나므로).
--     1명 이하로 줄면 방 삭제.
-- ============================================================
CREATE OR REPLACE FUNCTION public.leave_liar_room(
  p_room_id uuid,
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_room public.liar_rooms;
  v_new_players jsonb;
BEGIN
  SELECT * INTO v_room FROM public.liar_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 해당 세션 제외
  SELECT jsonb_agg(p) INTO v_new_players
  FROM jsonb_array_elements(v_room.players) p
  WHERE p->>'session_id' <> p_session_id;

  v_new_players := COALESCE(v_new_players, '[]'::jsonb);

  -- 0명 → 방 삭제
  IF jsonb_array_length(v_new_players) = 0 THEN
    DELETE FROM public.liar_rooms WHERE id = p_room_id;
    RETURN;
  END IF;

  -- 게임 중(word_reveal/speech/voting)에 1명만 남으면 방 삭제 (게임 진행 불가)
  IF v_room.status IN ('word_reveal', 'speech', 'voting')
     AND jsonb_array_length(v_new_players) < 3 THEN
    DELETE FROM public.liar_rooms WHERE id = p_room_id;
    RETURN;
  END IF;

  -- 방장이 나갔으면 다음 사람이 방장
  IF v_room.host_session_id = p_session_id THEN
    UPDATE public.liar_rooms
    SET
      players = v_new_players,
      host_session_id = v_new_players->0->>'session_id',
      host_seat_label = v_new_players->0->>'seat_label'
    WHERE id = p_room_id;
  ELSE
    UPDATE public.liar_rooms
    SET players = v_new_players
    WHERE id = p_room_id;
  END IF;
END;
$$;

-- ============================================================
-- 5. liar_room_heartbeat RPC
--   - 30초마다 호출. 특정 player의 last_seen_at만 갱신.
-- ============================================================
CREATE OR REPLACE FUNCTION public.liar_room_heartbeat(
  p_room_id uuid,
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_new_players jsonb;
BEGIN
  SELECT jsonb_agg(
    CASE
      WHEN p->>'session_id' = p_session_id
        THEN p || jsonb_build_object(
          'last_seen_at',
          to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        )
      ELSE p
    END
  )
  INTO v_new_players
  FROM public.liar_rooms r, jsonb_array_elements(r.players) p
  WHERE r.id = p_room_id;

  IF v_new_players IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.liar_rooms
  SET players = v_new_players
  WHERE id = p_room_id;
END;
$$;

-- ============================================================
-- 6. cleanup_liar_rooms RPC
--   - 로비 진입 시 호출
--   - finished 5분 / 생성 30분 무업데이트 / 빈 방 1분 → 삭제
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_liar_rooms(
  p_store_id text DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_deleted int;
BEGIN
  WITH del AS (
    DELETE FROM public.liar_rooms
    WHERE
      (p_store_id IS NULL OR store_id = p_store_id)
      AND (
        (status = 'finished' AND finished_at IS NOT NULL
          AND finished_at < now() - INTERVAL '5 minutes')
        OR (created_at < now() - INTERVAL '30 minutes'
            AND status NOT IN ('speech', 'voting'))
        OR (jsonb_array_length(players) = 0
            AND created_at < now() - INTERVAL '1 minute')
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM del;
  RETURN v_deleted;
END;
$$;

-- ============================================================
-- 적용 후 점검
--
--   SELECT relname, relrowsecurity
--   FROM pg_class
--   WHERE relname = 'liar_rooms';
--   -- relrowsecurity 가 t
--
--   SELECT tablename FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime'
--     AND tablename = 'liar_rooms';
--   -- 한 줄 결과
--
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public'
--     AND routine_name IN ('leave_liar_room', 'liar_room_heartbeat', 'cleanup_liar_rooms');
--   -- 세 함수 모두 결과에 나옴
-- ============================================================

-- ============================================================
-- 텔레스트레이션 (그림 전화기)
--
-- 테이블 2개 + RPC 3개
--   - telestrations_rooms        : 방 / 게임 진행 상태
--   - telestrations_entries      : 각 단계의 그림 / 추측 데이터
--
--   - leave_telestrations_room        : 페이지 이탈/나가기. 0명 시 방 DELETE, 게임 중 4명 미만이면 finished, 방장 위임
--   - telestrations_room_heartbeat    : 30초마다 호출, last_seen_at 갱신
--   - cleanup_telestrations_rooms     : 로비 진입 시 호출, 좀비 방 정리
--
-- 정책: 매장(store_id) 스코프. anon/authenticated 모두 ALL 허용 (라이어/캐치마인드와 동일)
-- ============================================================

-- ============================================================
-- 1. telestrations_rooms
-- ============================================================
CREATE TABLE IF NOT EXISTS public.telestrations_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  host_session_id text NOT NULL,
  host_seat_label text NOT NULL,

  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'word_reveal', 'playing', 'finished')),

  -- players: [{
  --   session_id, seat_label,
  --   position,         -- 0,1,2,... (체인 순서)
  --   initial_word,     -- 시작 시 받은 단어 (자기만 볼 수 있음)
  --   joined_at, last_seen_at
  -- }]
  players jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- 진행
  current_step int NOT NULL DEFAULT 0,    -- 짝수=그리기, 홀수=추측
  step_started_at timestamptz,             -- 현재 단계 시작 시각 (타임아웃 계산용)

  -- 라이프사이클
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS telestrations_rooms_store_status_idx
  ON public.telestrations_rooms (store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS telestrations_rooms_updated_idx
  ON public.telestrations_rooms (updated_at);

-- ============================================================
-- 2. telestrations_entries
--   - 한 row = 한 사람이 한 단계에서 작성한 그림 또는 단어
--   - (room_id, chain_starter_session_id, step) UNIQUE → 중복 제출 방지
-- ============================================================
CREATE TABLE IF NOT EXISTS public.telestrations_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.telestrations_rooms(id) ON DELETE CASCADE,

  -- 타임라인 식별
  chain_starter_session_id text NOT NULL,  -- 이 체인의 시작자 (원본 단어 받은 사람)
  step int NOT NULL,                        -- 0,1,2,...

  -- 작성자
  author_session_id text NOT NULL,
  author_seat_label text NOT NULL,

  -- 콘텐츠
  entry_type text NOT NULL CHECK (entry_type IN ('word', 'drawing')),
  word_content text,
  drawing_data text,                        -- SVG paths JSON 직렬화

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (room_id, chain_starter_session_id, step)
);

CREATE INDEX IF NOT EXISTS telestrations_entries_room_step_idx
  ON public.telestrations_entries (room_id, step);
CREATE INDEX IF NOT EXISTS telestrations_entries_chain_idx
  ON public.telestrations_entries (room_id, chain_starter_session_id, step);

-- ============================================================
-- 3. updated_at trigger (rooms 만)
-- ============================================================
CREATE OR REPLACE FUNCTION public.telestrations_rooms_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS telestrations_rooms_updated_at_trg ON public.telestrations_rooms;
CREATE TRIGGER telestrations_rooms_updated_at_trg
  BEFORE UPDATE ON public.telestrations_rooms
  FOR EACH ROW EXECUTE FUNCTION public.telestrations_rooms_touch_updated_at();

-- ============================================================
-- 4. Realtime publication
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.telestrations_rooms;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.telestrations_entries;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 5. RLS — anon/authenticated 전체 허용
-- ============================================================
ALTER TABLE public.telestrations_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS telestrations_rooms_anon_all ON public.telestrations_rooms;
CREATE POLICY telestrations_rooms_anon_all
  ON public.telestrations_rooms
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.telestrations_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS telestrations_entries_anon_all ON public.telestrations_entries;
CREATE POLICY telestrations_entries_anon_all
  ON public.telestrations_entries
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 6. leave_telestrations_room
--   - 페이지 이탈 / 명시적 나가기에서 호출
--   - players에서 해당 session 제거
--   - 0명 → 방 DELETE
--   - 게임 중(word_reveal/playing) + 4명 미만 → 즉시 finished (자동 패스 진행 불가)
--   - 방장 나가면 다음 player 가 방장 위임
-- ============================================================
CREATE OR REPLACE FUNCTION public.leave_telestrations_room(
  p_room_id uuid,
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_room public.telestrations_rooms;
  v_new_players jsonb;
BEGIN
  SELECT * INTO v_room FROM public.telestrations_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT jsonb_agg(p) INTO v_new_players
  FROM jsonb_array_elements(v_room.players) p
  WHERE p->>'session_id' <> p_session_id;

  v_new_players := COALESCE(v_new_players, '[]'::jsonb);

  -- 0명 → 방 삭제
  IF jsonb_array_length(v_new_players) = 0 THEN
    DELETE FROM public.telestrations_rooms WHERE id = p_room_id;
    RETURN;
  END IF;

  -- 게임 진행 중에 4명 미만이면 즉시 finished (남은 사람끼리 결과 화면)
  IF v_room.status IN ('word_reveal', 'playing')
     AND jsonb_array_length(v_new_players) < 4 THEN
    UPDATE public.telestrations_rooms
    SET
      status = 'finished',
      finished_at = now(),
      players = v_new_players,
      host_session_id = CASE
        WHEN v_room.host_session_id = p_session_id THEN v_new_players->0->>'session_id'
        ELSE v_room.host_session_id
      END,
      host_seat_label = CASE
        WHEN v_room.host_session_id = p_session_id THEN v_new_players->0->>'seat_label'
        ELSE v_room.host_seat_label
      END
    WHERE id = p_room_id;
    RETURN;
  END IF;

  -- 방장 위임
  IF v_room.host_session_id = p_session_id THEN
    UPDATE public.telestrations_rooms
    SET
      players = v_new_players,
      host_session_id = v_new_players->0->>'session_id',
      host_seat_label = v_new_players->0->>'seat_label'
    WHERE id = p_room_id;
  ELSE
    UPDATE public.telestrations_rooms
    SET players = v_new_players
    WHERE id = p_room_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_telestrations_room(uuid, text) TO anon, authenticated;

-- ============================================================
-- 7. telestrations_room_heartbeat
--   - 30초마다 호출. 해당 player의 last_seen_at 만 갱신.
-- ============================================================
CREATE OR REPLACE FUNCTION public.telestrations_room_heartbeat(
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
  FROM public.telestrations_rooms r, jsonb_array_elements(r.players) p
  WHERE r.id = p_room_id;

  IF v_new_players IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.telestrations_rooms
  SET players = v_new_players
  WHERE id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.telestrations_room_heartbeat(uuid, text) TO anon, authenticated;

-- ============================================================
-- 8. cleanup_telestrations_rooms
--   - 로비 진입 시 호출
--   - finished 5분 / 30분 무업데이트 / 빈 방 1분 → 삭제
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_telestrations_rooms(
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
    DELETE FROM public.telestrations_rooms
    WHERE
      (p_store_id IS NULL OR store_id = p_store_id)
      AND (
        (status = 'finished' AND finished_at IS NOT NULL
          AND finished_at < now() - INTERVAL '5 minutes')
        OR (updated_at < now() - INTERVAL '30 minutes'
            AND status NOT IN ('word_reveal', 'playing'))
        OR (jsonb_array_length(players) = 0
            AND created_at < now() - INTERVAL '1 minute')
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM del;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_telestrations_rooms(text) TO anon, authenticated;

-- ============================================================
-- 적용 후 점검
--
--   SELECT relname, relrowsecurity
--   FROM pg_class
--   WHERE relname IN ('telestrations_rooms', 'telestrations_entries');
--   -- relrowsecurity 가 모두 t
--
--   SELECT tablename FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime'
--     AND tablename IN ('telestrations_rooms', 'telestrations_entries');
--   -- 두 테이블 모두 결과에 나옴
--
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public'
--     AND routine_name IN (
--       'leave_telestrations_room',
--       'telestrations_room_heartbeat',
--       'cleanup_telestrations_rooms',
--       'telestrations_rooms_touch_updated_at'
--     );
--   -- 네 함수 모두 결과에 나옴
-- ============================================================

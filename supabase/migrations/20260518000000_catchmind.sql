-- ============================================================
-- 캐치마인드 (드로잉 퀴즈) 게임
--
-- 테이블 3개:
--   - catchmind_rooms     : 방 (방장/참여자/라운드 상태)
--   - catchmind_strokes   : 라운드 동안의 드로잉 stroke (실시간 동기화용)
--   - catchmind_messages  : 채팅 + 정답/근접 메시지
--
-- 정책:
--   - 매장(store_id) 스코프 기반. row 단위 권한은 앱 코드에서 검증.
--   - anon/authenticated 모두 SELECT/INSERT/UPDATE/DELETE 허용 (플러팅과 동일).
--   - 세 테이블 모두 supabase_realtime publication에 추가.
-- ============================================================

-- ============================================================
-- 1. catchmind_rooms
-- ============================================================
CREATE TABLE IF NOT EXISTS public.catchmind_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  host_session_id text NOT NULL,
  host_seat_label text NOT NULL,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'countdown', 'playing', 'transition', 'finished')),
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_round int NOT NULL DEFAULT 0,
  total_rounds int NOT NULL DEFAULT 0,
  current_drawer_session_id text,
  current_word text,
  current_round_started_at timestamptz,
  -- 라운드 결과(점수 변동)를 표시할 때 사용
  last_round_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS catchmind_rooms_store_status_idx
  ON public.catchmind_rooms (store_id, status, created_at DESC);

-- ============================================================
-- 2. catchmind_strokes (라운드 드로잉 데이터)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.catchmind_strokes (
  id bigserial PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.catchmind_rooms(id) ON DELETE CASCADE,
  round_number int NOT NULL,
  stroke_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catchmind_strokes_room_round_idx
  ON public.catchmind_strokes (room_id, round_number, id);

-- ============================================================
-- 3. catchmind_messages (채팅 + 정답)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.catchmind_messages (
  id bigserial PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.catchmind_rooms(id) ON DELETE CASCADE,
  round_number int NOT NULL DEFAULT 0,
  session_id text,
  seat_label text,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'chat'
    CHECK (type IN ('chat', 'correct', 'close', 'system')),
  score_gained int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catchmind_messages_room_idx
  ON public.catchmind_messages (room_id, created_at);

-- ============================================================
-- 4. Realtime publication 등록
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.catchmind_rooms;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.catchmind_strokes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.catchmind_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 5. RLS: anon/authenticated 전체 허용
--
-- 플러팅 게임과 동일한 정책. 이 앱은 anon key + session_id로 식별하고
-- row 단위 권한은 앱 코드(store_id eq filter, session_id 비교)에서 검증한다.
-- ============================================================

ALTER TABLE public.catchmind_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS catchmind_rooms_anon_all ON public.catchmind_rooms;
CREATE POLICY catchmind_rooms_anon_all
  ON public.catchmind_rooms
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.catchmind_strokes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS catchmind_strokes_anon_all ON public.catchmind_strokes;
CREATE POLICY catchmind_strokes_anon_all
  ON public.catchmind_strokes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.catchmind_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS catchmind_messages_anon_all ON public.catchmind_messages;
CREATE POLICY catchmind_messages_anon_all
  ON public.catchmind_messages
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 적용 후 점검
--
--   SELECT relname, relrowsecurity
--   FROM pg_class
--   WHERE relname IN ('catchmind_rooms', 'catchmind_strokes', 'catchmind_messages');
--   -- relrowsecurity 가 모두 t
--
--   SELECT tablename FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime'
--     AND tablename IN ('catchmind_rooms', 'catchmind_strokes', 'catchmind_messages');
--   -- 세 테이블 모두 결과에 나옴
-- ============================================================

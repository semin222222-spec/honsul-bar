-- ============================================================
-- 드립 배틀 (빈칸 채우기 단체 게임)
--
-- 테이블 3개 + RPC 3개
--   - drip_battle_rooms     : 방 / 게임 진행 상태 (페이즈 머신)
--   - drip_battle_answers   : 라운드별 답변 (1인 1답)
--   - drip_battle_votes     : 라운드별 투표 (1인 1표, 본인 답변 투표 불가는 앱에서 검증)
--
--   - leave_drip_battle_room        : 페이지 이탈/나가기. 0명 시 방 DELETE, 게임 중 2명 미만이면 finished, 방장 위임
--   - drip_battle_room_heartbeat    : 30초마다 호출, last_seen_at 갱신
--   - cleanup_drip_battle_rooms     : 로비 진입 시 호출, 좀비 방 정리
--
-- 정책: 매장(store_id) 스코프. anon/authenticated 모두 ALL 허용 (라이어/캐치마인드와 동일).
-- row 단위 권한(본인 답변/투표)은 앱 코드에서 검증한다.
-- ============================================================

-- ============================================================
-- 1. drip_battle_rooms
-- ============================================================
CREATE TABLE IF NOT EXISTS public.drip_battle_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  host_session_id text NOT NULL,
  host_seat_label text NOT NULL,

  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'phase_input', 'phase_vote', 'phase_result', 'finished')),

  -- players: [{ session_id, seat_label, joined_at, last_seen_at }]
  players jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- 라운드 진행
  current_round int NOT NULL DEFAULT 1,
  total_rounds  int NOT NULL DEFAULT 3,
  current_question text,                -- 이번 라운드 빈칸 문장
  used_questions jsonb NOT NULL DEFAULT '[]'::jsonb,  -- 이미 사용한 질문 (라운드 중복 방지)
  phase_started_at timestamptz,         -- 현재 페이즈 시작 시각 (타이머 판정 기준)

  -- last_round_result: { ranking:[{answer_id,session_id,seat_label,answer_text,votes,rank}], best:{...}|null, worst:{...}|null, round:int }
  last_round_result jsonb,

  -- 라이프사이클
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS drip_battle_rooms_store_status_idx
  ON public.drip_battle_rooms (store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS drip_battle_rooms_updated_idx
  ON public.drip_battle_rooms (updated_at);

-- ============================================================
-- 2. drip_battle_answers
--   - 한 row = 한 사람이 한 라운드에 제출한 답변
--   - (room_id, round_number, session_id) UNIQUE → 중복 제출 방지
-- ============================================================
CREATE TABLE IF NOT EXISTS public.drip_battle_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.drip_battle_rooms(id) ON DELETE CASCADE,
  round_number int NOT NULL,
  session_id text NOT NULL,
  seat_label text NOT NULL,
  answer_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, round_number, session_id)
);

CREATE INDEX IF NOT EXISTS drip_battle_answers_room_round_idx
  ON public.drip_battle_answers (room_id, round_number, created_at);

-- ============================================================
-- 3. drip_battle_votes
--   - 한 row = 한 사람이 한 라운드에 던진 표
--   - (room_id, round_number, voter_session_id) UNIQUE → 1인 1표
--   - 본인 답변 투표 불가는 앱에서 차단 (UI disabled + insert 전 검증)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.drip_battle_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.drip_battle_rooms(id) ON DELETE CASCADE,
  round_number int NOT NULL,
  voter_session_id text NOT NULL,
  target_answer_id uuid NOT NULL REFERENCES public.drip_battle_answers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, round_number, voter_session_id)
);

CREATE INDEX IF NOT EXISTS drip_battle_votes_room_round_idx
  ON public.drip_battle_votes (room_id, round_number);

-- ============================================================
-- 4. updated_at 트리거 (rooms 만)
-- ============================================================
CREATE OR REPLACE FUNCTION public.drip_battle_rooms_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS drip_battle_rooms_updated_at_trg ON public.drip_battle_rooms;
CREATE TRIGGER drip_battle_rooms_updated_at_trg
  BEFORE UPDATE ON public.drip_battle_rooms
  FOR EACH ROW EXECUTE FUNCTION public.drip_battle_rooms_touch_updated_at();

-- ============================================================
-- 5. Realtime publication
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.drip_battle_rooms;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.drip_battle_answers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.drip_battle_votes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 6. RLS — anon/authenticated 전체 허용 (라이어/캐치마인드와 동일)
-- ============================================================
ALTER TABLE public.drip_battle_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS drip_battle_rooms_anon_all ON public.drip_battle_rooms;
CREATE POLICY drip_battle_rooms_anon_all
  ON public.drip_battle_rooms
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.drip_battle_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS drip_battle_answers_anon_all ON public.drip_battle_answers;
CREATE POLICY drip_battle_answers_anon_all
  ON public.drip_battle_answers
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.drip_battle_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS drip_battle_votes_anon_all ON public.drip_battle_votes;
CREATE POLICY drip_battle_votes_anon_all
  ON public.drip_battle_votes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 7. leave_drip_battle_room
--   - 페이지 이탈 / 명시적 나가기에서 호출
--   - players에서 해당 session 제거
--   - 0명 → 방 DELETE
--   - 게임 중(phase_*) + 2명 미만 → 즉시 finished (진행 불가)
--   - 방장 나가면 다음 player 가 방장 위임
-- ============================================================
CREATE OR REPLACE FUNCTION public.leave_drip_battle_room(
  p_room_id uuid,
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_room public.drip_battle_rooms;
  v_new_players jsonb;
BEGIN
  SELECT * INTO v_room FROM public.drip_battle_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT jsonb_agg(p) INTO v_new_players
  FROM jsonb_array_elements(v_room.players) p
  WHERE p->>'session_id' <> p_session_id;

  v_new_players := COALESCE(v_new_players, '[]'::jsonb);

  -- 0명 → 방 삭제
  IF jsonb_array_length(v_new_players) = 0 THEN
    DELETE FROM public.drip_battle_rooms WHERE id = p_room_id;
    RETURN;
  END IF;

  -- 게임 진행 중에 2명 미만이면 즉시 finished (남은 사람끼리 결과 화면)
  IF v_room.status IN ('phase_input', 'phase_vote', 'phase_result')
     AND jsonb_array_length(v_new_players) < 2 THEN
    UPDATE public.drip_battle_rooms
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
    UPDATE public.drip_battle_rooms
    SET
      players = v_new_players,
      host_session_id = v_new_players->0->>'session_id',
      host_seat_label = v_new_players->0->>'seat_label'
    WHERE id = p_room_id;
  ELSE
    UPDATE public.drip_battle_rooms
    SET players = v_new_players
    WHERE id = p_room_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_drip_battle_room(uuid, text) TO anon, authenticated;

-- ============================================================
-- 8. drip_battle_room_heartbeat
--   - 30초마다 호출. 해당 player의 last_seen_at 만 갱신.
-- ============================================================
CREATE OR REPLACE FUNCTION public.drip_battle_room_heartbeat(
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
  FROM public.drip_battle_rooms r, jsonb_array_elements(r.players) p
  WHERE r.id = p_room_id;

  IF v_new_players IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.drip_battle_rooms
  SET players = v_new_players
  WHERE id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.drip_battle_room_heartbeat(uuid, text) TO anon, authenticated;

-- ============================================================
-- 9. cleanup_drip_battle_rooms
--   - 로비 진입 시 호출
--   - finished 5분 / 30분 무업데이트 / 빈 방 1분 → 삭제
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_drip_battle_rooms(
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
    DELETE FROM public.drip_battle_rooms
    WHERE
      (p_store_id IS NULL OR store_id = p_store_id)
      AND (
        (status = 'finished' AND finished_at IS NOT NULL
          AND finished_at < now() - INTERVAL '5 minutes')
        OR (updated_at < now() - INTERVAL '30 minutes'
            AND status NOT IN ('phase_input', 'phase_vote', 'phase_result'))
        OR (jsonb_array_length(players) = 0
            AND created_at < now() - INTERVAL '1 minute')
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM del;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_drip_battle_rooms(text) TO anon, authenticated;

-- ============================================================
-- 적용 후 점검
--
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('drip_battle_rooms','drip_battle_answers','drip_battle_votes');
--   -- relrowsecurity 가 모두 t
--
--   SELECT tablename FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime'
--     AND tablename IN ('drip_battle_rooms','drip_battle_answers','drip_battle_votes');
--   -- 세 테이블 모두 결과에 나옴
--
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public'
--     AND routine_name IN (
--       'leave_drip_battle_room','drip_battle_room_heartbeat',
--       'cleanup_drip_battle_rooms','drip_battle_rooms_touch_updated_at'
--     );
--   -- 네 함수 모두 결과에 나옴
-- ============================================================

-- ============================================================
-- 익명 폭로전 (Exposed) — 다수결 패자 룰 단체 게임
--
-- 테이블 2개 + RPC 8개
--   - exposed_rooms        : 방 / 게임 진행 상태 (페이즈 머신 + 플레이어/질문풀 JSONB)
--   - exposed_votes        : 라운드별 접어/패스 투표 (★ SELECT 금지 — 익명성 핵심)
--
--   - leave_exposed_room       : 페이지 이탈/나가기. 0명 DELETE, 진행 중 2명 미만 finished, 방장 위임
--   - exposed_room_heartbeat   : 30초마다 호출, last_seen_at 갱신
--   - cleanup_exposed_rooms    : 로비 진입 시 호출, 좀비 방 정리
--   - exposed_submit_question  : 익명 질문 제출 (작성자와 텍스트를 연결하지 않음)
--   - exposed_cast_vote        : 접어/패스 투표 (선택은 잠긴 votes 테이블로만, 여부만 room에)
--   - exposed_tally_round      : ★ SECURITY DEFINER. 투표 집계→소수파 라이프-1. 표가 서버 밖으로 안 나가는 유일 경로
--   - exposed_restart_game     : ★ SECURITY DEFINER. 한 판 더 (라이프/풀/투표 초기화)
--
-- 페이즈: waiting → phase_input → phase_vote → phase_result → finished
-- 정책: 매장(store_id) 스코프. rooms는 anon/authenticated ALL 허용 (라이어/드립과 동일).
--       votes는 INSERT만 허용하고 SELECT 정책을 두지 않아 누구도 투표 '선택'을 읽지 못한다.
--       집계는 DEFINER 함수가 서버 안에서만 수행한다. (익명성 > 그 외 모든 것)
-- ============================================================

-- ============================================================
-- 1. exposed_rooms
--   players: [{
--     session_id, seat_label, joined_at, last_seen_at,
--     lives_remaining,   -- 5 → 0
--     status             -- 'playing' | 'penalty'
--   }]
--   question_pool      : [{ id, text }]   ← 작성자 컬럼 없음 (원천 익명)
--   used_questions     : [text]           ← 이미 보여준 질문 (중복 방지)
--   submitted_sessions : [session_id]     ← 제출 '여부'만, 텍스트와 미연결
--   voted_sessions     : [session_id]     ← 이번 라운드 투표 '여부'만, 선택과 미연결
--   last_round_result  : { fold_count, pass_count, outcome, minority_count, eliminated_seats[], round }
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exposed_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  host_session_id text NOT NULL,
  host_seat_label text NOT NULL,

  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'phase_input', 'phase_vote', 'phase_result', 'finished')),

  -- 매운맛 2단계만. hot(19금) 원천 차단.
  spice_level text NOT NULL DEFAULT 'medium'
    CHECK (spice_level IN ('mild', 'medium')),

  players jsonb NOT NULL DEFAULT '[]'::jsonb,

  question_pool      jsonb NOT NULL DEFAULT '[]'::jsonb,
  used_questions     jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_sessions jsonb NOT NULL DEFAULT '[]'::jsonb,
  voted_sessions     jsonb NOT NULL DEFAULT '[]'::jsonb,

  current_round    int NOT NULL DEFAULT 0,
  current_question text,
  phase_started_at timestamptz,
  last_round_result jsonb,

  -- 라이프사이클
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS exposed_rooms_store_status_idx
  ON public.exposed_rooms (store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS exposed_rooms_updated_idx
  ON public.exposed_rooms (updated_at);

-- ============================================================
-- 2. exposed_votes  (★ 익명성 핵심 — 클라이언트는 SELECT 불가)
--   한 row = 한 사람이 한 라운드에 던진 접어/패스.
--   (room_id, round_number, session_id) UNIQUE → 1인 1표.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exposed_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.exposed_rooms(id) ON DELETE CASCADE,
  round_number int NOT NULL,
  session_id text NOT NULL,
  vote text NOT NULL CHECK (vote IN ('fold', 'pass')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, round_number, session_id)
);

CREATE INDEX IF NOT EXISTS exposed_votes_room_round_idx
  ON public.exposed_votes (room_id, round_number);

-- ============================================================
-- 3. updated_at 트리거 (rooms 만)
-- ============================================================
CREATE OR REPLACE FUNCTION public.exposed_rooms_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exposed_rooms_updated_at_trg ON public.exposed_rooms;
CREATE TRIGGER exposed_rooms_updated_at_trg
  BEFORE UPDATE ON public.exposed_rooms
  FOR EACH ROW EXECUTE FUNCTION public.exposed_rooms_touch_updated_at();

-- ============================================================
-- 4. Realtime publication — rooms 만. (votes는 구독하지 않는다)
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.exposed_rooms;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 5. RLS
--   rooms : anon/authenticated 전체 허용 (라이어/드립과 동일)
--   votes : INSERT만 허용. SELECT 정책 없음 → 누구도 '선택'을 못 읽는다.
-- ============================================================
ALTER TABLE public.exposed_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS exposed_rooms_anon_all ON public.exposed_rooms;
CREATE POLICY exposed_rooms_anon_all
  ON public.exposed_rooms
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.exposed_votes ENABLE ROW LEVEL SECURITY;
-- 오직 INSERT만. (SELECT/UPDATE/DELETE 정책을 두지 않으므로 클라이언트는 표를 읽지 못한다)
DROP POLICY IF EXISTS exposed_votes_anon_insert ON public.exposed_votes;
CREATE POLICY exposed_votes_anon_insert
  ON public.exposed_votes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================================
-- 6. leave_exposed_room
--   - 0명 → 방 삭제
--   - 게임 중(phase_*) + 2명 미만 → 즉시 finished
--   - 방장 나가면 다음 player 가 방장 위임
-- ============================================================
CREATE OR REPLACE FUNCTION public.leave_exposed_room(
  p_room_id uuid,
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_room public.exposed_rooms;
  v_new_players jsonb;
  v_host_left boolean;
BEGIN
  SELECT * INTO v_room FROM public.exposed_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT jsonb_agg(p) INTO v_new_players
  FROM jsonb_array_elements(v_room.players) p
  WHERE p->>'session_id' <> p_session_id;

  v_new_players := COALESCE(v_new_players, '[]'::jsonb);

  -- 0명 → 방 삭제
  IF jsonb_array_length(v_new_players) = 0 THEN
    DELETE FROM public.exposed_rooms WHERE id = p_room_id;
    RETURN;
  END IF;

  v_host_left := (v_room.host_session_id = p_session_id);

  -- 게임 진행 중에 2명 미만이면 즉시 finished
  IF v_room.status IN ('phase_input', 'phase_vote', 'phase_result')
     AND jsonb_array_length(v_new_players) < 2 THEN
    UPDATE public.exposed_rooms
    SET
      status = 'finished',
      finished_at = now(),
      players = v_new_players,
      host_session_id = CASE
        WHEN v_host_left THEN v_new_players->0->>'session_id'
        ELSE v_room.host_session_id
      END,
      host_seat_label = CASE
        WHEN v_host_left THEN v_new_players->0->>'seat_label'
        ELSE v_room.host_seat_label
      END
    WHERE id = p_room_id;
    RETURN;
  END IF;

  -- 방장 위임
  IF v_host_left THEN
    UPDATE public.exposed_rooms
    SET
      players = v_new_players,
      host_session_id = v_new_players->0->>'session_id',
      host_seat_label = v_new_players->0->>'seat_label'
    WHERE id = p_room_id;
  ELSE
    UPDATE public.exposed_rooms
    SET players = v_new_players
    WHERE id = p_room_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_exposed_room(uuid, text) TO anon, authenticated;

-- ============================================================
-- 7. exposed_room_heartbeat
-- ============================================================
CREATE OR REPLACE FUNCTION public.exposed_room_heartbeat(
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
  FROM public.exposed_rooms r, jsonb_array_elements(r.players) p
  WHERE r.id = p_room_id;

  IF v_new_players IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.exposed_rooms
  SET players = v_new_players
  WHERE id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exposed_room_heartbeat(uuid, text) TO anon, authenticated;

-- ============================================================
-- 8. cleanup_exposed_rooms
--   - finished 5분 / 30분 무업데이트(진행 중 아님) / 빈 방 1분 → 삭제
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_exposed_rooms(
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
    DELETE FROM public.exposed_rooms
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

GRANT EXECUTE ON FUNCTION public.cleanup_exposed_rooms(text) TO anon, authenticated;

-- ============================================================
-- 9. exposed_submit_question
--   - phase_input 에서만. 1인 1제출.
--   - 질문은 question_pool 에 익명으로 들어가고, 제출 '여부'만 submitted_sessions 에 기록.
--     (둘을 같은 row/순서로 연결하지 않아 누가 무엇을 썼는지 DB에도 남지 않는다)
--   - 동시 제출 lost-update 방지: 방을 FOR UPDATE 로 잠근다.
-- ============================================================
CREATE OR REPLACE FUNCTION public.exposed_submit_question(
  p_room_id uuid,
  p_session_id text,
  p_text text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_room public.exposed_rooms;
  v_text text;
  v_is_player boolean;
BEGIN
  SELECT * INTO v_room FROM public.exposed_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR v_room.status <> 'phase_input' THEN
    RETURN;
  END IF;

  -- 참가자만
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_room.players) p
    WHERE p->>'session_id' = p_session_id
  ) INTO v_is_player;
  IF NOT v_is_player THEN
    RETURN;
  END IF;

  v_text := btrim(COALESCE(p_text, ''));
  IF v_text = '' THEN
    RETURN;
  END IF;
  IF char_length(v_text) > 80 THEN
    v_text := left(v_text, 80);
  END IF;

  -- 이미 제출했으면 멱등 (중복 금지)
  IF v_room.submitted_sessions ? p_session_id THEN
    RETURN;
  END IF;

  UPDATE public.exposed_rooms
  SET
    question_pool = v_room.question_pool
      || jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'text', v_text)),
    submitted_sessions = v_room.submitted_sessions || to_jsonb(p_session_id)
  WHERE id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exposed_submit_question(uuid, text, text) TO anon, authenticated;

-- ============================================================
-- 10. exposed_cast_vote
--   - phase_vote + 현재 라운드에서만. 1인 1표.
--   - 선택(fold/pass)은 잠긴 votes 테이블로만. room 에는 투표 '여부'만 기록.
--   - 동시 투표 lost-update 방지: 방을 FOR UPDATE 로 잠근다.
-- ============================================================
CREATE OR REPLACE FUNCTION public.exposed_cast_vote(
  p_room_id uuid,
  p_session_id text,
  p_round int,
  p_vote text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_room public.exposed_rooms;
  v_is_player boolean;
BEGIN
  IF p_vote NOT IN ('fold', 'pass') THEN
    RETURN;
  END IF;

  SELECT * INTO v_room FROM public.exposed_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR v_room.status <> 'phase_vote' OR v_room.current_round <> p_round THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_room.players) p
    WHERE p->>'session_id' = p_session_id
  ) INTO v_is_player;
  IF NOT v_is_player THEN
    RETURN;
  END IF;

  INSERT INTO public.exposed_votes (room_id, round_number, session_id, vote)
  VALUES (p_room_id, p_round, p_session_id, p_vote)
  ON CONFLICT (room_id, round_number, session_id) DO NOTHING;

  IF NOT (v_room.voted_sessions ? p_session_id) THEN
    UPDATE public.exposed_rooms
    SET voted_sessions = v_room.voted_sessions || to_jsonb(p_session_id)
    WHERE id = p_room_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exposed_cast_vote(uuid, text, int, text) TO anon, authenticated;

-- ============================================================
-- 11. exposed_tally_round  (★ SECURITY DEFINER — 표를 읽는 유일한 경로)
--   - phase_vote 에서만 (멱등: 한 번 집계되면 phase_result 로 바뀌어 재호출 무시).
--   - 다수파=진실, 소수파=거짓 → 소수파 투표자만 라이프 -1. 동률이면 아무도 -1 X.
--   - 라이프 0 → status='penalty'.
--   - last_round_result 에는 집계 숫자/탈락 자리만 기록. 개별 표/세션은 절대 노출하지 않는다.
-- ============================================================
CREATE OR REPLACE FUNCTION public.exposed_tally_round(
  p_room_id uuid,
  p_round int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.exposed_rooms;
  v_fold int;
  v_pass int;
  v_outcome text;
  v_minority text;        -- 'fold' | 'pass' | NULL(동률)
  v_minority_count int;
  v_new_players jsonb;
  v_elim jsonb;
BEGIN
  SELECT * INTO v_room FROM public.exposed_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR v_room.status <> 'phase_vote' OR v_room.current_round <> p_round THEN
    RETURN;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE vote = 'fold'),
    COUNT(*) FILTER (WHERE vote = 'pass')
  INTO v_fold, v_pass
  FROM public.exposed_votes
  WHERE room_id = p_room_id AND round_number = p_round;

  v_fold := COALESCE(v_fold, 0);
  v_pass := COALESCE(v_pass, 0);

  IF v_fold > v_pass THEN
    v_outcome := 'fold_majority'; v_minority := 'pass'; v_minority_count := v_pass;
  ELSIF v_pass > v_fold THEN
    v_outcome := 'pass_majority'; v_minority := 'fold'; v_minority_count := v_fold;
  ELSE
    v_outcome := 'tie'; v_minority := NULL; v_minority_count := 0;
  END IF;

  -- 소수파 투표자(현재 playing)만 라이프 -1, 0이면 penalty
  SELECT jsonb_agg(
    CASE
      WHEN p->>'status' = 'playing'
        AND v_minority IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.exposed_votes ev
          WHERE ev.room_id = p_room_id
            AND ev.round_number = p_round
            AND ev.session_id = p->>'session_id'
            AND ev.vote = v_minority
        )
      THEN
        jsonb_set(
          jsonb_set(
            p,
            '{lives_remaining}',
            to_jsonb(GREATEST(0, COALESCE((p->>'lives_remaining')::int, 5) - 1))
          ),
          '{status}',
          to_jsonb(
            CASE WHEN GREATEST(0, COALESCE((p->>'lives_remaining')::int, 5) - 1) = 0
              THEN 'penalty' ELSE 'playing' END
          )
        )
      ELSE p
    END
  )
  INTO v_new_players
  FROM jsonb_array_elements(v_room.players) p;

  v_new_players := COALESCE(v_new_players, '[]'::jsonb);

  -- 탈락(라이프 0) 자리들
  SELECT jsonb_agg(p->>'seat_label')
  INTO v_elim
  FROM jsonb_array_elements(v_new_players) p
  WHERE COALESCE((p->>'lives_remaining')::int, 5) <= 0;
  v_elim := COALESCE(v_elim, '[]'::jsonb);

  UPDATE public.exposed_rooms
  SET
    players = v_new_players,
    status = 'phase_result',
    last_round_result = jsonb_build_object(
      'fold_count', v_fold,
      'pass_count', v_pass,
      'outcome', v_outcome,
      'minority_count', v_minority_count,
      'eliminated_seats', v_elim,
      'round', p_round
    )
  WHERE id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exposed_tally_round(uuid, int) TO anon, authenticated;

-- ============================================================
-- 12. exposed_restart_game  (★ SECURITY DEFINER — 잠긴 votes 정리 필요)
--   - 방장만. "한 판 더": 라이프 5 복구, 풀/제출/투표/결과 초기화, status='waiting'.
--   - 이전 게임 표를 지워 (room, round, session) UNIQUE 충돌을 막는다.
-- ============================================================
CREATE OR REPLACE FUNCTION public.exposed_restart_game(
  p_room_id uuid,
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.exposed_rooms;
  v_new_players jsonb;
BEGIN
  SELECT * INTO v_room FROM public.exposed_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR v_room.host_session_id <> p_session_id THEN
    RETURN;
  END IF;

  DELETE FROM public.exposed_votes WHERE room_id = p_room_id;

  SELECT jsonb_agg(
    jsonb_set(
      jsonb_set(p, '{lives_remaining}', to_jsonb(5)),
      '{status}', to_jsonb('playing'::text)
    )
  )
  INTO v_new_players
  FROM jsonb_array_elements(v_room.players) p;

  UPDATE public.exposed_rooms
  SET
    players = COALESCE(v_new_players, '[]'::jsonb),
    status = 'waiting',
    question_pool = '[]'::jsonb,
    used_questions = '[]'::jsonb,
    submitted_sessions = '[]'::jsonb,
    voted_sessions = '[]'::jsonb,
    current_round = 0,
    current_question = NULL,
    phase_started_at = NULL,
    last_round_result = NULL,
    started_at = NULL,
    finished_at = NULL
  WHERE id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exposed_restart_game(uuid, text) TO anon, authenticated;

-- ============================================================
-- 적용 후 점검
--
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('exposed_rooms','exposed_votes');
--   -- relrowsecurity 가 모두 t
--
--   -- ★ 익명성 확인: anon 으로 SELECT 시 0행 / 권한 거부여야 한다
--   SELECT polname, polcmd FROM pg_policy
--   WHERE polrelid = 'public.exposed_votes'::regclass;
--   -- INSERT 정책 하나만 나와야 함 (SELECT 정책 없음)
--
--   SELECT tablename FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime' AND tablename = 'exposed_rooms';
--   -- 한 줄 (votes 는 없어야 정상)
--
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public'
--     AND routine_name IN (
--       'leave_exposed_room','exposed_room_heartbeat','cleanup_exposed_rooms',
--       'exposed_submit_question','exposed_cast_vote','exposed_tally_round',
--       'exposed_restart_game','exposed_rooms_touch_updated_at'
--     );
--   -- 여덟 함수 모두 나옴
-- ============================================================

-- ============================================================
-- 콜 마이 네임 (나는 누구일까? 단체 추리 게임)
--
-- 테이블 1개 + RPC 4개
--   - call_my_name_rooms          : 방 / 게임 상태 (페이즈 머신 + 개인 상태 JSONB)
--   - leave_call_my_name_room     : 페이지 이탈/나가기. 0명 시 방 DELETE, 진행 중 2명 미만/전원 해결이면 finished, 방장 위임
--   - call_my_name_room_heartbeat : 30초마다 호출, last_seen_at 갱신
--   - cleanup_call_my_name_rooms  : 로비 진입 시 호출, 좀비 방 정리
--   - call_my_name_attempt        : 정답 시도(서버 원자 처리) — 자유 플레이 동시성 보호
--
-- 페이즈: waiting → playing → finished (드립/라이어보다 단순. 자유 플레이라 타이머 없음)
-- 정책: 매장(store_id) 스코프. anon/authenticated 모두 ALL 허용 (라이어/드립과 동일).
-- row 단위 권한(본인 정체 블라인드)은 앱 코드에서 검증한다 (라이어 역할 처리와 동일 신뢰 모델).
-- ============================================================

-- ============================================================
-- 1. call_my_name_rooms
--   players: [{
--     session_id, seat_label, joined_at, last_seen_at,
--     identity_keyword,    -- 배정된 정체 (예: "원빈")     ← 게임 시작 시 1회
--     identity_category,   -- 카테고리 (예: "인물")
--     lives_remaining,     -- 3 → 0
--     status,              -- 'playing' | 'solved' | 'penalty'
--     solved_at            -- 정답 맞힌 시각 (solved일 때만)
--   }]
-- ============================================================
CREATE TABLE IF NOT EXISTS public.call_my_name_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  host_session_id text NOT NULL,
  host_seat_label text NOT NULL,

  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'playing', 'finished')),

  players jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- 라이프사이클
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS call_my_name_rooms_store_status_idx
  ON public.call_my_name_rooms (store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS call_my_name_rooms_updated_idx
  ON public.call_my_name_rooms (updated_at);

-- ============================================================
-- 2. updated_at 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION public.call_my_name_rooms_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS call_my_name_rooms_updated_at_trg ON public.call_my_name_rooms;
CREATE TRIGGER call_my_name_rooms_updated_at_trg
  BEFORE UPDATE ON public.call_my_name_rooms
  FOR EACH ROW EXECUTE FUNCTION public.call_my_name_rooms_touch_updated_at();

-- ============================================================
-- 3. Realtime publication
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.call_my_name_rooms;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 4. RLS — anon/authenticated 전체 허용 (라이어/드립과 동일)
-- ============================================================
ALTER TABLE public.call_my_name_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS call_my_name_rooms_anon_all ON public.call_my_name_rooms;
CREATE POLICY call_my_name_rooms_anon_all
  ON public.call_my_name_rooms
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 5. leave_call_my_name_room
--   - 페이지 이탈 / 명시적 나가기에서 호출
--   - players에서 해당 session 제거
--   - 0명 → 방 DELETE
--   - 게임 중(playing) + 2명 미만 또는 남은 전원 해결 → 즉시 finished
--   - 방장 나가면 다음 player 가 방장 위임
-- ============================================================
CREATE OR REPLACE FUNCTION public.leave_call_my_name_room(
  p_room_id uuid,
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_room public.call_my_name_rooms;
  v_new_players jsonb;
  v_all_resolved boolean;
  v_host_left boolean;
BEGIN
  SELECT * INTO v_room FROM public.call_my_name_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT jsonb_agg(p) INTO v_new_players
  FROM jsonb_array_elements(v_room.players) p
  WHERE p->>'session_id' <> p_session_id;

  v_new_players := COALESCE(v_new_players, '[]'::jsonb);

  -- 0명 → 방 삭제
  IF jsonb_array_length(v_new_players) = 0 THEN
    DELETE FROM public.call_my_name_rooms WHERE id = p_room_id;
    RETURN;
  END IF;

  v_host_left := (v_room.host_session_id = p_session_id);

  -- 남은 전원이 해결(solved/penalty)됐는지
  SELECT bool_and(p->>'status' IN ('solved', 'penalty'))
  INTO v_all_resolved
  FROM jsonb_array_elements(v_new_players) p;

  -- 게임 진행 중에 2명 미만이거나 남은 전원이 해결됐으면 즉시 finished
  IF v_room.status = 'playing'
     AND (jsonb_array_length(v_new_players) < 2 OR COALESCE(v_all_resolved, false)) THEN
    UPDATE public.call_my_name_rooms
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
    UPDATE public.call_my_name_rooms
    SET
      players = v_new_players,
      host_session_id = v_new_players->0->>'session_id',
      host_seat_label = v_new_players->0->>'seat_label'
    WHERE id = p_room_id;
  ELSE
    UPDATE public.call_my_name_rooms
    SET players = v_new_players
    WHERE id = p_room_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_call_my_name_room(uuid, text) TO anon, authenticated;

-- ============================================================
-- 6. call_my_name_room_heartbeat
--   - 30초마다 호출. 해당 player의 last_seen_at 만 갱신.
-- ============================================================
CREATE OR REPLACE FUNCTION public.call_my_name_room_heartbeat(
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
  FROM public.call_my_name_rooms r, jsonb_array_elements(r.players) p
  WHERE r.id = p_room_id;

  IF v_new_players IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.call_my_name_rooms
  SET players = v_new_players
  WHERE id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.call_my_name_room_heartbeat(uuid, text) TO anon, authenticated;

-- ============================================================
-- 7. cleanup_call_my_name_rooms
--   - 로비 진입 시 호출
--   - finished 5분 / 30분 무업데이트(진행 중 아님) / 빈 방 1분 → 삭제
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_call_my_name_rooms(
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
    DELETE FROM public.call_my_name_rooms
    WHERE
      (p_store_id IS NULL OR store_id = p_store_id)
      AND (
        (status = 'finished' AND finished_at IS NOT NULL
          AND finished_at < now() - INTERVAL '5 minutes')
        OR (updated_at < now() - INTERVAL '30 minutes'
            AND status <> 'playing')
        OR (jsonb_array_length(players) = 0
            AND created_at < now() - INTERVAL '1 minute')
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM del;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_call_my_name_rooms(text) TO anon, authenticated;

-- ============================================================
-- 8. call_my_name_attempt
--   - 정답 시도. 서버에서 정규화 비교 후 결과를 원자적으로 적용한다.
--   - 자유 플레이에서 여러 손님이 동시에 자기 항목을 갱신할 때 lost-update를 막기 위해
--     방을 FOR UPDATE 로 잠그고 해당 player 항목만 수정한다. (leave/heartbeat 와 동일 기법)
--   - 정규화: 소문자 + 공백/특수문자 제거 후 정확 일치. (예: "원 빈"="원빈", "원빈!"="원빈")
--   - 정답  → status='solved', solved_at 기록
--     오답  → lives_remaining -1, 0이면 status='penalty'
--   - 적용 후 전원(solved/penalty) 해결됐으면 status='finished'
--   - 반환: { correct, lives_remaining, status, identity_keyword, identity_category, finished }
-- ============================================================
CREATE OR REPLACE FUNCTION public.call_my_name_attempt(
  p_room_id uuid,
  p_session_id text,
  p_guess text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_room public.call_my_name_rooms;
  v_player jsonb;
  v_status text;
  v_keyword text;
  v_category text;
  v_lives int;
  v_correct boolean;
  v_norm_guess text;
  v_norm_answer text;
  v_patch jsonb;
  v_new_players jsonb;
  v_all_resolved boolean;
BEGIN
  SELECT * INTO v_room FROM public.call_my_name_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF v_room.status <> 'playing' THEN
    RETURN NULL;
  END IF;

  -- 해당 player 찾기
  SELECT p INTO v_player
  FROM jsonb_array_elements(v_room.players) p
  WHERE p->>'session_id' = p_session_id;

  IF v_player IS NULL THEN
    RETURN NULL;
  END IF;

  v_status := v_player->>'status';
  v_keyword := v_player->>'identity_keyword';
  v_category := v_player->>'identity_category';
  v_lives := COALESCE((v_player->>'lives_remaining')::int, 3);

  -- 이미 해결된 player면 변경 없이 현재 상태 반환 (멱등)
  IF v_status IN ('solved', 'penalty') THEN
    RETURN jsonb_build_object(
      'correct', (v_status = 'solved'),
      'lives_remaining', v_lives,
      'status', v_status,
      'identity_keyword', v_keyword,
      'identity_category', v_category,
      'finished', (v_room.status = 'finished')
    );
  END IF;

  v_norm_guess := lower(regexp_replace(COALESCE(p_guess, ''), '[[:space:][:punct:]]', '', 'g'));
  v_norm_answer := lower(regexp_replace(COALESCE(v_keyword, ''), '[[:space:][:punct:]]', '', 'g'));
  v_correct := (v_norm_guess <> '' AND v_norm_guess = v_norm_answer);

  IF v_correct THEN
    v_status := 'solved';
    v_patch := jsonb_build_object(
      'status', 'solved',
      'lives_remaining', v_lives,
      'solved_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );
  ELSE
    v_lives := GREATEST(0, v_lives - 1);
    v_status := CASE WHEN v_lives = 0 THEN 'penalty' ELSE 'playing' END;
    v_patch := jsonb_build_object(
      'status', v_status,
      'lives_remaining', v_lives
    );
  END IF;

  -- 해당 player만 patch 적용
  SELECT jsonb_agg(
    CASE
      WHEN p->>'session_id' = p_session_id THEN p || v_patch
      ELSE p
    END
  )
  INTO v_new_players
  FROM jsonb_array_elements(v_room.players) p;

  -- 전원 해결 여부
  SELECT bool_and(p->>'status' IN ('solved', 'penalty'))
  INTO v_all_resolved
  FROM jsonb_array_elements(v_new_players) p;

  IF COALESCE(v_all_resolved, false) THEN
    UPDATE public.call_my_name_rooms
    SET players = v_new_players, status = 'finished', finished_at = now()
    WHERE id = p_room_id;
  ELSE
    UPDATE public.call_my_name_rooms
    SET players = v_new_players
    WHERE id = p_room_id;
  END IF;

  RETURN jsonb_build_object(
    'correct', v_correct,
    'lives_remaining', v_lives,
    'status', v_status,
    'identity_keyword', v_keyword,
    'identity_category', v_category,
    'finished', COALESCE(v_all_resolved, false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.call_my_name_attempt(uuid, text, text) TO anon, authenticated;

-- ============================================================
-- 적용 후 점검
--
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname = 'call_my_name_rooms';
--   -- relrowsecurity 가 t
--
--   SELECT tablename FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime'
--     AND tablename = 'call_my_name_rooms';
--   -- 한 줄 결과
--
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public'
--     AND routine_name IN (
--       'leave_call_my_name_room', 'call_my_name_room_heartbeat',
--       'cleanup_call_my_name_rooms', 'call_my_name_attempt',
--       'call_my_name_rooms_touch_updated_at'
--     );
--   -- 다섯 함수 모두 결과에 나옴
-- ============================================================

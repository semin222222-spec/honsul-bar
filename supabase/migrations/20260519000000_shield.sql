-- ============================================================
-- 5초 쉴드 초성 게임
--
-- 테이블 1개 + RPC 3개
--   - shield_rooms              : 방 / 게임 진행 상태
--   - leave_shield_room(rpc)    : 페이지 이탈 시 호출 (player 제거 + 0명이면 방 삭제)
--   - shield_room_heartbeat(rpc): 30초마다 호출 (last_seen_at 갱신)
--   - cleanup_shield_rooms(rpc) : 로비 진입 시 호출 (좀비 방 정리)
--
-- 정책: 매장(store_id) 스코프. anon/authenticated 모두 ALL 허용.
-- 카치마인드와 동일한 RLS 패턴.
-- ============================================================

-- ============================================================
-- 1. shield_rooms
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shield_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  host_session_id text NOT NULL,
  host_seat_label text NOT NULL,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'playing', 'finished')),

  -- players: [{ session_id, seat_label, status: 'alive'|'dead',
  --            last_seen_at, joined_at, eliminated_round, eliminated_initials }]
  players jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- 게임 진행 상태
  current_round int NOT NULL DEFAULT 0,
  current_turn_session_id text,
  current_initials text,
  current_turn_started_at timestamptz,

  -- 결과 화면용
  last_eliminated jsonb,

  -- 라이프사이클
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS shield_rooms_store_status_idx
  ON public.shield_rooms (store_id, status, created_at DESC);

-- ============================================================
-- 2. Realtime publication
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shield_rooms;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. RLS: anon/authenticated 전체 허용
--
-- 캐치마인드/플러팅과 동일한 정책. 이 앱은 anon key + session_id로 식별하고
-- row 단위 권한은 앱 코드(store_id eq filter, session_id 비교)에서 검증한다.
-- ============================================================

ALTER TABLE public.shield_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shield_rooms_anon_all ON public.shield_rooms;
CREATE POLICY shield_rooms_anon_all
  ON public.shield_rooms
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. leave_shield_room RPC
--   - 페이지 이탈(beforeunload/pagehide)에서 fetch keepalive 로 호출
--   - players에서 해당 session 제거. 0명이면 방 자체 DELETE.
--   - 방장이 나가면 다음 player가 방장 위임.
--   - 게임 중(playing)에 나가면 'dead' 처리 후 살아남은 사람이 1명이면 finished
-- ============================================================
CREATE OR REPLACE FUNCTION public.leave_shield_room(
  p_room_id uuid,
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_room public.shield_rooms;
  v_new_players jsonb;
  v_alive_count int;
  v_alive_after jsonb;
  v_next_turn text;
BEGIN
  SELECT * INTO v_room FROM public.shield_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_room.status = 'playing' THEN
    -- 게임 중: dead 처리만 하고 players 유지 (결과 화면에 표시)
    SELECT jsonb_agg(
      CASE
        WHEN p->>'session_id' = p_session_id
          THEN p || jsonb_build_object(
            'status', 'dead',
            'eliminated_round', v_room.current_round,
            'eliminated_initials', v_room.current_initials,
            'left_mid_game', true
          )
        ELSE p
      END
    )
    INTO v_new_players
    FROM jsonb_array_elements(v_room.players) p;

    v_new_players := COALESCE(v_new_players, '[]'::jsonb);

    -- 살아남은 사람 추출
    SELECT jsonb_agg(p) INTO v_alive_after
    FROM jsonb_array_elements(v_new_players) p
    WHERE p->>'status' = 'alive';

    v_alive_after := COALESCE(v_alive_after, '[]'::jsonb);
    v_alive_count := jsonb_array_length(v_alive_after);

    IF v_alive_count = 0 THEN
      -- 살아있는 사람 한 명도 없음 (이론상 거의 없는 케이스) → 방 삭제
      DELETE FROM public.shield_rooms WHERE id = p_room_id;
      RETURN;
    ELSIF v_alive_count = 1 THEN
      -- 1명 남음 → 우승 + finished
      UPDATE public.shield_rooms
      SET
        players = v_new_players,
        status = 'finished',
        finished_at = now(),
        current_turn_session_id = NULL
      WHERE id = p_room_id;
      RETURN;
    ELSE
      -- 2명 이상 남음 → 게임 계속
      -- 떠난 사람이 차례였으면 다음 alive 사람에게 턴 넘김
      IF v_room.current_turn_session_id = p_session_id THEN
        SELECT (p->>'session_id') INTO v_next_turn
        FROM jsonb_array_elements(v_new_players) p
        WHERE p->>'status' = 'alive'
        LIMIT 1;
        UPDATE public.shield_rooms
        SET
          players = v_new_players,
          current_turn_session_id = v_next_turn,
          current_turn_started_at = now()
        WHERE id = p_room_id;
      ELSE
        UPDATE public.shield_rooms
        SET players = v_new_players
        WHERE id = p_room_id;
      END IF;
      RETURN;
    END IF;
  END IF;

  -- waiting / finished: 단순 제거
  SELECT jsonb_agg(p) INTO v_new_players
  FROM jsonb_array_elements(v_room.players) p
  WHERE p->>'session_id' <> p_session_id;

  v_new_players := COALESCE(v_new_players, '[]'::jsonb);

  IF jsonb_array_length(v_new_players) = 0 THEN
    DELETE FROM public.shield_rooms WHERE id = p_room_id;
    RETURN;
  END IF;

  IF v_room.host_session_id = p_session_id THEN
    UPDATE public.shield_rooms
    SET
      players = v_new_players,
      host_session_id = v_new_players->0->>'session_id',
      host_seat_label = v_new_players->0->>'seat_label'
    WHERE id = p_room_id;
  ELSE
    UPDATE public.shield_rooms
    SET players = v_new_players
    WHERE id = p_room_id;
  END IF;
END;
$$;

-- ============================================================
-- 5. shield_room_heartbeat RPC
--   - 30초마다 호출. 특정 player의 last_seen_at만 갱신.
--   - jsonb 통째로 update 하는 race를 피하려고 RPC로 묶음.
-- ============================================================
CREATE OR REPLACE FUNCTION public.shield_room_heartbeat(
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
        THEN p || jsonb_build_object('last_seen_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
      ELSE p
    END
  )
  INTO v_new_players
  FROM public.shield_rooms r, jsonb_array_elements(r.players) p
  WHERE r.id = p_room_id;

  IF v_new_players IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.shield_rooms
  SET players = v_new_players
  WHERE id = p_room_id;
END;
$$;

-- ============================================================
-- 6. cleanup_shield_rooms RPC
--   - 로비 진입 시 호출 (좀비 방 정리)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_shield_rooms(
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
    DELETE FROM public.shield_rooms
    WHERE
      (p_store_id IS NULL OR store_id = p_store_id)
      AND (
        -- 종료된 지 5분 이상 지난 방
        (status = 'finished' AND finished_at IS NOT NULL
          AND finished_at < now() - INTERVAL '5 minutes')
        -- 생성 후 30분 동안 갱신 없는 방 (created_at 기준 — UPDATE 시 갱신되는 컬럼이 따로 없음)
        OR (created_at < now() - INTERVAL '30 minutes' AND status <> 'playing')
        -- players가 빈 방 (생성 1분 후 기준)
        OR (jsonb_array_length(players) = 0 AND created_at < now() - INTERVAL '1 minute')
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
--   WHERE relname = 'shield_rooms';
--   -- relrowsecurity 가 t
--
--   SELECT tablename FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime'
--     AND tablename = 'shield_rooms';
--   -- 한 줄 결과
--
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public'
--     AND routine_name IN ('leave_shield_room', 'shield_room_heartbeat', 'cleanup_shield_rooms');
--   -- 세 함수 모두 결과에 나옴
-- ============================================================

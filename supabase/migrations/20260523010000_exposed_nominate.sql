-- ============================================================
-- 익명 폭로전 v2 — 사연 작성 폐지 → 시스템 질문 + 사람 지목 방식
--
-- 변경 요지
--   - exposed_votes: fold/pass → 지목 대상(target_session_id / target_seat_label)
--   - exposed_submit_question: 폐지 (질문은 시스템 랜덤, 작성 페이즈 삭제)
--   - exposed_cast_vote: 다른 참가자 1명 지목 (자기 지목 불가)
--   - exposed_tally_round: 최다 득표자(벌칙자) 집계. 라이프 차감 없음.
--   - 페이즈: waiting → phase_vote → phase_result → (다음 질문) ... → finished
--
-- 익명성: votes는 여전히 SELECT 정책 없음(클라가 '누가 누구를 찍었는지' 못 읽음).
--         집계는 DEFINER 함수만. 결과엔 자리별 '득표수'만 공개한다.
--
-- ⚠️ v1(20260523000000_exposed.sql) 적용 이후 실행.
-- ============================================================

-- ============================================================
-- 1. votes 구조 변경 (fold/pass → 지목 대상)
-- ============================================================
TRUNCATE TABLE public.exposed_votes;  -- v1 fold/pass 잔여(테스트) 데이터 정리

ALTER TABLE public.exposed_votes DROP COLUMN IF EXISTS vote;
ALTER TABLE public.exposed_votes ADD COLUMN IF NOT EXISTS target_session_id text;
ALTER TABLE public.exposed_votes ADD COLUMN IF NOT EXISTS target_seat_label text;

-- ============================================================
-- 2. 사연 제출 RPC 폐지
-- ============================================================
DROP FUNCTION IF EXISTS public.exposed_submit_question(uuid, text, text);

-- ============================================================
-- 3. exposed_cast_vote 교체 — 다른 참가자 1명 지목
--   - phase_vote + 현재 라운드에서만. 1인 1표.
--   - 자기 자신 지목 불가. 대상은 방 참가자여야 함.
--   - 선택(누구를 찍었는지)은 잠긴 votes 테이블로만. room에는 '여부'만.
-- ============================================================
DROP FUNCTION IF EXISTS public.exposed_cast_vote(uuid, text, int, text);

CREATE OR REPLACE FUNCTION public.exposed_cast_vote(
  p_room_id uuid,
  p_session_id text,
  p_round int,
  p_target_session_id text,
  p_target_seat_label text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_room public.exposed_rooms;
  v_is_player boolean;
  v_is_target boolean;
BEGIN
  SELECT * INTO v_room FROM public.exposed_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR v_room.status <> 'phase_vote' OR v_room.current_round <> p_round THEN
    RETURN;
  END IF;

  -- 자기 자신은 지목 불가
  IF p_target_session_id = p_session_id THEN
    RETURN;
  END IF;

  -- 투표자/대상 모두 방 참가자여야 함
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_room.players) p
    WHERE p->>'session_id' = p_session_id
  ) INTO v_is_player;
  IF NOT v_is_player THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_room.players) p
    WHERE p->>'session_id' = p_target_session_id
  ) INTO v_is_target;
  IF NOT v_is_target THEN
    RETURN;
  END IF;

  INSERT INTO public.exposed_votes
    (room_id, round_number, session_id, target_session_id, target_seat_label)
  VALUES
    (p_room_id, p_round, p_session_id, p_target_session_id, p_target_seat_label)
  ON CONFLICT (room_id, round_number, session_id) DO NOTHING;

  IF NOT (v_room.voted_sessions ? p_session_id) THEN
    UPDATE public.exposed_rooms
    SET voted_sessions = v_room.voted_sessions || to_jsonb(p_session_id)
    WHERE id = p_room_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exposed_cast_vote(uuid, text, int, text, text) TO anon, authenticated;

-- ============================================================
-- 4. exposed_tally_round 교체 — 최다 득표자(벌칙자)
--   - phase_vote 에서만 (멱등: phase_result 로 바뀌면 재호출 무시).
--   - 자리별 득표수 집계 → 최다 득표 자리(동률이면 복수) 발표.
--   - 라이프 차감/탈락 없음. 매 라운드 벌칙자만 가린다.
--   - last_round_result: { round, counts:[{seat_label,votes}], top_seats:[..], top_votes, total_votes }
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
  v_counts jsonb;
  v_top int;
  v_top_seats jsonb;
  v_total int;
BEGIN
  SELECT * INTO v_room FROM public.exposed_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR v_room.status <> 'phase_vote' OR v_room.current_round <> p_round THEN
    RETURN;
  END IF;

  WITH tally AS (
    SELECT target_seat_label AS seat, COUNT(*)::int AS votes
    FROM public.exposed_votes
    WHERE room_id = p_room_id AND round_number = p_round
    GROUP BY target_seat_label
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object('seat_label', seat, 'votes', votes)
        ORDER BY votes DESC
      ),
      '[]'::jsonb
    ),
    COALESCE(MAX(votes), 0),
    COALESCE(SUM(votes), 0)::int
  INTO v_counts, v_top, v_total
  FROM tally;

  -- 최다 득표 자리들 (동률 가능, 0표뿐이면 빈 배열)
  SELECT COALESCE(jsonb_agg(elem->>'seat_label'), '[]'::jsonb)
  INTO v_top_seats
  FROM jsonb_array_elements(v_counts) elem
  WHERE (elem->>'votes')::int = v_top AND v_top > 0;

  UPDATE public.exposed_rooms
  SET
    status = 'phase_result',
    last_round_result = jsonb_build_object(
      'round', p_round,
      'counts', v_counts,
      'top_seats', v_top_seats,
      'top_votes', v_top,
      'total_votes', v_total
    )
  WHERE id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exposed_tally_round(uuid, int) TO anon, authenticated;

-- ============================================================
-- 적용 후 점검
--
--   \d public.exposed_votes
--   -- vote 컬럼 없음, target_session_id / target_seat_label 있음
--
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema='public' AND routine_name='exposed_submit_question';
--   -- 0행 (폐지됨)
--
--   SELECT proname, pg_get_function_identity_arguments(oid)
--   FROM pg_proc WHERE proname IN ('exposed_cast_vote','exposed_tally_round');
--   -- cast_vote 인자 5개(uuid,text,int,text,text), tally 인자 2개
--
--   SELECT polcmd FROM pg_policy WHERE polrelid='public.exposed_votes'::regclass;
--   -- INSERT(a) 하나만 — SELECT 정책 없음(익명 유지)
-- ============================================================

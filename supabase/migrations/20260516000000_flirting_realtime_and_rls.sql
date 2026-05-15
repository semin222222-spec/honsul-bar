-- ============================================================
-- 이구동성 플러팅 게임: Realtime publication + RLS 정상화
--
-- 배경:
--   useFlirtingGame은 postgres_changes로 두 테이블을 구독한다.
--     - flirting_games (INSERT/UPDATE): 신청 수신, 라운드/상태 변경
--     - flirting_choices (INSERT): 라운드별 a/b 선택
--   둘 중 하나라도 supabase_realtime publication에 빠져 있으면
--   DB INSERT는 되어도 상대 폰에 신청 모달이 안 뜬다.
--   또한 RLS가 enable인데 anon SELECT를 막으면 realtime row도 차단된다.
--
-- 이 파일은 "신청은 들어가는데 상대가 받지 못함" 증상을 잡는다.
-- 코드 쪽 두 버그(채팅 fallback store_id, isMe 좌석 오인식)는 이미
-- be9b3ed / 9102f39 에서 별도로 수정되었다.
-- ============================================================

-- 1. publication에 두 테이블 추가 (이미 있으면 무시)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.flirting_games;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.flirting_choices;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. RLS enable + anon/authenticated 전체 허용 정책
--    이 앱은 anon key + 세션 id로 식별하고 row 단위 권한은 앱 코드가
--    검증한다 (e.g. invitee_session_id eq filter, gameRepository의 .eq).
--    JWT custom claim으로 session_id가 들어오면 그때 정책을 좁힐 수 있다.
ALTER TABLE public.flirting_games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS flirting_games_anon_all ON public.flirting_games;
CREATE POLICY flirting_games_anon_all
  ON public.flirting_games
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.flirting_choices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS flirting_choices_anon_all ON public.flirting_choices;
CREATE POLICY flirting_choices_anon_all
  ON public.flirting_choices
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 적용 후 점검
--
--   SELECT relname, relrowsecurity
--   FROM pg_class
--   WHERE relname IN ('flirting_games', 'flirting_choices');
--   -- relrowsecurity 가 둘 다 t
--
--   SELECT tablename
--   FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime'
--     AND tablename IN ('flirting_games', 'flirting_choices');
--   -- 둘 다 결과에 나옴
-- ============================================================

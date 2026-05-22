-- ============================================================
-- 라운지(chat_messages): 사장님 글 작성 + 위변조 방지 RLS
--
-- 목적:
--   손님(anon)과 사장님(로그인=authenticated)이 같은 chat_messages 테이블에서
--   실시간으로 대화한다. 사장님 글은 author_type='owner'로만 구분하며,
--   RLS로 "owner 글은 인증된 그 매장 사장님만 INSERT 가능"을 강제한다.
--   (닉네임만으로는 절대 구분하지 않는다 → 손님 위변조 차단)
--
-- 전제(앱 구조):
--   - 데이터 client는 로그인한 사장님이면 사장님 JWT, 손님이면 anon key를 보낸다
--     (src/shared/api/supabaseClient.js). 따라서 auth.uid()로 사장/손님 구분 가능.
--   - 매장 소유: store_owners(user_id=auth.uid()) → stores(owner_id, id=store_id)
--
-- ⚠️ 운영 DB 라이브 테이블이다. 적용 순서를 지키고, 적용 후 검증 쿼리를 돌려라.
--    가능하면 스테이징에 먼저 적용하고 손님 글쓰기/사장님 글쓰기를 확인할 것.
-- ============================================================

-- ── 0. 적용 전 현재 정책 확인 (실행해서 눈으로 보기) ──────────
--   SELECT policyname, cmd, roles, qual, with_check
--   FROM pg_policies
--   WHERE schemaname='public' AND tablename='chat_messages';
--   → permissive한 FOR ALL / WITH CHECK(true) 정책이 있으면 아래 1번에서 전부 정리된다.

-- ── 1. author_type 컬럼 추가 ────────────────────────────────
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS author_type TEXT NOT NULL DEFAULT 'customer';

DO $$
BEGIN
  ALTER TABLE public.chat_messages
    ADD CONSTRAINT chat_messages_author_type_check
    CHECK (author_type IN ('customer', 'owner'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. 사장님 글은 세션/자리가 없다 → 두 컬럼 NULL 허용 ──────
--    (이미 nullable이면 no-op)
ALTER TABLE public.chat_messages ALTER COLUMN session_id DROP NOT NULL;
ALTER TABLE public.chat_messages ALTER COLUMN seat_label DROP NOT NULL;

-- ── 3. 조회 인덱스 (store_id + 최신순) ──────────────────────
CREATE INDEX IF NOT EXISTS chat_messages_store_created_idx
  ON public.chat_messages (store_id, created_at DESC);

-- ── 4. Realtime publication 보장 (이미 있으면 무시) ─────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 5. RLS 재정비 (기존 정책 전부 제거 후 보안 정책 재생성) ──
--    여러 permissive 정책은 OR로 합쳐지므로, 느슨한 기존 정책이 하나라도
--    남으면 위변조가 가능하다. 그래서 이 테이블의 정책을 싹 비우고 다시 만든다.
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_messages', pol.policyname);
  END LOOP;
END $$;

-- 5-1. 읽기: 모두 공개 (현행 유지 — 라운지는 모두 공개)
CREATE POLICY chat_messages_select_all
  ON public.chat_messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5-2. 손님 글 작성: anon/authenticated 모두 가능하되 author_type='customer'만
CREATE POLICY chat_messages_insert_customer
  ON public.chat_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (author_type = 'customer');

-- 5-3. 사장님 글 작성: 로그인 사용자가 '자기 매장'에 owner 글만
CREATE POLICY chat_messages_insert_owner
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_type = 'owner'
    AND store_id IN (
      SELECT s.id
      FROM public.stores s
      JOIN public.store_owners o ON o.id = s.owner_id
      WHERE o.user_id = auth.uid()
    )
  );

-- 5-4. 삭제(모더레이션): 자기 매장 사장님만. (앱 UI는 아직 없음 — 미래용 + 더 안전)
--      이전엔 느슨한 정책으로 anon 삭제가 가능했을 수 있으나, 삭제 UI가 없어
--      손님 기능에 영향 없음. 손님 삭제는 막힌다.
CREATE POLICY chat_messages_delete_owner
  ON public.chat_messages
  FOR DELETE
  TO authenticated
  USING (
    store_id IN (
      SELECT s.id
      FROM public.stores s
      JOIN public.store_owners o ON o.id = s.owner_id
      WHERE o.user_id = auth.uid()
    )
  );

-- ============================================================
-- 적용 후 검증
--
-- (a) RLS on:
--   SELECT relrowsecurity FROM pg_class WHERE relname='chat_messages';  -- t
--
-- (b) 정책 4개 확인:
--   SELECT policyname, cmd, roles FROM pg_policies
--   WHERE schemaname='public' AND tablename='chat_messages';
--
-- (c) publication 포함:
--   SELECT tablename FROM pg_publication_tables
--   WHERE pubname='supabase_realtime' AND tablename='chat_messages';
--
-- (d) 손님 위변조 차단 확인 (anon 키로):
--   author_type='owner' INSERT → RLS 위반으로 거부되어야 정상.
--
-- (e) 손님 정상 글쓰기, 사장님(로그인) owner 글쓰기 둘 다 동작 확인.
-- ============================================================

# Supabase 운영 가이드

이 프로젝트는 Prisma를 사용하지 않는다. 앱 코드는 `@supabase/supabase-js`를 사용하지만, 직접 호출은 `src/repositories/`와 `src/shared/api/supabaseClient.js`로 제한한다.

현재 저장소에는 `supabase/` 디렉터리와 마이그레이션 파일이 없다. 따라서 지금 기준의 DB 스키마 원본은 원격 Supabase 프로젝트에 있을 가능성이 높다. 앞으로는 Supabase CLI 마이그레이션을 기준으로 스키마 변경 이력을 저장소에 남긴다.

## 현재 프로젝트 기준

- 프론트엔드: Vite + React SPA
- Supabase 클라이언트: `src/shared/api/supabaseClient.js`
- Supabase 접근 경계: `src/repositories/`
- 환경 변수:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- 주요 사용 영역:
  - Auth: 사장님 로그인, 매장 소유자 확인
  - Postgres: 주문, 세션, 좌석, 메뉴, 재고, 메시지, 게임
  - Realtime: 주문판, 좌석/세션/메시지/메뉴 변경 구독
  - Storage: `menu-images` 버킷
  - RPC: 재고 조정, SOS 처리, 메시지 카운터 증가

`features`, `pages`, `services`, `shared/lib`, `shared/store`에서는 Supabase client를 직접 import하지 않는다. 새 DB/RPC/Realtime/Storage 작업은 도메인별 `src/repositories/<domain>/` 함수로 만든 뒤 hook/service에서 호출한다.

## CLI 도입 원칙

Supabase 스키마 변경은 Dashboard에서만 끝내지 않는다. Dashboard에서 만든 변경도 CLI로 마이그레이션 파일을 만들어 저장소에 남긴다.

권장 설치 방식:

```bash
npm install supabase --save-dev
npx supabase --version
```

초기화:

```bash
npx supabase init
```

원격 프로젝트 연결:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
```

이미 원격 DB가 있는 프로젝트를 처음 CLI로 가져올 때:

```bash
npx supabase db pull initial_remote_schema
```

생성된 `supabase/migrations/*.sql`은 반드시 리뷰한다. 자동 생성 SQL에 RLS, 권한, 함수 `search_path`, Storage 정책이 빠져 있거나 느슨하게 들어갈 수 있다.

## 로컬 개발 흐름

로컬 Supabase 스택은 Docker 호환 런타임이 필요하다.

```bash
npx supabase start
```

명령 출력에 로컬 API URL과 anon key가 표시된다. 로컬에서 원격 프로젝트 대신 로컬 Supabase를 쓰려면 `.env.local`에 로컬 값을 넣는다. `.env.local`은 커밋하지 않는다.

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local-anon-key>
```

로컬 DB를 마이그레이션 기준으로 재생성:

```bash
npx supabase db reset
```

앱 실행:

```bash
npm run dev
```

## 스키마 변경 절차

새 테이블, 컬럼, 인덱스, 함수, 정책, Storage 정책을 바꿀 때는 다음 순서를 지킨다.

1. 마이그레이션 생성

```bash
npx supabase migration new <change_name>
```

2. 생성된 SQL 파일에 변경사항 작성

```text
supabase/migrations/<timestamp>_<change_name>.sql
```

3. 로컬에서 적용 확인

```bash
npx supabase db reset
```

4. 원격 적용 전 dry run

```bash
npx supabase db push --dry-run
```

5. 원격 적용

```bash
npx supabase db push
```

운영 DB에는 바로 적용하지 않는다. 가능하면 개발/스테이징 프로젝트에 먼저 적용하고 앱 동작을 확인한 뒤 운영에 반영한다.

## Dashboard 변경 시

긴급하게 Supabase Dashboard 또는 SQL Editor에서 직접 수정했다면 그 상태를 방치하지 않는다.

```bash
npx supabase db pull <dashboard_change_name>
```

그 다음 생성된 마이그레이션을 리뷰하고 커밋한다. 원격 DB와 로컬 마이그레이션 이력이 어긋났다는 이유만으로 `migration repair`를 먼저 실행하지 않는다. 원인과 실제 적용 상태를 확인한 뒤 사용한다.

## 반드시 지킬 보안 규칙

### 키와 환경 변수

- `service_role`, `sb_secret_*`, DB 비밀번호, 개인 access token은 브라우저 코드, `VITE_*` 환경 변수, Git, 문서, 이슈, 채팅에 절대 넣지 않는다.
- `VITE_SUPABASE_ANON_KEY`에는 공개 가능한 저권한 클라이언트 키만 넣는다. 이름이 `ANON_KEY`여도 권한은 RLS 정책으로 제한되어야 한다.
- Vercel에도 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`만 넣는다.
- 키가 노출되면 즉시 Supabase에서 키를 회전하고, 배포 환경 변수를 갱신하고, 노출 경로를 제거한다.
- `.env`, `.env.local`, `supabase/.temp/`, DB dump, 실제 운영 seed 데이터는 커밋하지 않는다.

### RLS와 권한

- 외부에서 접근 가능한 모든 테이블은 RLS를 켠다.
- 새 테이블을 만들 때 `alter table ... enable row level security;`와 필요한 policy를 같은 마이그레이션에 넣는다.
- `anon`/`authenticated`에 대한 `using (true)` 또는 `with check (true)`는 공개 읽기처럼 의도된 경우에만 허용한다.
- 쓰기 정책은 반드시 `store_id`, `auth.uid()`, 소유자 매핑, 세션 소유 조건 중 하나로 제한한다.
- 프론트 라우트 보호(`ProtectedRoute`)는 보안 경계가 아니다. 최종 권한은 DB RLS와 RPC에서 검증한다.
- 매장 데이터는 항상 `store_id` 또는 `storeSlug`로 격리한다. 다른 매장 데이터가 조회되는 쿼리나 정책은 배포 금지다.

### RPC 함수

이 프로젝트는 재고와 카운터성 업데이트에 RPC를 사용한다.

- `restock_ingredient`
- `adjust_ingredient_stock`
- `create_ingredient`
- `update_ingredient`
- `delete_ingredient_safe`
- `restore_ingredient`
- `resolve_sos`
- `increment_hearts`
- `increment_curious`

RPC는 원자성, 권한, 동시성이 중요한 경계다. 프론트에서 여러 쿼리로 재구현하지 않는다.

RPC를 만들거나 수정할 때:

- 입력값을 함수 내부에서 다시 검증한다.
- 매장 스코프를 함수 내부에서 확인한다.
- `security definer`를 쓰는 함수는 `set search_path`를 명시하고, 필요한 테이블/함수는 스키마를 붙여 참조한다.
- 관리자 전용 함수는 `auth.uid()`와 `store_owners` 매핑으로 권한을 확인한다.
- 동적 SQL은 피한다. 불가피하면 식별자와 값을 안전하게 quote/parameter 처리한다.

### Storage

현재 메뉴 이미지는 `menu-images` 버킷을 사용한다.

- 업로드 파일은 MIME, 확장자, 크기를 클라이언트와 Storage 정책 양쪽에서 제한한다.
- 파일 경로는 `store_id/...` 형태로 매장 스코프를 포함한다.
- 업로드/삭제는 해당 매장 소유자만 가능해야 한다.
- 공개 버킷을 쓰더라도 쓰기 권한은 공개하지 않는다.
- 운영 이미지 URL에서 경로를 파싱해 삭제할 때는 버킷과 store scope를 다시 확인한다.

### Realtime

Realtime은 알림/동기화 수단이지 권한 모델이 아니다.

- 구독 필터는 가능한 한 `store_id`, `session_id`, `seat_label` 등으로 좁힌다.
- 구독 성공 여부와 무관하게 중요한 화면은 refetch 경계를 유지한다.
- `removeChannel` cleanup을 누락하지 않는다.
- Realtime payload에 민감정보를 싣는 설계를 피한다.

### 데이터와 로그

- 운영 DB dump를 저장소에 넣지 않는다.
- seed 데이터가 필요하면 익명화된 샘플만 둔다.
- 콘솔 로그, 에러 리포트, PR 본문에 토큰, 세션, 인증 헤더, 고객 식별자를 그대로 남기지 않는다.
- 결제, 정산, 주문 상태처럼 운영에 영향을 주는 변경은 테스트 또는 수동 검증 결과를 남긴다.

## 마이그레이션 리뷰 체크리스트

- [ ] 새 테이블에 RLS가 켜져 있다.
- [ ] `anon`/`authenticated` 권한이 최소 권한이다.
- [ ] 모든 매장 데이터 정책에 `store_id` 또는 소유자 검증이 있다.
- [ ] 쓰기 정책에 `with check`가 있다.
- [ ] 관리자 전용 작업은 `auth.uid()`와 `store_owners`로 검증한다.
- [ ] RPC 함수는 입력 검증, 권한 검증, `search_path`를 포함한다.
- [ ] Storage 정책은 버킷, 경로, 업로드 주체를 제한한다.
- [ ] 인덱스가 필요한 조회 조건(`store_id`, `session_id`, `created_at`, 상태값)에 맞게 존재한다.
- [ ] 운영 적용 전 `npx supabase db push --dry-run`을 확인했다.
- [ ] 앱 검증으로 `npm run lint`, `npm run build`, 관련 테스트를 실행했다.

## 사고 대응

키 또는 DB 비밀번호가 노출된 경우:

1. Supabase에서 해당 키를 즉시 회전한다.
2. Vercel과 로컬 `.env*`를 새 값으로 교체한다.
3. 노출된 커밋, 문서, 이슈, 로그 위치를 확인해 제거한다.
4. 공개 저장소에 올라간 경우 Git 히스토리 정리와 캐시 무효화를 별도로 진행한다.
5. 노출 시간대의 Supabase 로그를 확인한다.

RLS 누락 또는 과도한 공개 정책이 발견된 경우:

1. 문제 정책을 막는 긴급 마이그레이션을 먼저 만든다.
2. 영향 테이블과 노출 가능 데이터를 확인한다.
3. 필요한 경우 키를 회전하고 세션을 무효화한다.
4. 회귀 테스트 또는 수동 검증 시나리오를 추가한다.

## 공식 문서

- Supabase CLI: https://supabase.com/docs/reference/cli/supabase-init
- Local Development & CLI: https://supabase.com/docs/guides/local-development
- Database Migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- API Keys: https://supabase.com/docs/guides/api/api-keys
- Storage Access Control: https://supabase.com/docs/guides/storage/security/access-control

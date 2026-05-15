# Honsul Bar

혼술 바 매장을 위한 모바일 우선 운영 앱이다.

## 제품 이해

- 손님은 QR 또는 매장 URL로 들어와 좌석을 선택하고 주문, 소셜 시그널, 게임, SOS 요청을 사용한다.
- 사장님은 주문 처리, 좌석/세션 관리, 메뉴/옵션 관리, 재고, 매출, QR 출력을 관리한다.
- 데이터와 실시간 동기화는 Supabase를 중심으로 한다.
- 한국어와 일본어 경험을 함께 유지한다.

## 기술 스택

- Vite + React 19
- React Router
- Supabase Auth, Postgres, Realtime, Storage, RPC
- Framer Motion
- Lucide React
- Recharts
- dnd-kit
- ESLint flat config
- Feature-first UI + service/repository 3레이어 구조

## 주요 기능

- 매장별 라우팅: `/:storeSlug`, `/:storeSlug/admin`, `/:storeSlug/qr`
- 사장님 인증: Supabase Auth + `store_owners`/`stores` 매핑
- 손님 세션: 좌석 선택, 세션 복구, 좌석 이동/정산 반영
- 주문: 메뉴/옵션/수량 주문, 주문 상태 변경, 실시간 주문판
- 좌석 운영: 좌석 행 관리, 플로어 배치, 합석/이동/비우기
- 메뉴 운영: 카테고리, 메뉴, 옵션, 이미지 업로드, 일본어 번역 보조
- 재고 운영: 재료 CRUD, 입고/조정, 재고 이력, 부족 재료 표시
- 매출 통계: 일/주/월 매출, 시간대 매출, 인기 메뉴, 월별 히스토리
- 소셜 기능: Presence, 토크월, 플러팅 게임, 더 나인 게임, SOS 신호
- 다국어: 한국어/일본어

## 실행과 검증

로컬 실행:

```bash
npm install
npm run dev
```

기본 개발 서버는 Vite가 출력하는 로컬 URL을 사용한다.

기본 명령:

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
npm run preview
```

작업 완료 전 기본 순서:

1. 변경 범위 확인
2. 관련 코드/문서 읽기
3. 최소 변경
4. 변경 성격에 맞는 검증 실행: `npm test`, `npm run lint`, `npm run build`
5. 실패한 검증이 있으면 실패 원인과 남은 리스크 보고

작업 흐름의 원본 기준은 `WORKFLOW.md`, 커밋 전 게이트는 `GIT.md`를 따른다.

## 환경 변수와 보안

로컬 환경 변수는 `.env`에 둔다. `.env`는 커밋하지 않는다.

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

브라우저 앱에 service role key, 관리자 키, 비공개 토큰을 넣지 않는다. Supabase anon key는 공개 클라이언트 키지만, RLS와 권한 정책이 전제다. 권한이 필요한 작업은 프론트 라우팅만 믿지 말고 DB 정책과 RPC 경계를 함께 고려한다.

Supabase CLI, 마이그레이션, RLS/RPC/Storage 보안 기준은 `SUPABASE.md`를 따른다.

## 소스 구조

```text
src/
  app/                 # 앱 엔트리, 라우트 가드
  pages/               # 라우트 단위 화면(customer/admin/auth/qr)
  features/            # 도메인별 UI, hooks, data
  services/            # 도메인 규칙과 use case
  repositories/        # Supabase DB/RPC/Realtime/Storage 접근
  shared/              # Supabase client, realtime, i18n, store, 공용 UI/lib
  assets/              # 정적 이미지
```

프론트 코드는 3레이어 기준을 따른다. `features`와 `pages`는 화면 상태와 사용자 이벤트를 맡고, 비즈니스 규칙은 `src/services/<domain>/`, Supabase 접근은 `src/repositories/<domain>/`에 둔다. `@supabase/supabase-js` 직접 import는 `src/repositories/`와 `src/shared/api/supabaseClient.js`로 제한한다.

주요 feature:

- `features/orders`: 손님/관리자 주문, 수동 주문 모달
- `features/sessions`: 손님 세션 복구, 좌석 이동, 합석, 정산
- `features/seats`: 좌석 행, 좌석 선택, 좌석맵, 플로어 플랜
- `features/menus`: 메뉴/카테고리/옵션 조회와 관리자 패널
- `features/sos`: SOS 전송/관리자 수신
- `features/messages`: 토크월 메시지
- `features/games`: 공통 게임 UI, 스태킹, 더 나인, 플러팅
- `features/inventory`: 재고 관리
- `features/sales`: 매출 통계와 월별 히스토리
- `features/presence`: 손님 presence, 라운지, 프로필
- `features/auth`: 사장님 인증

## 문서

- [docs/README.md](docs/README.md): 문서 인덱스
- [docs/architecture.md](docs/architecture.md): 앱 구조와 데이터 흐름
- [docs/react-standards.md](docs/react-standards.md): React/repository/Realtime 개발 기준
- [docs/library-review.md](docs/library-review.md): 의존성 현황과 추천 라이브러리
- [WORKFLOW.md](WORKFLOW.md): Red-Green-Verify 기반 작업 흐름
- [GIT.md](GIT.md): 커밋 전 테스트, 오류, 보안 점검 기준
- [SUPABASE.md](SUPABASE.md): Supabase CLI, 마이그레이션, 보안 기준
- [AGENTS.md](AGENTS.md): AI 에이전트 작업 규칙
- [CLAUDE.md](CLAUDE.md): Claude 작업 컨텍스트

## 개발 기준 요약

상세 기준은 원본 문서에서 관리한다.

- 구조와 데이터 흐름: `docs/architecture.md`
- React, hook, Realtime 구현: `docs/react-standards.md`
- Supabase CLI와 보안: `SUPABASE.md`
- TDD와 검증 흐름: `WORKFLOW.md`
- 의존성 판단: `docs/library-review.md`

## 배포

`vercel.json`은 모든 경로를 `/`로 rewrite해 SPA 라우팅을 지원한다. Vercel 환경 변수에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 설정해야 한다.

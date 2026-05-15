# Library Review

검토일: 2026-05-15

## 현재 의존성

`package-lock.json` 기준 주요 버전:

| 패키지 | 버전 | 용도 | 판단 |
| --- | ---: | --- | --- |
| `react` / `react-dom` | 19.2.5 | UI | 최신 세대 사용 중 |
| `react-router-dom` | 7.14.2 | SPA 라우팅 | 현재 구조에 충분 |
| `@supabase/supabase-js` | 2.103.3 | DB/Auth/Realtime/Storage | 핵심 의존성 |
| `framer-motion` | 12.38.0 | 애니메이션 | 이미 충분 |
| `lucide-react` | 1.8.0 | 아이콘 | 이미 충분 |
| `recharts` | 3.8.1 | 매출 차트 | 관리자 통계에 적합 |
| `@dnd-kit/*` | core 6.3.1, sortable 10.0.0, utilities 3.2.2 | 드래그/정렬 | 좌석/메뉴 정렬에 적합 |
| `vite` | 8.0.8 | 빌드 도구 | 현재 구조에 충분 |

`npm audit --omit=dev` 결과 production 취약점은 0개였다.

`node_modules`가 없는 상태에서 `npm outdated --long`을 실행하면 전체 패키지가 `MISSING`으로 표시된다. registry 기준으로 React, React DOM, React Router, Supabase, Lucide는 현재 범위 안에서 더 높은 패치/마이너가 확인됐다. 설치 시 `package-lock.json` 갱신 여부를 의식해야 한다.

## 현재 구조와 의존성 판단

코드는 feature-first UI 구조에 3레이어를 얹은 상태다. 화면 상태와 사용자 이벤트는 `src/features/*/hooks/`, 도메인 규칙은 `src/services/*/`, Supabase DB/RPC/Realtime/Storage 접근은 `src/repositories/*/`에 둔다.

이 구조에서는 라이브러리도 도메인별로 점진 적용하는 편이 안전하다. 예를 들어 React Query는 `repositories/menus` 또는 `repositories/orders`를 query function 경계로 삼아 `features/menus`, `features/orders` hook부터 적용하고, 폼 검증은 `features/menus`, `features/inventory`, `features/auth`부터 적용한다.

## 우선 도입 추천

### 1. `@tanstack/react-query`

가장 효율이 높다.

현재 hooks가 `loading/error/refetch`, Realtime 이벤트 후 재조회, 중복 fetch를 직접 관리한다. React Query를 도입하면 `src/repositories/*` 함수를 query/mutation 경계로 삼아 서버 상태 캐싱, invalidation, stale time, retry, background refetch를 표준화할 수 있다.

우선 적용 후보:

- `useMenus`
- `useMenuOptionsCustomer`
- `useOrders`
- `useOrdersAdmin`
- `useSessionsAdmin`
- `useSalesStats`
- `useInventory`

도입 방식은 한 번에 전체 전환보다 도메인별 점진 전환이 낫다.

### 2. `react-hook-form` + `zod` + `@hookform/resolvers`

관리자 폼과 가입 폼에 즉시 효과가 크다.

현재 가격, 수량, slug, 좌석 수, 재고 조정 사유 같은 검증이 컴포넌트 안에 흩어져 있다. 스키마를 두면 저장 직전 payload 검증, 필드 오류 표시, 테스트가 쉬워진다.

우선 적용 후보:

- `SignupPage`
- `MenuAdminPanel`
- `SeatRowsAdminPanel`
- `InventoryAdminPanel`
- `ManualOrderModal`

### 3. `vitest` + `@testing-library/react` + `@testing-library/jest-dom` + `msw`

현재 앱 규모에 비해 테스트 기반이 부족하다. Vite 앱에서는 Vitest가 가장 자연스럽다. Supabase 호출은 repository mock, MSW, 또는 mock client로 격리한다.

현재는 Node test runner 기반 `npm test`가 있으며, 루트 `__tests__/`에서 서비스 로직, Realtime 복구, 매장 스코프, 번역/사운드 유틸, i18n 구조, 플러팅 질문 데이터, repository 계약, `src` 레이어 경계를 검증한다. React 컴포넌트/훅 상호작용 테스트가 늘어나면 Vitest로 전환하거나 병행하는 것이 낫다.

우선 테스트 후보:

- 세션 복구/좌석 이동
- 주문 수량/옵션 가격 계산
- 매출 통계 날짜 범위
- 재고 RPC 성공/실패 처리
- 번역 fallback

### 4. `date-fns`

매출 통계와 영업일 계산이 커지면 필요하다.

현재 `useSalesStats`는 직접 `Date`를 조작한다. 바 운영은 자정 이후 영업, 주 시작 기준, 타임존 문제가 생기기 쉽다. 영업일 기준이 명확해지는 순간 도입 가치가 높다.

### 5. `react-error-boundary` + `sonner`

현장 운영 앱은 실패 상태가 중요하다.

- `react-error-boundary`: 화면 단위 장애 격리
- `sonner`: `alert`/`confirm` 의존도를 줄이는 토스트

확인/삭제처럼 되돌리기 어려운 행동은 토스트만으로 처리하지 말고 앱 내부 confirm modal을 유지한다.

## 조건부 도입

| 라이브러리 | 조건 |
| --- | --- |
| `@tanstack/react-virtual` | 관리자 목록/주문/재고가 수백 행 이상으로 커질 때 |
| `@sentry/react` | 실제 매장 운영 중 클라이언트 오류 추적이 필요할 때 |
| `zustand` | 서버 상태가 아닌 전역 UI 상태가 명확히 늘어날 때 |
| `react-i18next` | 번역 리소스가 대형화되거나 동적 로딩/복수 언어가 늘어날 때 |

## 지금은 비추천

- Redux: 현재 문제는 서버 상태 캐싱이지 전역 클라이언트 상태가 아니다.
- 대형 UI 프레임워크: 기존 앱의 강한 비주얼/모바일 경험과 충돌 가능성이 높다.
- 새 애니메이션 라이브러리: Framer Motion으로 충분하다.
- GraphQL client: Supabase repository 경계가 이미 있어 이득이 작다.

## 추천 적용 순서

1. 테스트 스택과 핵심 순수 로직 테스트 기반을 먼저 만든다.
2. `react-hook-form` + `zod`를 가입/관리자 폼부터 적용한다.
3. `@tanstack/react-query`를 메뉴/주문처럼 반복 fetch가 많은 도메인부터 점진 적용한다.
4. 날짜 요구사항을 정리한 뒤 `date-fns`로 매출 기준일을 표준화한다.
5. alert/confirm을 토스트와 내부 confirm modal로 정리한다.

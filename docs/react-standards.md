# React Standards

이 문서는 새 기능과 리팩터링에서 지킬 기준이다. 현재 코드의 모든 예외를 즉시 고치라는 뜻은 아니다.

## 컴포넌트

- 컴포넌트는 렌더링 책임을 우선한다.
- DB 조회, Realtime 구독, Storage, RPC 호출은 `src/repositories/*/`로 분리한다.
- 도메인 규칙과 use case는 `src/services/*/`로 분리하고, hook은 화면 상태와 service/repository 연결을 맡는다.
- 한 파일이 300줄을 넘고 상태/이벤트/마크업이 섞이면 분리 후보로 본다.
- 화면 전용 작은 하위 컴포넌트는 같은 파일에 둘 수 있다.
- 같은 도메인에서만 쓰는 컴포넌트는 `src/features/*/components/`에 둔다.
- 여러 도메인에서 재사용되는 컴포넌트만 `src/shared/ui/`로 승격한다.

## 디렉터리와 Import

- 앱 엔트리와 라우트 가드는 `src/app/`에 둔다.
- 라우트 화면 조립은 `src/pages/`에 둔다.
- 도메인 화면/훅은 `src/features/<domain>/`에 둔다.
- 도메인 규칙은 `src/services/<domain>/`에 둔다.
- Supabase 접근은 `src/repositories/<domain>/`에 둔다.
- Supabase client, realtime 복구, i18n, store, 범용 유틸은 `src/shared/`에 둔다.
- import는 `@/...` alias를 우선한다.
- 새 코드에서 `src/components`, `src/hooks`, `src/lib` 같은 folder-by-type 구조를 되살리지 않는다.

## 상태 관리

- 서버 상태: Supabase 조회 결과, 주문, 세션, 메뉴, 재고, 통계
- 클라이언트 상태: 탭, 모달, 선택 항목, 입력값, 임시 UI 상태

서버 상태를 전역 store에 넣지 않는다. 같은 서버 상태가 여러 화면에서 반복되거나 캐싱/무효화가 필요하면 `@tanstack/react-query` 도입을 검토한다.

## Hooks

- hook 이름은 `useDomain` 형식을 따른다.
- hook은 `data`, `loading`, `error`, `refetch`, action 함수를 명확히 반환한다.
- Realtime을 구독하는 repository는 cleanup 함수를 반환하고, hook은 cleanup에서 그 함수를 반드시 호출한다.
- 비동기 effect에는 unmounted 이후 setState 방지 장치를 둔다.
- `eslint-disable react-hooks/exhaustive-deps`는 최후 수단이다. 사용 시 안전한 이유를 남긴다.
- Realtime 상태 콜백은 `handleRealtimeSubscribeStatus`를 우선 사용한다.

## Supabase

- `@supabase/supabase-js` 직접 import는 `src/repositories/`와 `src/shared/api/supabaseClient.js`로 제한한다.
- 매장 스코프 데이터는 `store_id` 필터를 기본으로 한다.
- URL 기반 매장 접근은 `storeSlug`와 DB의 `stores.slug`를 기준으로 확인한다.
- 관리자 페이지 접근은 `ProtectedRoute`와 RLS를 함께 전제로 한다.
- 사용자 입력을 그대로 insert/update하지 않는다. 새 폼은 스키마 검증을 우선한다.
- 재고/정산/카운터 증감처럼 원자성이 중요한 변경은 RPC를 사용한다.

## Realtime

- 채널 이름은 도메인과 스코프가 드러나게 만든다. 예: `orders-${sessionId}`, `menus-${storeId}`.
- 구독 콜백에서는 필요한 최소 상태만 갱신한다.
- 중복 이벤트 가능성을 고려해 id 기반 dedupe를 둔다.
- 네트워크 복구/탭 복귀 시 재조회할 수 있는 `refetch` 경계를 유지한다.
- Supabase Realtime 공통 복구는 `src/shared/realtime/realtimeHealth.js`에 둔다.
- 구독 성공 또는 복구 상태에서 누락 이벤트 보정을 위해 repository를 통해 서버 데이터를 다시 읽을 수 있어야 한다.

## 폼과 검증

- 필수값, 숫자 범위, slug, 가격, 수량은 UI와 저장 직전에서 모두 검증한다.
- 반복되는 폼은 `react-hook-form` + `zod` 도입 후보로 본다.
- 새 코드에서는 `alert`로 검증 실패를 처리하지 않는다. 필드 오류 또는 앱 내부 모달/토스트를 사용한다.

## 다국어

- 사용자에게 보이는 문자열은 한국어/일본어를 함께 고려한다.
- 정적 앱 문구는 `src/shared/i18n/translations.js`를 우선한다.
- DB 필드는 기존 패턴처럼 `name`/`name_ja`, `description`/`description_ja`를 사용한다.
- 로케일 선택은 `pickLocaleField`를 우선한다.

## 접근성

- 클릭 가능한 요소는 가능한 `button`을 사용한다.
- 입력에는 `label` 또는 접근 가능한 이름을 제공한다.
- 모달은 닫기 버튼, ESC, 포커스 복귀를 고려한다.
- 터치 타깃은 최소 44px를 기준으로 한다.
- 색상만으로 상태를 전달하지 않는다.

## 성능

- 큰 배열 필터/정렬/집계는 `useMemo`를 검토한다.
- 핸들러를 깊게 전달하거나 memoized child에 넘길 때 `useCallback`을 사용한다.
- 이미지 업로드는 크기/MIME 검증 후 처리한다.
- 관리자 대량 목록이 커지면 virtualization 도입을 검토한다.

## 테스트

- 비즈니스 로직, 상태 전이, 권한, 데이터 변환은 테스트 먼저 작성한다.
- 테스트 코드는 프로젝트 루트 `__tests__/`에 둔다.
- 구현 파일 옆이나 `src/` 하위에 새 `*.test.js` 파일을 만들지 않는다.
- `npm test`는 서비스/유틸 단위 테스트와 repository/레이어 계약 테스트를 함께 실행한다.
- 우선 테스트 대상:
  - 세션 복구와 좌석 이동
  - 주문 수량/옵션/가격 계산
  - 재고 입고/조정 결과
  - 매출 통계 날짜 범위
  - 다국어 필드 선택
- Vite React 앱 테스트 스택은 `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `msw`를 우선 검토한다.

## 변경 전 체크리스트

- 이 변경이 손님 화면, 사장님 화면, 둘 다 중 어디에 영향을 주는가?
- 매장 스코프가 유지되는가?
- Realtime cleanup이 있는가?
- 사용자 문구의 일본어 대응이 필요한가?
- 현장 운영 데이터가 잘못 생성될 가능성이 있는가?
- `npm run lint`와 `npm run build`가 통과하는가?
- `npm test`가 관련 테스트를 포함해 통과하는가?

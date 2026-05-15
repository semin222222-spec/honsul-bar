# Architecture

## 개요

Honsul Bar는 Vite 기반 React SPA다. 앱은 매장 slug를 URL 경계로 사용하고, Supabase가 인증, 데이터베이스, Realtime, Storage, RPC를 담당한다.

## 라우팅

| 경로 | 화면 | 인증 | 설명 |
| --- | --- | --- | --- |
| `/` | redirect | 없음 | `/honsul-main`으로 이동 |
| `/login` | `LoginPage` | 없음 | 사장님 로그인 |
| `/signup` | `SignupPage` | 없음 | 사장님 가입과 매장 생성 |
| `/admin` | `RedirectToOwnerStore` | 필요 | 로그인한 사장님의 매장 admin으로 이동 |
| `/:storeSlug` | `CustomerPage` | 없음 | 손님용 매장 화면 |
| `/:storeSlug/admin` | `AdminPage` | 필요 | 사장님 운영 화면 |
| `/:storeSlug/qr` | `QRPrintPage` | 필요 | QR 출력 |

라우팅은 `src/app/main.jsx`에 있다. `/:storeSlug` 하위 화면은 `StoreProvider`가 `stores.slug`를 조회한다.

## 계층

| 계층 | 경로 | 역할 |
| --- | --- | --- |
| app | `src/app/` | 앱 엔트리, Router, Provider, 보호 라우트 |
| pages | `src/pages/` | 라우트 단위 화면 조립 |
| features | `src/features/` | 도메인별 components/hooks/data |
| services | `src/services/` | 도메인 규칙과 use case |
| repositories | `src/repositories/` | Supabase query/RPC/Realtime channel 접근 |
| shared | `src/shared/` | Supabase client, Realtime, Store/Locale context, 공용 UI/lib |
| assets | `src/assets/` | 정적 이미지 |

## 3 Layer 적용 기준

운영 데이터에 영향을 주는 도메인은 다음 방향으로 점진 분리한다.

| 레이어 | 경로 | 책임 |
| --- | --- | --- |
| Presentation | `pages`, `features/*/components`, `features/*/hooks` | 화면 상태, 사용자 이벤트, Realtime 구독 연결 |
| Service | `services/*` | 수량/가격/상태 전이 같은 도메인 규칙, use case 조립 |
| Repository | `repositories/*` | Supabase query/RPC/Realtime channel 접근 |

새 비즈니스 로직은 UI 컴포넌트나 Supabase query 안에 직접 넣지 않고 service에서 단위 테스트한다. Supabase client를 직접 호출하는 코드는 repository에만 둔다.

## Feature 구조

```text
src/features/<domain>/
  components/   # 해당 도메인 UI
  hooks/        # 화면 상태와 service/repository 연결
  data/         # 정적 데이터 또는 도메인 상수

src/services/<domain>/      # 도메인 규칙과 use case
src/repositories/<domain>/  # Supabase query/RPC/Realtime channel
```

현재 Supabase 접근은 `src/repositories/`와 `src/shared/api/supabaseClient.js`로 제한한다. `features`, `pages`, `shared/lib`, `shared/store`에서 Supabase client를 직접 import하지 않는다.

현재 도메인:

| 도메인 | 경로 | 주요 책임 |
| --- | --- | --- |
| auth | `src/features/auth/` | 사장님 인증 |
| orders | `src/features/orders/` | 주문 조회/생성/처리, 수동 주문 |
| sessions | `src/features/sessions/` | 손님 세션, 좌석 이동, 합석, 정산 |
| seats | `src/features/seats/` | 좌석 행, 좌석 선택, 좌석맵, 플로어 플랜 |
| menus | `src/features/menus/` | 메뉴/카테고리/옵션, 관리자 메뉴 패널 |
| sos | `src/features/sos/` | SOS 전송과 관리자 수신 |
| messages | `src/features/messages/` | 토크월 메시지 |
| presence | `src/features/presence/` | Presence, 라운지, 프로필 |
| games | `src/features/games/` | 게임 허브, 랭킹, 스태킹, 더 나인, 플러팅 |
| inventory | `src/features/inventory/` | 재고와 재고 이력 |
| sales | `src/features/sales/` | 매출 통계와 월별 히스토리 |

`src/shared/`는 도메인을 몰라야 한다. 도메인 지식이 들어가는 순간 해당 `features/*`로 내려보낸다.

## 도메인 경계

주요 개념 도메인:

- Store: 매장 slug, 매장 정보, 매장별 데이터 격리
- Auth: 사장님 로그인, 매장 소유자 확인, 보호 라우트
- Session: 좌석 입장, 재입장 복구, 좌석 이동, 정산/닫힘
- Orders: 손님 주문, 관리자 주문 처리, 주문 상태
- Seats: 좌석 행, 플로어 배치, 점유 상태
- Menu: 카테고리, 메뉴, 옵션, 이미지, 다국어 필드
- Inventory: 재료, 입고, 조정, 재고 이력
- Sales: 일/주/월 매출, 시간대 매출, 인기 메뉴
- Social: Presence, 메시지, 플러팅, 게임, SOS

도메인 규칙은 UI에 흩뿌리지 않는다. 재사용되거나 운영 데이터에 영향을 주는 판단은 service에 모으고, 원자성/권한이 중요한 DB 변경은 repository를 통해 RPC를 호출한다.

현재 코드 위치:

- Auth: `src/features/auth`
- Session: `src/features/sessions`
- Orders: `src/features/orders`
- Seats: `src/features/seats`
- Menu: `src/features/menus`
- Inventory: `src/features/inventory`
- Sales: `src/features/sales`
- Presence: `src/features/presence`
- Messages: `src/features/messages`
- SOS: `src/features/sos`
- Games: `src/features/games`

도메인별 Supabase 접근은 `src/repositories/<domain>`에 둔다. 도메인별 비즈니스 규칙과 use case는 필요할 때 `src/services/<domain>`에 둔다.

## Import 규칙

Vite alias `@`는 `src`를 가리킨다.

```js
import { orderRepository } from "@/repositories/orders/orderRepository";
import { useOrders } from "@/features/orders/hooks/useOrders";
```

새 코드에서 깊은 상대 경로(`../../../`)를 늘리지 않는다.

## 주요 Provider

- `LocaleProvider`: 한국어/일본어 상태와 `t()` 번역 함수 제공
- `StoreProvider`: URL의 `storeSlug`로 활성 매장 조회
- `ProtectedRoute`: 사장님 인증과 자기 매장 접근 여부 확인

## Supabase 테이블과 용도

| 테이블 | 용도 |
| --- | --- |
| `stores` | 매장 정보와 slug |
| `store_owners` | Supabase Auth 사용자와 매장 소유자 매핑 |
| `sessions` | 좌석 입장, 손님 세션, 정산/닫힘 상태 |
| `orders` | 주문 행, 상태, 가격, 좌석/세션 연결 |
| `seat_rows` | 좌석 행과 플로어 배치 |
| `menu_categories` | 메뉴 카테고리 |
| `menus` | 메뉴 아이템, 가격, 이미지, 다국어 필드 |
| `menu_options` | 메뉴 옵션 |
| `ingredients` | 재고 재료 |
| `menu_recipes` | 메뉴와 재료 사용 관계 |
| `stock_movements` | 재고 입고/조정 이력 |
| `sos_signals` | 손님 SOS 요청 |
| `messages` | 토크월 메시지 |
| `game_rankings` | 게임 랭킹 |
| `flirting_games` | 플러팅 게임 세션 |
| `flirting_choices` | 플러팅 게임 선택 |

## RPC 사용 영역

재고와 카운터성 업데이트는 RPC를 사용한다.

- `restock_ingredient`
- `adjust_ingredient_stock`
- `create_ingredient`
- `update_ingredient`
- `delete_ingredient_safe`
- `restore_ingredient`
- `resolve_sos`
- `increment_hearts`
- `increment_curious`

이 영역은 RLS, 권한, 원자성이 중요하므로 프론트에서 여러 쿼리로 재구현하지 않는다.

## 핵심 데이터 흐름

### 손님 입장

1. QR 또는 URL로 `/:storeSlug?seat=...` 진입
2. `StoreProvider`가 매장을 조회
3. `usePresence`가 닉네임/아바타/상태를 Realtime Presence에 등록
4. `useSession`이 localStorage, customer id, URL seat 기준으로 열린 세션을 복구하거나 생성
5. 손님은 탭에서 메뉴 주문, 게임, SOS를 실행

### 주문

1. `useMenus`와 `useMenuOptionsCustomer`가 메뉴/옵션을 조회
2. 손님이 주문하면 `useOrders.createOrder`가 수량만큼 `orders` 행을 생성
3. 세션의 `last_active_at`을 갱신
4. 손님/관리자 주문 화면은 Realtime으로 재조회

### 사장님 운영

1. `ProtectedRoute`가 로그인 여부와 매장 slug 일치를 확인
2. `AdminPage`가 주문, 세션, 메뉴, 좌석, 재고, 통계를 탭으로 제공
3. 주문 처리, 좌석 이동, 합석, 정산은 hook에서 service/repository를 호출해 갱신
4. 매출 통계는 `orders`와 `sessions`를 기준으로 계산하고 Realtime 변경에 반응한다.

## 현재 구조상 주의할 점

- `CustomerPage`, `AdminPage`, `MenuScreen`, `MenuAdminPanel`, `InventoryAdminPanel`, `SeatMap`은 아직 파일 크기가 크다. 큰 변경을 할 때는 해당 feature 내부 하위 컴포넌트와 hook 분리를 먼저 고려한다.
- Supabase 접근은 `src/repositories/`에 둔다. `features`, `pages`, `services`, `shared/lib`, `shared/store`에서 직접 Supabase client를 import하지 않는다.
- 날짜 계산은 직접 `Date`를 사용한다. 영업일 기준이 복잡해지면 날짜 유틸 도입이 필요하다.
- `alert`/`confirm` 사용이 많다. 새 UX는 앱 내부 모달/토스트를 우선한다.

## Realtime 복구

공통 복구 로직은 `src/shared/realtime/realtimeHealth.js`에 있다.

- `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED` 상태를 공통 처리한다.
- `closed` 채널은 재구독한다.
- `errored` 채널은 leave 후 재구독한다.
- visible/focus/online/주기 체크에서 WebSocket과 채널 상태를 복구한다.
- 주요 hook은 재구독 성공 또는 복구 감지 시 refetch로 누락 이벤트를 보정한다.

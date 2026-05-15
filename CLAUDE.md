# Honsul Bar 개발 가이드

## 문서 빠른 목록

필요한 판단 근거가 있을 때 아래 문서를 읽는다.

- `AGENTS.md`: AI 에이전트 자동 로드 진입점. `CLAUDE.md`를 가리키는 symlink다.
- `CLAUDE.md`: AI/개발자 작업 규칙과 프로젝트 운영 기준.
- `GIT.md`: 커밋 전 테스트, 오류 점검, 보안 점검 기준.
- `README.md`: 제품 이해, 기술 스택, 실행/검증, 환경 변수, 배포 기준.
- `SUPABASE.md`: Supabase CLI, 마이그레이션, RLS/RPC/Storage 보안 기준.
- `WORKFLOW.md`: Red-Green-Verify 기반 작업 흐름.
- `docs/README.md`: 문서 인덱스와 빠른 판단 기준.
- `docs/architecture.md`: 라우팅, 계층, 도메인 경계, Supabase 테이블/RPC, 데이터 흐름.
- `docs/library-review.md`: 현재 의존성 평가와 도입 추천 라이브러리.
- `docs/react-standards.md`: React, repository 기반 Supabase 접근, Realtime 구현 기준.

이 문서는 이 저장소를 이어받는 사람과 AI 에이전트가 같은 기준으로 작업하기 위한 운영 문서다. 개인 홈 디렉터리나 외부 설정 파일을 전제로 하지 않는다. `AGENTS.md`는 이 파일을 가리키는 symbolic link로 유지한다.

## 기본 원칙

- 한국어로 소통한다.
- 친절한 척보다 실제 도움이 되는 산출물을 우선한다.
- 묻기 전에 직접 확인한다. 파일을 읽고, 현재 상태를 보고, 실행 가능한 검증으로 판단한다.
- 추측으로 완료를 말하지 않는다. 린트, 빌드, 테스트, 실행 결과 중 가능한 증거를 남긴다.
- 사용자가 요청하지 않은 기능 확장, 대규모 리팩터링, 커밋, 푸시는 하지 않는다.
- 기존 변경을 되돌리지 않는다. 모르는 변경은 다른 사람이 한 작업으로 보고 보존한다.
- 보안상 민감한 값과 외부 시스템 변경은 특히 조심한다.

## 프로젝트 문서

이 파일은 AI/개발자 작업 규칙만 둔다. 세부 기준은 아래 원본 문서를 필요할 때 읽는다.

- 제품 이해, 실행, 배포: `README.md`
- 작업 흐름: `WORKFLOW.md`
- 커밋 게이트: `GIT.md`
- Supabase CLI/보안/마이그레이션: `SUPABASE.md`
- 구조/도메인/데이터 흐름: `docs/architecture.md`
- React/repository/Realtime 구현: `docs/react-standards.md`
- 의존성 판단: `docs/library-review.md`

## 아키텍처 기준

상세 기준은 `docs/architecture.md`와 `docs/react-standards.md`를 원본으로 한다. 이 파일에는 반복 작업 중 바로 지켜야 할 최소 규칙만 둔다.

- 화면/훅은 `src/features/`와 `src/pages/`에 둔다.
- 도메인 규칙과 use case는 `src/services/`에 둔다.
- Supabase DB/RPC/Realtime/Storage 접근은 `src/repositories/`에 둔다.
- `@supabase/supabase-js` 직접 import는 `src/repositories/`와 `src/shared/api/supabaseClient.js`로 제한한다.

## React 작업 규칙

- 컴포넌트는 가능하면 작게 유지한다. 화면이 커지면 하위 컴포넌트와 hook으로 나눈다.
- 조건부 렌더링은 early return을 우선한다.
- 서버 상태와 UI 상태를 구분한다.
- 서버 상태를 전역 store에 미러링하지 않는다.
- Realtime 구독은 반드시 cleanup한다.
- `eslint-disable`은 최후 수단이다. 사용할 경우 이유가 명확해야 한다.
- 사용자에게 보이는 문자열은 한국어/일본어 대응을 함께 검토한다.

## Supabase 작업 규칙

상세 CLI, 마이그레이션, 보안 기준은 `SUPABASE.md`를 원본으로 한다.

- 매장 데이터는 항상 `store_id` 또는 `storeSlug`로 스코프를 제한한다.
- 관리자 화면은 `ProtectedRoute`와 RLS를 함께 전제로 한다.
- 권한, 원자성, 동시성이 중요한 변경은 RPC를 우선한다.
- DB/RPC/Realtime/Storage 호출은 repository 경유를 원칙으로 한다.
- 구독 실패, 탭 복귀, 네트워크 복구 후 재조회할 수 있는 경계를 둔다.
- Storage 업로드는 MIME, 크기, 확장자를 검증한다.
- 입력값은 insert/update 직전에 다시 검증한다.

## UI/UX 기준

- 모바일 QR 진입이 1차 사용자 흐름이다.
- 터치 타깃은 최소 44px를 기준으로 한다.
- 주문, 정산, 재고, 좌석 이동처럼 현장 운영에 영향을 주는 액션은 성공/실패 상태가 분명해야 한다.
- 새 기능에서 `alert`/`confirm`을 늘리지 않는다. 앱 내부 모달, 상태 표시, 토스트를 우선한다.
- 색상만으로 상태를 전달하지 않는다.
- 버튼, 입력, 모달은 접근성을 고려한다.

## 테스트 기준

비즈니스 로직, 상태 전이, 권한, 데이터 변환은 테스트를 먼저 작성한다.

테스트 코드는 무조건 프로젝트 루트의 `__tests__/`에 만든다. `src/` 하위에 새 `*.test.js` 파일을 만들지 않는다.

우선 테스트 대상:

- 세션 복구와 좌석 이동
- 주문 수량, 옵션, 가격 계산
- 재고 입고/조정
- 매출 통계 날짜 범위
- 다국어 fallback
- Realtime 재연결과 중복 이벤트 처리

테스트를 못 쓰는 상황이면 이유와 수동 검증 방법을 남긴다.

## 의존성 기준

라이브러리는 문제를 반복해서 겪을 때 도입한다.

도입 후보, 비추천 항목, 적용 순서는 `docs/library-review.md`를 원본으로 한다. 새 의존성을 추가하기 전에 해당 문서를 먼저 확인한다.

## 문서 기준

- 앱 구조나 개발 규칙이 바뀌면 `README.md`와 `docs/`를 함께 갱신한다.
- AI/개발자 작업 규칙은 이 파일에만 작성한다.
- `AGENTS.md`는 별도 내용을 쓰지 말고 `CLAUDE.md` symlink로 유지한다.
- 새 기능은 데이터 흐름, 주요 테이블, 권한 경계를 문서에 남긴다.

## Git 기준

- 사용자가 명시하지 않으면 커밋하지 않는다.
- 커밋/푸시 전 현재 브랜치를 확인한다.
- 커밋 전 `npm test`를 반드시 한 번 실행한다. E2E는 기본 필수 검증이 아니다.
- 커밋 전 오류 점검과 보안 점검은 `GIT.md` 기준으로 수행한다.
- 브랜치 변경, reset, checkout, 강제 push 같은 파괴적 작업은 명시 요청 없이는 하지 않는다.
- `.env`, 로컬 상태 파일, 빌드 산출물은 커밋하지 않는다.

## 완료 보고 기준

완료 보고는 짧게 한다.

- 무엇을 바꿨는지
- 어떤 검증을 통과했는지
- 남은 리스크가 있는지

검증하지 못한 것은 통과했다고 말하지 않는다.

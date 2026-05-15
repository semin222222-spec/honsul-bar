# Docs

이 폴더는 Honsul Bar를 이어받는 개발자와 AI 에이전트를 위한 운영 문서다.

## 문서 목록

- [../README.md](../README.md): 제품 이해, 실행, 배포 기준
- [../AGENTS.md](../AGENTS.md): AI 에이전트 자동 로드 진입점. `CLAUDE.md` symlink
- [../CLAUDE.md](../CLAUDE.md): AI/개발자 작업 규칙
- [../WORKFLOW.md](../WORKFLOW.md): Red-Green-Verify 기반 작업 흐름
- [../GIT.md](../GIT.md): 커밋 전 테스트, 오류, 보안 점검 기준
- [../SUPABASE.md](../SUPABASE.md): Supabase CLI, 마이그레이션, 보안 기준
- [architecture.md](architecture.md): 라우팅, 계층, Supabase 테이블, 주요 흐름
- [react-standards.md](react-standards.md): React 앱이 지켜야 할 구현 기준
- [library-review.md](library-review.md): 현재 의존성 평가와 도입 추천 라이브러리

## 빠른 판단 기준

- 프로젝트가 무엇인지, 어떻게 실행하는지 헷갈리면 `README.md`를 먼저 본다.
- AI/개발자 작업 규칙이 필요하면 `CLAUDE.md`를 먼저 본다.
- 기능 위치가 헷갈리면 `architecture.md`를 먼저 본다.
- 코드를 어떻게 짤지 헷갈리면 `react-standards.md`를 먼저 본다.
- Supabase 스키마/보안/마이그레이션을 바꾸면 `SUPABASE.md`를 먼저 본다.
- 라이브러리를 추가하고 싶으면 `library-review.md`를 먼저 본다.
- 구현 흐름이 헷갈리면 `WORKFLOW.md`를 먼저 본다.
- 커밋 직전에는 `GIT.md`를 먼저 본다.

## 현재 구조 요약

코드는 feature-first UI 구조 위에 service/repository 레이어를 둔다.

- 앱 진입/라우팅: `src/app/`
- 라우트 화면: `src/pages/`
- 도메인 화면/훅: `src/features/`
- 비즈니스 규칙/use case: `src/services/`
- Supabase 접근: `src/repositories/`
- 공용 인프라/유틸/UI: `src/shared/`

새 화면 기능은 가능한 `src/features/<domain>/` 안에서 닫히게 만든다. 운영 데이터에 영향을 주는 규칙은 `src/services/<domain>/`, DB/RPC/Realtime/Storage 호출은 `src/repositories/<domain>/`로 분리한다. 여러 도메인에서 쓰는 UI/유틸만 `src/shared/`로 올린다.

# CLAUDE.md

이 파일은 Claude Code 진입점이다. Codex 진입점은 `AGENTS.md`이며, 실제 프로젝트 공통 지식은 `docs/agents/`에 둔다 — 여기 중복 기재하지 않는다.

## 프로젝트 개요

KISTA V2 — 한국투자증권 KIS API 기반 해외주식 자동 분할매매 **초대제 멀티 사용자 SaaS** 프론트엔드.
기술 스택: **Next.js 16** · TypeScript · Tailwind CSS · shadcn/ui · React Query · Firebase (FCM)

## 작업 방식

- **서브에이전트 실행 기본 원칙**: 독립적으로 병렬 처리 가능한 작업(파일이 겹치지 않는 작업)은 서브에이전트로 병렬 진행을 기본값으로 하며, 플랜 수립 시 오케스트레이션 모델과 각 태스크별 서브에이전트 모델(구현은 효율적인(저렴한) 모델, 검토자는 상위 모델 기본값)을 명시할 것
- **커밋 전 검토자 검수 의무화**: 코드를 변경하는 모든 작업은 커밋 직전에 반드시 별도 검토자(리뷰어 서브에이전트 또는 code-review 계열 skill/workflow)의 검수를 거칠 것 — 직접 구현했든 서브에이전트에게 위임했든 관계없이 적용. 검토자가 발견한 실제 결함은 커밋 전에 수정·재검증한다. 문서 전용 변경은 예외 (커밋 자동화 규칙은 `docs/agents/constraints.md` 참고)
- **README.md 드리프트 감지**: 코드 변경으로 `README.md`(기술 스택 배지 버전, 아키텍처 다이어그램 속 레이어/흐름, 배포 방식 등)의 내용이 실제와 달라지면 같은 작업에서 `README.md`도 함께 수정. kista-api 쪽 README도 영향받으면 `../kista-api/README.md`까지 확인
- **범위 밖 리팩토링 필요성 발견 시 제안**: 작업 중 우아하지 않은 코드, 일관성 깨는 패턴, 더 단순한 구현이 가능한 부분을 발견하면 임의로 고치지 말고 짧게 언급만 (범위 밖 변경은 사용자 승인 필요)

## 공통 지식 (매 세션 로드)

@docs/agents/commands.md
@docs/agents/architecture.md
@docs/agents/constraints.md
@docs/agents/deployment.md

## 레이어별 상세 문서 (해당 디렉토리 작업 시 로드)

각 FSD 디렉토리의 `CLAUDE.md`가 해당 문서를 import한다 — 그 디렉토리의 파일을 다루면 자동 로드된다. 디렉토리 밖에서 해당 레이어 지식이 필요하면 직접 Read할 것.

- `docs/agents/app.md` — proxy·쿠키·Route Handler·SSE·PWA quirk
- `docs/agents/entities.md` — 도메인 모델·kista-api DTO·queryKey·KIS quirk
- `docs/agents/features.md` — 사용자 시나리오·뮤테이션 훅 규칙
- `docs/agents/widgets.md` — 페이지 합성·shadcn·CSS 토큰·UI 패턴
- `docs/agents/shared.md` — api-client·format·cache·providers

## 운영 도구

- **운영 로그**: 서버 SSH 후 `cd /opt/kista-ui && docker compose logs -f kista-ui` (Vercel 배포 종료됨 — vercel-cli 사용 불가)

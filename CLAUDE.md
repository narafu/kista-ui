# CLAUDE.md

이 파일은 Claude Code 진입점이다. 실제 프로젝트 공통 지식은 `docs/agents/`에 둔다 — 여기 중복 기재하지 않는다.

## 프로젝트 개요

KISTA V2 — 한국투자증권 KIS API 기반 해외주식 자동 분할매매 **초대제 멀티 사용자 SaaS** 프론트엔드.

## 작업 방식

공통 작업 방식(서브에이전트 병렬/모델 라우팅, 커밋 전 검토, 자동 커밋, 모호하면 질문, 기존 오류 즉시 수정, 의심 사항 제보, 범위 밖 개선 제안)은 전역 `~/.claude/CLAUDE.md` 참고 — 여기는 이 프로젝트 고유 규칙만 기재.

- **직접 확인 우선**: 직접 확인할 수 있는 것은 추정·"미검증"으로 남기지 말고 확인한다 — 라이브러리 동작은 `node_modules` 소스로, 화면 동작은 dev 서버 + 브라우저로, API 계약은 로컬 kista-api 실제 응답·`gen:types` 결과로, 고친 테스트가 회귀를 잡는지는 변이 확인(수정을 잠시 되돌려 실패하는지)으로, 운영 상태는 읽기 전용 조회(서버 SSH 후 `docker logs`)로. "미검증"은 쓰기·실계좌 주문·배포가 필요한 것만, 이유와 함께 보고
- **사용처·호출부·동작 주장은 코드로 확인한 뒤 말한다**: "어디서 쓰인다"·"어떻게 동작한다"를 주석·문서·기억만 믿고 단정하지 않는다(주석이 낡아 있을 수 있다). grep 결과나 `file:line` 근거와 함께 답하고, 확인 못 했으면 확인 못 했다고 말한다
- **README.md 드리프트 감지**: 코드 변경으로 `README.md`(기술 스택 배지 버전, 아키텍처 다이어그램 속 레이어/흐름, 배포 방식 등)의 내용이 실제와 달라지면 같은 작업에서 `README.md`도 함께 수정. kista-api 쪽 README도 영향받으면 `../kista-api/README.md`까지 확인

## 공통 지식 (매 세션 로드)

@docs/agents/commands.md
@docs/agents/architecture.md
@docs/agents/constraints.md

## 레이어별 상세 문서 (해당 디렉토리 작업 시 로드)

각 FSD 디렉토리(`app/`·`entities/`·`features/`·`widgets/`·`shared/`)의 `CLAUDE.md`가 `docs/agents/<layer>.md`를 import한다 — 그 디렉토리의 파일을 다루면 자동 로드된다. 디렉토리 밖에서 필요하면 직접 Read할 것.

- 공통 규칙 문서도 레이어별로 로드된다: `copy.md`(카피) — app·entities·features·widgets, `a11y.md`(접근성) — widgets·features·shared, `react-query.md`(React Query·TS) — entities·features·widgets.

## 필요시 Read (자동 로드 아님)

- `docs/agents/finance.md` — 가계부(finance) 도메인 공통 규칙. 하위: 각 `features/finance/<slice>/CLAUDE.md`·`features/asset/save-asset/CLAUDE.md`(해당 슬라이스 작업 시 자동 로드, 그룹 공유 전환 공통은 `finance-group-share.md`), `finance-widgets.md`(가계부 화면 작업 시 Read)
- `docs/agents/strategy.md` — 전략·DCA·크립토·브로커 분기
- `docs/agents/deployment.md` — 환경변수·CORS·Docker·OCI 배포. `Dockerfile`·`docker-compose.yml`·`.env*`·`deploy/`·`.github/workflows/`·CORS·`/api/meta` 계약 변경 작업 시 반드시 Read

## 운영 도구

- **운영 로그**: 서버 SSH 후 `docker logs -f $(docker ps -qlf label=com.docker.compose.service=kista-ui)` (blue/green 교체로 컨테이너 이름이 고정되지 않음, Vercel 배포 종료됨 — vercel-cli 사용 불가)

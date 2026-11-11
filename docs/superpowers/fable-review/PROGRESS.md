# Fable 전면 검토 진행 원장 (kista-ui)

공통 기준: `../kista-api/docs/superpowers/fable-review/CHARTER.md`. 새 세션은 CHARTER → 이 파일 → `guides/` 순으로 읽는다. `findings/`는 지침서가 인용하는 근거다.

추가 기준(사용자 지시, fable-api 경유):
- `kista-api/docs/superpowers/fable-review/ui-api-principles.md` — 기본값은 API, UI는 화면 상태·표시·상호작용만.
- `kista-api/docs/superpowers/fable-review/guides/10-ui-contract.md` — 서버 쪽 규약(required 정확화, BigDecimal number, 목록은 전량형 `{items}` / 커서 페이지형 둘, 메타 통합, 상태 플래그, `fieldErrors`, 검증 전용 엔드포인트).
- UI 세션은 UI 코드철학 + UI/UX 관점. context7 MCP 적극 활용, 필요하면 Playwright CLI.

## 상태 (2026-11-12)

1단계 측정, 2단계 판단, 3단계 지침서 작성 **완료**. 구현은 하지 않았다(산출물은 분석과 지침서).
핵심 결정 4건 확정(아래). 남은 일: 실행은 Opus/Sonnet 세션이 지침서로. 서버 차단 조건이 없는 것부터 — 08 1단계, 09 태스크 2~4, 07 태스크 2·3·5.

## 핵심 진단

기준선: 제품 코드 약 41,400줄(생성 `api-types.ts` 9,564줄 별도), 테스트 30,240줄, 테스트 제외 파일 709개.

- 화면 하나는 평균 97파일 5,300줄 + 테스트 4,096줄이다. 순수 전달층(barrel·프록시·래퍼)은 줄 수의 4~7%뿐이라 "간접층이 두껍다"는 줄 수로는 기각됐다.
- 비대의 본체는 넷이다.
  1. 서버가 이미 아는 것을 UI가 다시 적는다: 타입 74쌍(일치율 99.3%), 정규화, 코드값 19집합 110곳, 업무 규칙·상태 판정·집계 사본.
  2. URL과 타입을 다른 이름으로 다시 부르는 데이터 층: api 함수 130개, 키·옵션 21파일, hook 125개.
  3. 같은 상황을 화면마다 다시 그린다: 목록 이중 마크업, 로딩 5종, 실패 5종, 확인 3종, 폼 구현 2벌, 폼 형태 6종.
  4. 기술 역할로 자른 5계층: 슬라이스 89개 중 features 68%·widgets 71%가 소비처 1곳, barrel 105개, 30줄 미만 파일 46%.
- 테스트는 케이스 수가 아니라 무대 비용이 크다: 모듈 mock 395개, wrapper 21개, 인라인 픽스처 1,386줄, 문구 리터럴 단언 1,219건.

## 지침서

| # | 주제 | 파일 | 제품 감량(추정) | 선행 |
|---|---|---|---:|---|
| 01 | 타입 SSOT | `guides/01-type-ssot.md` | 약 1,050줄 | api T1·T2 |
| 02 | 데이터 층 | `guides/02-data-layer.md` | 약 2,900줄, 45파일 | 01 |
| 05 | UI·API 책임 분담 | `guides/05-ui-api-responsibility.md` | 약 1,900줄 | 01·02, api T3~T8·T10~T12 |
| 04 | 라우트와 폼 | `guides/04-routes-and-forms.md` | 약 2,550줄, 55파일 | 02·05 |
| 06 | UX 프리미티브 | `guides/06-ux-primitives.md` | 약 2,100~2,600줄 | 02, api T4 |
| 03 | 계층 구조 | `guides/03-layer-structure.md` | 약 700줄, 150파일 | 01·02·04·05·06 |
| 07 | 테스트 | `guides/07-tests.md` | 테스트 약 9,300줄 | 인프라 태스크는 02 직후, 전환은 03 직후 |
| 08 | 문서 정리 | `guides/08-docs.md` | 자동 로드 약 250~330줄, archive 31,400줄 | 1단계 독립, 2단계는 각 코드 지침서 뒤 |
| 09 | 불필요 파일·배포 자산 | `guides/09-unused-files-and-deploy.md` | 소량 | 일부 infra·api와 동시 |

합계(추정): 제품 약 11,000~12,000줄(41,400의 27~29%), 테스트 제외 파일 709 → 약 500, 테스트 30,240 → 약 21,000.

실행 순서: **01 → 02 → (07 인프라) → 05 → 04 → 06 → 03 → 07 전환**. 08의 1단계와 09의 독립 태스크는 언제든.

실행 방식: 각 지침서의 "태스크 분해" 표가 태스크별 대상·권장 모델·완료 판정 명령을 갖는다. 지침서 하나를 한 세션(또는 SDD 루프 한 번)으로 실행한다. 01·05는 서버 태스크가 차단 조건이라 `kista-api/docs/superpowers/fable-review/cross-repo.md`의 상태를 먼저 확인한다.

## 사용자 결정

확정(2026-11-12):

| 결정 | 지침서 | 결과 |
|---|---|---|
| 인터셉트 라우트를 없애고 "작은 폼은 다이얼로그, 큰 폼은 페이지"로 | 04 결정 1 | 폐지 승인 |
| `openapi-fetch`·`openapi-react-query` 도입 | 02 | 도입 승인 |
| FSD 5계층 → `app/screens/domains/shared` 대이동 | 03 | 실행 승인(코드 지침서 중 마지막, 전용 worktree) |
| archive 71파일·감사 보고서 삭제 | 08 | 삭제 완료 — 커밋 `be6d886a`(복구: `git show be6d886a^:<경로>`). 감사 미해결 P2는 코드에서 이미 해소 확인(하드코딩 팔레트 0건, 사이드바 활성 토큰 사용, `--rose-50` 다크 오버라이드 존재). memory의 archive 경로 참조 3건 정정 |

아직 묻지 않은 것(해당 지침서 실행 전에 묻는다):

| 결정 | 지침서 | 권고 |
|---|---|---|
| 사용자 상태 라벨 "반려"(본인 화면) / "거절"(관리자 화면)을 하나로 통일할지 | 05 결정 2 | 통일(메타 한 라벨) |
| 관리자 목록의 번호 페이지네이션을 "더 보기"로 | 06 | 전환 |
| `reject-reason` 미구현 spec 처리, `.claude` 나머지 도구 사용 여부, 전역 CLAUDE.md와 겹치는 4곳 | 08 | — |
| `.prettierrc`(도구 없음) 처리, 수동 스크립트 사용 여부, 배포 workflow 변경 시점 | 09 | — |

## 즉시 고칠 수 있는 버그 (지시 대기)

- PRIVACY 목록이 `?days=`를 보내는데 서버 파라미터는 `range`다(`AdminPrivacyTradeController.java:44`, fable-api 확인). 기간이 무시되고 전량이 내려온다. 한 줄 수정.
- 루트 `docker-compose.yml`이 `TRADING_API_BASE_URL`을 주입하지 않는다(실행 확인은 안 함).
- `deploy/server/required-env`에 `TRADING_API_BASE_URL` 누락.

## 측정 산출물

| 파일 | 내용 |
|---|---|
| `findings/a-vertical-trace.md` | 대표 화면 6개 수직 추적 |
| `findings/b-type-duplication.md` | 타입·스키마·코드값 복제 |
| `findings/c-parallel-structures.md` | 평행 구조 |
| `findings/d-single-use-abstractions.md` | 단일 사용 추상화, 계층 지형 |
| `findings/e-test-bloat.md` | 테스트 비대 원인 |
| `findings/f-retained-decisions.md` | 유지 확정 결정 약 357건 |
| `findings/g-ux-pattern-variance.md` | UX 패턴 분산 |
| `findings/h-docs-drift.md` | 문서 드리프트·중복·로드 비용 |
| `findings/i-unused-files.md` | 삭제 후보(참조 grep) |
| `findings/j-ui-api-principle-violations.md` | UI·API 원칙 위반 전수, 가계부 집계 명세 재료 |

지침서가 실행 중 만들라고 한 산출물(아직 없음): `k-invalidation-map.md`(02 태스크 4), `l-move-map.csv`(03 태스크 1), `m-form-inventory.md`(04 태스크 1).

## 다른 세션과 주고받은 것

- fable-api에 전달: cross-repo 후보 6건, 주제 목록, 원칙 위반 전수 목록과 집계 명세, 검증 전용 엔드포인트·단건 조회 요청(전부 수용, api T10·T11·T12).
- fable-api에서 받음: BigDecimal은 JSON number(코드 확인), 지침서 10 규약, 예외 대장 판정(등록 예외 0건), KIS·업비트 삭제 결정, 프로세스 구조 권고(D1=A: 진입점 하나, 사용자 결정 전).
- fable-infra에서 받음: 배포 자산 후보 6건(09에 반영).

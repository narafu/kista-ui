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

추가 확정(2026-11-12):

| 결정 | 지침서 | 결과 |
|---|---|---|
| REJECTED 라벨 | 05 결정 2 | "반려"로 통일 |
| 관리자 목록·전략 주문 내역의 번호 페이지네이션 | 06 | "더 보기"로 전환 |
| `reject-reason` 미구현 spec | 08 | 폐기, 삭제함 |
| 검토 중 발견한 버그·드리프트 | 05·08·09 | 지금 수정(아래) |

아직 묻지 않은 것(해당 지침서 실행 전에 묻는다): `.claude` 나머지 도구 사용 여부와 전역 CLAUDE.md 중복 4곳(08), `.prettierrc` 처리·수동 스크립트 사용 여부·배포 workflow 변경 시점(09).

## 이 세션에서 실행한 것 (지침서 밖 코드 변경은 이것뿐)

- archive 71파일 + 감사 보고서 삭제(08 태스크 4).
- 잘못된 결과를 내던 `.claude` 도구 3개 삭제(`fsd-boundary-checker`, `fsd-scaffold`, `dto-sync-check`), 폐기된 spec 삭제(08 태스크 3).
- 문서의 코드와 어긋난 서술 D1~D7 정정, memory 참조 정정(08 태스크 2).
- `listAdminPrivacyBases`의 죽은 `days` 인자 삭제. 호출부가 없어 실제로 보내진 적은 없었다(처음 보고한 "기간이 무시된다"는 과장이었다).
- 루트 `docker-compose.yml`에 `TRADING_API_BASE_URL` 추가(09 태스크 4).
- 남은 것: `deploy/server/required-env`의 `TRADING_API_BASE_URL` 누락은 infra 변경과 같은 묶음(09 C2).

## 다른 레포 결정 반영 (2026-11-12, fable-api 전달)

- api 지침서 05 개정: 서버는 kista-web·kista-worker 두 role이 경로로 나눠 받고 Caddy가 분기한다. UI 진입점은 Caddy 내부 리스너(`API_BASE_URL=http://caddy:8080`) 하나. `TRADING_API_BASE_URL`·경로 표·스펙 병합 스크립트는 api 05 단계 M 직후 02 태스크 8로 지운다. 내부 리스너의 `X-Forwarded-Proto: http`·`Host` 변화는 UI 쿠키·리다이렉트에 영향 없음을 코드로 확인(02에 근거). worker 배포 중 502/503과 `WRONG_ROLE`은 06의 "서버 재시작 안내"로 묶는다.
- 토스 주문 유지, `brokers[].tradable` 메타 없음. KIS·업비트 삭제는 그대로.
- 매매 공식 변경 예정(api 지침서 08): `priceOffsetRate`·`currentRound`의 소수 자릿수가 늘어난다. UI 확인 결과 — `currentRound`는 3곳에서 `toFixed(1)`로 표시(`StrategyCard.tsx:98,150`, `StrategyMetaSection.tsx:182`), `priceOffsetRate`는 타입·정규화에만 있고 화면 표시·비교 코드가 없다. 소수 2자리를 가정한 비교는 없다. fable-api에 회신함.

## 서버 변경 없이 먼저 구현할 수 있는 것 (2026-11-12 선별)

01(타입)·05(책임 분담)와 02의 도메인 전환은 api T1·T2 등이 나와야 한다. 아래는 지금 바로 가능한 태스크다. 세션 하나에 묶음 하나.

| 순서 | 묶음 | 태스크 | 모델 | 왜 먼저인가 |
|---|---|---|---|---|
| A | 테스트 무대 | 07-1 기준선, 07-2 `mockApi`·`renderApp`·전역 대역, 07-3 도메인 빌더, 07-5 소스 패턴 테스트 → ESLint | Opus(07-2), 나머지 Sonnet·Haiku | 이후 모든 리팩토링이 테스트를 덜 깨뜨린다. 제품 코드를 안 건드려 위험이 가장 낮다. `mockApi`는 지금의 `fetch`(Route Handler 경로 = OpenAPI 경로)에도 그대로 걸린다 |
| B | 폼 형태 | 04-1 폼 전수표, 04-2 `FormDialog`, 04-3 작은 폼을 다이얼로그로 옮기고 `@modal` 라우트·`RouteModal`·`dismiss`·`FormBody` 삭제 | Opus(04-2), Sonnet(04-1·3) | 사용자 승인 완료. 약 900줄·35파일이 사라지고 03 이동량이 준다. 모바일 뒤로 가기·iOS 키보드는 실기기 확인 필요 |
| C | 폼 구현 | 04-4 `useAppForm`·`FormField`, 04-5a 가계부 폼 5개, 04-5b 관리자·그 외 수동 폼, 04-5c 투자금 추가·인출 병합 | Opus(04-4), Sonnet(전환) | 기존 mutation hook을 그대로 받게 만들면 02 전에 가능. 서버 `fieldErrors` 매핑은 꺼 두고 T7 뒤에 켠다. 전략 폼 통합(04-6)은 제외 — T5·T7·T10 필요 |
| D | 화면 프리미티브 | 06-1 `DataList`(전량형 + 이미 커서인 `CycleHistoryTable`로 시범, 감량 실측), 06-3 `AsyncSection`·스켈레톤 프리셋, 06-4 `ConfirmDialog`, 06-5 `AmountInput`, 06-6 `Surface`·`SectionTitle`, 06-7 포매터·lint | Opus(06-1, 06-3 프리미티브), Sonnet(전환) | 서버와 무관한 UI 일관성 작업. 페이지형 표 전환(06-2 일부)과 페이지네이션 삭제(06-8)는 api T4와 같은 날이라 제외 |
| E | 프록시 단일화 | 02-2 `resolveUpstream` 한 함수 + 프록시 Route Handler 13개 → 1개 | Opus | 인증·프록시 경로라 Opus. 01과 무관. 나중의 진입점 단일화(02-8)가 한 줄 변경이 된다 |
| F | 문서·배포 | 08-5 중복 정리, 08-6 문단형 줄 분해(이유 보존), 08-7 memory, 09-2·3 죽은 심볼·knip 예외, 09-5·6 workflow·`NEXT_PUBLIC_*` 원본 통합 | Opus(08-6, 09-6), 나머지 Sonnet·Haiku | 독립. 09-5·6은 push가 있어야 검증된다 |

권장 순서: **A → B → C → D → E**, F는 틈날 때. A는 다른 묶음의 테스트 비용을 줄이고, B·C는 승인된 결정 중 서버와 무관한 가장 큰 감량이다.

Opus가 직접 맡을 핵심 태스크만 추리면: 07-2, 04-2, 04-4, 06-1, 06-3, 02-2 (+ 08-6, 09-6).

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

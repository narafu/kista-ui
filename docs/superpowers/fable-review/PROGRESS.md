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
| 10 | 기능 재심(유지·보완·추가) | `guides/10-feature-review.md` | 결정 전(승인 시 계산) | 사용자 결정 D1~D18 |
| 11 | 01~09 미덮임 영역(인증·SSE·오류 수집·차트·토큰·도구) | `guides/11-uncovered-areas.md` | 약 1,100~1,300줄 | 태스크별(02·06, api U1·U2) |
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

권장 순서: **A → B → C → D → E**, F는 틈날 때. **A·B·C 완료(A·B 2026-11-12, C 2026-11-13, 아래 실행 기록)** — 다음은 D. A는 다른 묶음의 테스트 비용을 줄이고, B·C는 승인된 결정 중 서버와 무관한 가장 큰 감량이다.

실행 중 지침서의 전제가 코드와 맞지 않거나 "중단 조건"에 걸리면 추측으로 진행하지 말고 `questions.md`에 적고 그 태스크를 멈춘다. 그 밖의 판단은 지침서의 기본값으로 스스로 정한다(CHARTER "실행 중 질문").

Opus가 직접 맡을 핵심 태스크만 추리면: 07-2, 04-2, 04-4, 06-1, 06-3, 02-2 (+ 08-6, 09-6).

## 묶음 A 실행 기록 (2026-11-12)

### 07-1 기준선 (변경 전 `main` 11600a19)

- `vitest run`: 260파일, 1,887케이스. 커버리지를 켠 전체 실행은 약 540~585초 걸린다. 부하 때문에 timeout으로 실패하는 케이스가 1~20건 생긴다(`cacheArchitecture.test.ts`의 15초 timeout 등). 실패한 9파일을 커버리지 없이 따로 돌리면 117케이스가 모두 통과했다. 그래서 실제 실패는 0건으로 본다.
- 커버리지 측정 명령: `npx vitest run --coverage --coverage.reportOnFailure --coverage.reporter=json-summary --testTimeout=60000`. `reportOnFailure`가 없으면 timeout 하나만 나도 리포트를 쓰지 않는다.
- 집계 기준: `entities/*`·`features/*`는 슬라이스(2단계 디렉토리)로, 나머지는 최상위 디렉토리로 묶는다.
- 전체: 줄 85.66%, 분기 79.39%.

| 묶음 | 줄 % | 분기 % |
|---|---:|---:|
| app | 88.6 | 68.8 |
| widgets | 86.3 | 77.2 |
| shared | 92.9 | 87.1 |
| components | 98.4 | 96.7 |
| proxy.ts | 91.6 | 73.8 |
| entities/account | 80.5 | 84.6 |
| entities/admin | 87.6 | 77.6 |
| entities/admin-settings | 91.7 | 100.0 |
| entities/backtest | 100.0 | 50.0 |
| entities/error-log | 100.0 | 62.5 |
| entities/fcm | 59.2 | 38.5 |
| entities/finance | 74.5 | 83.7 |
| entities/market | 75.0 | 53.8 |
| entities/meta | 88.5 | 84.6 |
| entities/order | 85.0 | 94.2 |
| entities/privacy | 43.5 | 87.5 |
| entities/runtime-config | 100.0 | - |
| entities/stats | 85.1 | 81.0 |
| entities/strategy | 85.2 | 82.0 |
| entities/trade | 91.7 | 83.3 |
| entities/user | 68.1 | 50.0 |
| features/account | 87.6 | 82.1 |
| features/admin | 90.4 | 84.4 |
| features/asset | 91.6 | 72.7 |
| features/auth | 96.7 | 77.5 |
| features/backtest | 89.3 | 77.4 |
| features/finance | 67.3 | 57.7 |
| features/settings | 81.3 | 69.7 |
| features/strategy | 94.0 | 88.5 |

### 07-2 테스트 무대

- `testing/mockApi.ts`: 전역 `fetch`를 대체한다. 키(`'GET /api/...'`)와 응답 모양은 `paths` 타입으로 검사한다. 2xx가 아닌 응답은 `apiError(status, body)`로 주고, `undefined`를 돌려주면 204가 된다. 등록하지 않은 요청은 기록해 뒀다가 테스트가 끝날 때 실패시킨다. React Query가 reject를 삼켜도 놓치지 않는다(`it.fails`로 자체 검증).
- `testing/renderApp.tsx`: `QueryClientProvider`(`createQueryClient`)와 `MetaProvider(testMeta)`로 감싼다.
- 위치: `shared/testing`이 아니라 루트 `testing/`(alias `@testing/*`)에 둔다. `renderApp`이 `entities/meta`를 써야 하는데, `shared`에서 `entities`를 import하는 것은 금지라서다. 03 이동의 영향도 받지 않는다.
- `vitest.setup.ts`에 전역 대역 3개를 둔다.
  - `next/navigation`: 원본을 펼치고 `useRouter`·`usePathname`·`useSearchParams`·`useParams`만 대역으로 바꾼다.
  - `next/link`: `<a>`로 렌더한다.
  - `sonner`: `toast`는 spy, `Toaster`는 null이다.
  - 파일별 `vi.mock`을 두면 그쪽이 이긴다(커스텀 대역을 쓰는 4파일로 확인).
- **sonner 결정**: 지침서는 "setup에 대역"과 "`renderApp`이 `Toaster`를 감싼다"를 둘 다 적고 있는데, 둘은 함께 쓸 수 없다. spy 쪽을 골랐다. 실제 `Toaster`를 렌더하는 테스트가 0건이고, 기존 39파일이 `toast.*` 호출을 단언하는 방식이라서다.
- 파일럿: `widgets/account-detail/AccountDetailContent.test.tsx`. 모듈 mock 2개와 손으로 만든 `QueryClient`를 `mockApi` + `renderApp`으로 바꿨다. 변이 확인 2건이 모두 실패를 냈다(크립토 분기 제거, 원장 실패 플래그 고정).

### 07-5 소스 패턴 테스트 → ESLint

- `cacheArchitecture.test.ts`(282줄)와 `metadata.test.ts`(26줄)의 규칙을 `eslint.config.mjs`의 `no-restricted-syntax`·`no-restricted-imports`로 1:1로 옮기고, 두 테스트 파일을 지웠다.
- 고의 위반 파일로 11건이 모두 잡히고, 테스트 경로는 제외되는 것을 확인했다.
- 차이: `next/cache` namespace import(`import * as`)는 이제 import 자체가 금지된다. 기존 테스트는 금지 export를 호출할 때만 잡았다.

### 07-3 도메인 빌더

- 빌더 파일:
  - `entities/strategy/model/fixtures.ts`: `strategy`, `vrSummary`, `dcaRule`
  - `entities/order/model/fixtures.ts`: `nextOrderPreview`
  - `entities/meta/__fixtures__/testMeta.ts`: `strategyTypeMeta`
- 기본값은 캐스트 없는 완전한 객체이고, 변형은 `over`로만 준다.
- 테스트의 `as unknown as`는 29건에서 5건이 됐다.
  - `createProxyRoute.test.ts`의 7건은 빌더가 아니라 `Handler` 타입을 그대로 써서 없앴다.
  - 남은 5건은 의도된 것이다.
    - `assetSort.test.ts`(2건): null·undefined를 string 자리에 넣는 견고성 케이스다.
    - `BacktestForm.test.tsx`: 부분 hook 결과 stub이다.
    - `strategyFormHelpers.test.ts`: 부분 RuntimeConfig stub이다.
    - `MarketChartCardInner.test.tsx`: canvas stub이다.

## 묶음 B 실행 기록 (2026-11-12)

커밋: `eaf98591`(04-1) → `60ea8f11`(04-2) → `e2ddf7cc`(04-3). 별도 수정 `cc80c297`.

### 04-1 폼 전수표

- `findings/m-form-inventory.md`. 폼은 31개가 아니라 28행이다(지침서 수치는 추정).
- 다이얼로그로 옮길 폼: 투자금 추가·인출, 예산 추가·복제·수정. 페이지로 남는 폼: 전략 등록·수정, VR 재설정, 자산 기록, 계좌 등록·수정, 일괄 등록, 관리자 설정. 나머지 17개는 이미 다이얼로그 또는 인라인이라 그대로 둔다.
- 지침서와 달랐던 점: 닉네임은 다이얼로그가 아니라 인라인 편집이다.
- 사용자 확정(전수표 5절):
  - 예산 목록 `/finance/budgets/[type]`은 일반 페이지로 남긴다. 설정 화면으로 옮길지는 03에서 판단한다.
  - `FormDialog`는 처음부터 이력 한 칸을 쌓는다.
  - 투자금 확인 AlertDialog는 다이얼로그 안에 그대로 둔다.
  - 인터셉트 관련 문서는 04-3과 같은 커밋에서 정리한다.

### 04-2 `FormDialog`

- `shared/ui/FormDialog.tsx`: PC(sm 이상)는 가운데 다이얼로그, 모바일은 전체 화면 시트다(하단 safe-area 여백 포함).
- 기존 `useSubviewHistory`를 재사용해 열 때 이력 한 칸을 쌓는다. X·ESC·배경·취소·제출 성공이 모두 `history.back()`을 거쳐 popstate에서 닫힌다. 폼은 children 함수가 넘기는 `close`로만 닫는다. 연타로 두 칸을 되돌아가지 않도록 막는 장치가 있다.
- **지침서와 다른 점**: `subviewHistory`는 지우지 않는다. 페이지로 남는 DCA 규칙 편집 하위 뷰와 `FormDialog`가 함께 쓴다. 그래서 태스크 3 완료 판정의 grep에서 `subviewHistory`는 뺀다.
- 확인한 것:
  - 단위 테스트 6건. 연타 방지와 이력 쌓기는 변이 확인을 했다.
  - `a11y-check` 폼 다이얼로그 점검(투자금 추가, 예산 추가)이 PC·모바일 모두 위반 0건이다.
  - 390px 모바일 스크린샷에서 전체 화면 시트로 뜬다.
  - Chromium 에뮬레이션에서 뒤로 가기를 누르면 폼만 닫히고 URL은 그대로다.

### 04-3 전환과 삭제

- `app/(main)/@modal` 전체, `RouteModal`, `ModalFormSkeleton`, `shared/lib/dismiss.ts`, 투자금 추가·인출 라우트, 예산 등록·수정 라우트, `FormBody` 9개를 지웠다. 예산 링크 헬퍼 `newBudgetHref`·`editBudgetHref`도 지웠다.
- 화면별 처리:
  - 투자금 추가·인출: 전략 상세 헤더의 버튼이 `FormDialog`를 연다.
  - 예산: 목록 페이지 안에서 추가·복제·수정을 다이얼로그로 연다. 복제는 URL 대신 행 데이터를 넘긴다.
  - 수입·소비·저축 탭의 예산 빠른 등록: 그 자리에서 다이얼로그로 연다.
- 함께 정리한 것:
  - `FinanceHeader`의 모달 배경 경로 보정과 `SectionTabBar` `activePathname`. 쓰는 곳이 없어졌다.
  - a11y-check의 "라우트 모달" 점검을 "폼 다이얼로그" 점검으로 바꿨다.
  - `docs/agents/app.md`의 인터셉트 4문단을 폼 형태 기준(다이얼로그 아니면 페이지) 2문단으로 바꾸고, strategy·finance 문서를 고쳤다.
- 테스트: 고친 테스트는 `mockApi`·`renderApp`으로 바꿨다. 남은 모듈 mock은 서버 컴포넌트 쿠키를 대신하는 `next/headers` 하나뿐이다(`strategies/[sid]/edit/page.test.tsx`). 기존 mock 4개에서 줄었다.
- 변이 확인(폼마다 1회, 전략 상세의 버튼 노출 조건 2개 포함 — `supportsCapitalAdjustment`·`canWithdrawCapital` 제거 시 각각 실패):
  - 투자금 추가: `onDone` 제거 → 실패.
  - 투자금 인출: 요청 바디 변경 → 실패.
  - 예산 복제: `duplicateFrom` 제거 → 실패.
  - 예산 수정: create로 고정 → 실패.
  - 예산 닫기: `onDone`을 아무 일도 안 하게 바꿈 → 실패.
  - 빠른 등록: `defaultCategoryId` 제거 → 실패.
- 검증 결과:
  - `typecheck`·`lint`·`knip` 0건.
  - 전체 vitest: 259파일, 1,877건 통과. 5건이 timeout으로 실패했는데, 모두 이번에 건드리지 않은 파일이고 단독으로 돌리면 24/24 통과했다. 묶음 A 기준선에 적은 부하성 timeout과 같다.
  - e2e(worktree, 로컬 api): chromium 14건 통과, 1건 skip(VR 시드 없음).
  - e2e의 `account-cache` 2건은 실행마다 결과가 흔들렸고(5초 이동 timeout 등) 한 번은 2/2 통과했다. 계좌 생성·삭제 흐름이라 이번 변경과 관계없다.

### 함께 고친 것 (`cc80c297`)

- Tailwind v4 자동 소스 탐지가 `docs/`의 md까지 스캔한다. 그래서 `findings/g-ux-pattern-variance.md`의 `text-[var(--…)]`가 유틸리티로 생성돼 dev 서버 CSS 파싱이 깨졌다(e2e webServer가 모든 화면 실패).
- `app/globals.css`에 `@source not "../docs"`를 넣었다.
- 운영 Docker 빌드는 이 상태에서도 통과하고 있었다(최근 배포 성공).

### 미검증 (실기기 필요)

- 모바일 하드웨어·제스처 뒤로 가기(Android, iOS PWA)가 `FormDialog`만 닫는지.
- iOS 키보드가 올라온 상태에서 전체 화면 시트(`h-dvh`)의 입력칸·버튼 가림과 스크롤. 노치 상단 safe-area는 넣지 않았다(앱 헤더도 쓰지 않음).
- 재무 계좌 다이얼로그(필드 7개)처럼 긴 폼은 모바일에서 X 버튼이 스크롤과 함께 올라간다. 닫기는 취소 버튼과 뒤로 가기로 가능하다.

### 남긴 것

- 다이얼로그가 열린 채 부모가 unmount되면(예: 화면 전환) 같은 URL의 이력 칸이 하나 남는다. 뒤로 가기 한 번이 아무 일도 하지 않는다. DCA 하위 뷰와 같은 한계다.
- 지침서 04의 태스크 7(문서)은 이번에 앞당겨 했다. 08에서 다시 하지 않는다.

## 묶음 C 실행 기록 (2026-11-13)

커밋: `1d8858c1`(04-4) → `e2eb96a6`(04-5c) → `c9da8857`(04-5a) → `77249aab`(04-5b). 5c는 파일이 겹치지 않아 5a·5b 위임과 병렬로 먼저 끝냈다.

### 04-4 `useAppForm`·`FormField`

- 위치: `shared/ui/form/useAppForm.ts`, `shared/ui/form/FormField.tsx`. `FormActions`는 `shared/ui`에 그대로 두고 `form` prop을 더했다.
- `useAppForm({ schema, defaultValues, mutation, toPayload?, successMessage?, onDone? })`
  - 기존 entities mutation hook 결과를 그대로 받는다. 02의 `$api.useMutation`도 같은 모양이다.
  - 생성·수정은 호출부가 mode로 hook 하나를 골라 넘긴다. 생성 전용 값(`shareToGroup`)은 `toPayload`에서 붙인다.
- 실패 토스트는 `useAppForm`이 띄우지 않는다. 모든 mutation hook이 이미 `onError`에서 `apiMsg`로 detail을 띄우므로, 여기서도 띄우면 두 번 뜬다.
  - 그래서 "api T7 전에는 detail을 토스트로만"은 hook이 이미 하고 있다.
  - 서버 `fieldErrors` → `setError`는 `serverFieldErrors()` 순수 함수와 `MAP_SERVER_FIELD_ERRORS = false`로 꺼 두었다.
  - **T7 뒤 켤 때 할 일**: 필드에 붙은 오류를 hook 토스트가 또 띄우지 않게 hook `onError`도 고친다.
- 진행 상태는 RHF `isSubmitting`이 아니라 `mutation.isPending`이다. hook의 async `onSuccess`(무효화)가 끝날 때까지 pending이 이어진다.
- 확인 단계가 있는 폼은 `<form onSubmit={form.handleSubmit(열기)}>`로 열고, 확인 버튼에서 `form.submit()`을 부른다.
- 표기:
  - 필수는 `*`다. label 밖에 두고 `aria-hidden`, 입력에 `aria-required`를 단다(접근 이름에 `*`가 섞이지 않게).
  - " (선택)" 꼬리는 지웠다.
  - 제출 중 문구는 `{label} 중…`이다. 전략 폼 버튼도 기본값을 따라 '저장 중...'에서 '등록 중…'·'수정 중…'으로 바뀌었다(파일은 건드리지 않았다).
- 단위 테스트 6건: 제출 바디, 진행, 형식 오류·aria, 서버 실패, `serverFieldErrors` 2건. 변이 확인 2건(`onDone` 제거, `isPending` 고정)이 모두 실패했다.
- `submitFormDialog`는 5a에서 소비처를 옮긴 뒤 지웠다.

### 04-5a 가계부 (Sonnet 위임)

- 전환: 거래내역, 재무계좌, 카테고리, 예산, 초대 코드 입력. 거래내역·재무계좌·카테고리 Dialog는 `FormDialog` 셸로 옮겼다.
  - 지침서 04에 기본값 절이 없어, 결정 1의 목표 표(가계부 폼 = 폼 다이얼로그)를 근거로 정했다.
- `CategoryFormDialog`가 `system` prop으로 시스템 카테고리를 겸한다.
  - system 모드는 그룹 목록을 조회하지 않는다. `useCanShareToGroup({ enabled })`를 추가했다(리뷰 지적).
- `submitFormDialog`와 `SaveButton`을 지웠다.
- 그대로 둔 것: `InviteDialog`. Select 하나와 결과 화면 2상태라 RHF로 얻는 것이 없다.
- 비활성 제출 버튼으로만 막던 조건(월 마감, 기간 등)은 `onSubmit` 가드로 Enter 제출도 막는다(리뷰 지적, 자산 기록도 같다).

### 04-5b 관리자 개인정보·그 외 (Sonnet 2개 병렬 위임)

- 관리자 개인정보:
  - 주문 추가·수정 → `PrivacyOrderFormDialog`.
  - 기준 등록·수정 → `PrivacyBaseFormDialog`. 주문 행은 `useFieldArray`다.
  - 제출 버튼은 항상 활성이고, 형식 오류는 제출할 때 필드에 표시한다. 그래서 빈 값·평단가 오류 문구가 새로 생겼다.
- 전환한 폼: `EditAccountForm`, `CredentialsCard`, `AssetForm`(등록·복제·수정), `NicknameEditor`, 텔레그램 연결(설정·승인 대기가 같은 훅을 쓴다).
- 그대로 둔 것:
  - `AdminSettingsForm`: 런타임 설정 전체의 초안 편집기다(서버값 따라가기, `validateAdminSettings`).
  - 계좌 삭제 타이핑 확인: 폼이 아니라 확인 단계다.
  - 완료 판정 grep에는 `deleteConfirm` 1건만 남았다.
- 자산 기록은 경로로 풀리지 않는 `categoryId`면 전처럼 제출을 잠근다(리뷰 지적).
- `ApiKeyExpiryField`(계좌 등록)의 " (선택)"도 지웠다. 같은 필드인데 계좌 수정 화면과 표기가 갈리지 않게 했다.

### 04-5c 투자금 추가·인출

- `features/strategy/adjust-capital/CapitalForm`(`kind`)으로 합쳤다. `inject-capital`·`withdraw-capital` 슬라이스는 지웠다.
  - 차이(요청 필드 `depositAmount`·`amount`, 문구, 인출 한도 스키마)는 `KIND` 표 하나에 둔다.
- AlertDialog 확인 단계는 유지했다(사용자 결정).
- 전략 상세는 `FormDialog` 하나에 마지막으로 연 종류를 띄운다. 닫히는 중에 다른 종류를 열어도 폼 상태가 섞이지 않게 `key={kind}`를 준다(리뷰 지적).
- 테스트 두 파일을 `describe.each` 하나로 합쳤다.

### 테스트·검증

- 선행 테스트: 폼마다 "채우고 제출하면 나가는 요청"을 `mockApi`로 고정했다. 전환 전 코드에서 통과를 확인한 뒤 바꿨다. 손댄 테스트의 모듈 mock과 파일별 wrapper는 걷었다.
  - 예외: 예산 shareToGroup 단언은 전환 뒤에 추가했다.
  - 예외: 5c는 기존 묶음 B 테스트가 이미 바디를 고정하고 있었다.
- 변이 확인: 옮긴 폼마다 1회 했고 모두 실패를 냈다. 기록은 위임 로그에 있다(세션 scratchpad라 남지 않는다).
- 리뷰: 태스크마다 Sonnet 리뷰어로 검수했다. 실제 결함 지적 5건은 커밋 전에 고쳤다.
- `typecheck`·`lint`·`knip` 0건.
- 전체 vitest: 262파일, 1,911건 통과(+ `it.fails` 1건). timeout 없음.
- e2e: worktree, 로컬 api, `--project=setup --project=chromium --workers=1`. 18/18 통과했다.
  - account-cache 2건은 chromium의 의존 프로젝트로 같이 돌았고 이번엔 통과했다.
  - VR 시드 skip도 없었다.
  - 이 환경은 macOS라 `cp -cR`와 `.env`(`.env.local` 없음)를 썼다.

### 남긴 것

- `next/headers` 모듈 mock은 2건이다: `strategies/[sid]/edit/page.test.tsx`, `app/api/auth/refresh/route.test.ts`(Route Handler, 묶음 B 집계에서 빠졌다). **사용자 확정(2026-11-13)**: 파일별 mock으로 둔다. `next/headers`를 쓰는 테스트가 3건 이상이 되면 `vitest.setup.ts` 전역 대역(기본 토큰 + 테스트별 덮어쓰기)으로 옮긴다. 2건 중 `route.test.ts`는 테스트마다 쿠키를 바꿔 전역화 이득이 없다.
- 미검증(실기기 필요): 새로 `FormDialog`로 옮긴 가계부·관리자 다이얼로그의 모바일 전체 화면과 키보드.
- 바뀐 화면 모양:
  - `TelegramSection`의 작은 muted 라벨이 `FormField` 기본 라벨로 바뀌었다.
  - 힌트 글씨가 `text-sm`에서 `text-xs`로 바뀐 곳이 있다(계좌·자산).
  - 화면 확인은 하지 않았다.
- 다음: 묶음 D(06). 04-6은 api T5·T7·T10 뒤.

## 묶음 C 질문 답변 (2026-11-13, Fable)

`questions.md` Q-01~Q-05에 답했다. 답의 원본은 지침서 04다(커밋 `e9e1000e`).

- 04에 추가된 태스크: 5d(제출 버튼 규칙 통일), 5e(`AdminSettingsForm` 전환), 5f(계좌 등록 스테퍼 전환), 5g(서버 필드 오류 켜기, api T7·02 뒤). 5d·5e·5f는 서버 선행 조건이 없다.
- api 쪽 반영됨(지침서 10의 2-5절·T7, api 커밋 `3cdbdedca`. 코드 실행은 api T7): `fieldErrors` 응답의 `detail` 요약 규약(`cross-repo.md` B "fable-ui 요청 (2026-11-13)", api 커밋 `79c363f30`).
- **사용자 승인(2026-11-13)**: 화면 동작이 바뀌는 두 결정 — 제출 버튼은 빈 값에서도 활성이고 제출 시 필드 오류 표시(5d), 관리자 설정은 서버값이 바뀔 때 편집한 필드만 보존(5e).
- 헌장이 말하는 "판단이 갈릴 때의 기본값" 절은 04에만 만들었다. 나머지 지침서 8개는 질문이 나올 때 추가한다.

## 추가 지침서 10 — 기능 재심 (2026-11-13, Fable)

- 산출물: `guides/10-feature-review.md`, 측정 `findings/n-feature-inventory.md`·`findings/o-usage-evidence.md`.
- 화면 35개·기능 36단위를 유지 애매(A1~A9)·보완(B1~B10)·추가(C1~C7)로 갈랐다. 항목마다 근거 종류(코드·사용 흔적·제품 판단)를 적었다.
- **결정 전 상태다.** 삭제·축소·병합·신규는 지침서 끝의 사용자 결정 목록 D1~D18에 있다. 태스크 분해는 승인된 항목만, 승인 뒤에 한다.
- 사용 흔적의 한계: 운영 사용자 2명, 접근 로그 없음(kista-ui·Caddy). 화면별 사용 여부는 측정하지 못했다. 그래서 삭제 권고는 대부분 제품 판단이다.
- 결정 없이 반영할 것 3건(B1·B2·B3)은 02 태스크 6, 05 4절·태스크 3·태스크 9의 판정에 한 줄씩 더한다. 아직 그 지침서들을 고치지 않았다(다음 Fable 세션 또는 해당 지침서 실행 전에).
- memory "완료 작업 재작업 금지" 재심: 4건 유지(바이낸스, 빗썸 안 함, 대시보드 KPI, DCA), 2건 가드 폐기 제안(가계부 탭, admin Phase 2 — D18).
- 바로 다음 할 일: 사용자가 D1~D18에 답하면 승인 항목의 태스크 분해를 지침서 10에 추가한다.

## 추가 지침서 11 — 미덮임 영역 (2026-11-13, Fable)

- 산출물: `guides/11-uncovered-areas.md`, 측정 `findings/p-uncovered-runtime.md`·`findings/q-uncovered-assets.md`.
- 01~09가 덮는 범위를 표로 만들고 남은 영역을 쟀다. 손대는 곳 10절(인증·세션, SSE, 푸시, 오류 수집, 금액 가림, 기간 선택, 차트, 디자인 토큰, 개발 도구, 설정), 검토 후 유지 1절(관리자 화면, 앱 셸, shared 잡동사니 등).
- 감량은 약 1,100~1,300줄로 작다. 값은 인증의 사본 제거와 사각지대(화면 밖 오류, a11y 점검에서 빠진 화면 9개, 꺼진 미사용 lint 억제 감지)를 메우는 데 있다.
- 태스크 13개. 태스크 1(도구 준비 코드·경로 표 통합)은 독립이고 03·06의 회귀 확인 수단이라 묶음 D 앞에 넣는다.
- 사용자 결정 E1~E5(금액 숨김 범위, react-doctor, 승인 대기 SSE, 토큰 클레임, 보안 헤더).
- api 요청은 `cross-repo.md` B절 "fable-ui 요청 (2026-11-13, 2차)" U1~U7(api 커밋은 kista-api 로그 참고). infra 요청 2건(접근 로그, 보안 헤더)은 fable-infra에 전달했다.
- 지침서 10이 다른 지침서에 더하라고 한 3건(02 태스크 6, 05 4절·태스크 3·9의 판정 보강)과 이 지침서가 바꾸는 완료 판정(02 태스크 2의 route 수 10 → 8, 09 B6에 `axe-core`)은 아직 해당 지침서에 반영하지 않았다. 해당 지침서 실행 전에 반영한다.
- 바로 다음 할 일: 사용자가 D1~D18·E1~E5에 답하면 지침서 10에 태스크 분해를 추가하고, api의 U1~U7 답에 따라 지침서 11의 1·2·6절을 확정한다.

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
| `findings/n-feature-inventory.md` | 화면·기능 전수, 대칭 행렬, 겹침, 미사용 엔드포인트, memory 재심 재료 |
| `findings/o-usage-evidence.md` | 운영 DB 읽기 전용 집계(사용 흔적) |
| `findings/p-uncovered-runtime.md` | 01~09 미덮임 영역 지형표, 인증·SSE·알림·오류·앱 셸·관리자·시장 통계 |
| `findings/q-uncovered-assets.md` | 차트·스타일 토큰·scripts·e2e·설정·의존성·public |

지침서가 실행 중 만들라고 한 산출물: `m-form-inventory.md`(04 태스크 1, 작성함). 아직 없음: `k-invalidation-map.md`(02 태스크 4), `l-move-map.csv`(03 태스크 1).

## 다른 세션과 주고받은 것

- fable-api에 전달: cross-repo 후보 6건, 주제 목록, 원칙 위반 전수 목록과 집계 명세, 검증 전용 엔드포인트·단건 조회 요청(전부 수용, api T10·T11·T12).
- fable-api에서 받음: BigDecimal은 JSON number(코드 확인), 지침서 10 규약, 예외 대장 판정(등록 예외 0건), KIS·업비트 삭제 결정, 프로세스 구조 권고(D1=A: 진입점 하나, 사용자 결정 전).
- fable-infra에서 받음: 배포 자산 후보 6건(09에 반영).

# Fable 전면 검토 진행 원장 (kista-ui)

공통 기준: `../kista-api/docs/superpowers/fable-review/CHARTER.md`. 새 세션은 CHARTER → 이 파일 → `guides/00-roadmap.md`(실행 순서, Fable 없이 실행하는 규칙) → 실행할 지침서의 맨 끝 "실행 전 보정" 절 → 본문 순으로 읽는다. `findings/`는 지침서가 인용하는 근거다. **실행 순서와 규칙은 로드맵이 기준이다. 아래 실행 기록은 그때의 사실이고 규칙이 아니다.**

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
| 12 | 코인 제거(2026-11-14 추가, api 15 대응) | `guides/12-crypto-removal.md` | 제품 약 1,800~2,300줄, 테스트 약 1,500줄 | push 전 운영 코인 계좌 0건. **가장 먼저 실행** |
| 00 | 로드맵: 실행 순서, 충돌 정리, Fable 없이 실행하는 규칙 | `guides/00-roadmap.md` | — | — |

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
| `reject-reason` 미구현 spec | 08 | 폐기, 삭제함(spec 문서만. 서버는 이미 구현돼 있었다 — 2026-11-13 확인, 지침서 10 D7로 다시 묻는다) |
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

(2026-11-14 개정) 실행 중 지침서의 전제가 코드와 맞지 않으면 실행 세션이 보정하고 지침서를 고친다. 중단 조건은 "되돌린다 → 지침서의 대체 경로 → 없으면 사용자" 순이다. 규칙은 `guides/00-roadmap.md` 4절, `questions.md`는 결정 기록이다. Fable 세션의 답을 기다리지 않는다.

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
  - **T7 뒤 켤 때 할 일**: 필드에 붙은 오류를 hook 토스트가 또 띄우지 않게 hook `onError`도 고친다. → **정정(2026-11-14)**: 이 문장은 Q-02 답 이전 기록이다. 확정은 "전역 토스트는 `fieldErrors`가 있어도 항상 `detail`을 띄운다"(지침서 04 "서버 오류의 분담"). hook `onError`를 이 목적으로 고치지 않는다.
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
- fable-infra 답 반영(2026-11-13, `cross-repo.md` F절): 보안 헤더는 infra Caddy 공용 스니펫 `(site)`, ui는 `kista-ui.caddy`에 import 한 줄(infra 배포 뒤). 접근 로그는 프리페치까지 잡히는 한계가 있어 D17 선택지를 셋으로 고쳤다. F5·F6(infra 문서 링크·서술 정정)은 08 태스크 5에 넣는다.
- fable-api 답 반영(2026-11-13, `cross-repo.md` B절 "api 답", api 커밋 `650314de3`):
  - U1 수용: AT에 `status` 클레임 추가(`role`은 이미 있다). api 먼저 배포 → 지침서 11 태스크 3. 역할 캐시 쿠키는 태스크 2에서 먼저 지울 수 있다.
  - U2: `status-stream`은 ui가 구독을 지운 뒤 api가 지운다.
  - U3: T6가 미지원과 차단을 구분한다 → 지침서 10 B2 확정.
  - U4: PRIVACY 기준표는 서버 산출 불가(FIDA 원천 데이터). 화면 축소 판정은 api 지침서 12 B5 뒤로 보류.
  - U5: `trade-dates`·계좌별 `daily-trades`·`manual-fills` 삭제 방향. 계좌별 `daily-trades`의 ui 호출부는 없다고 회신했다.
  - U6: 서버가 `range` 프리셋 코드를 받는다 → 지침서 11의 6절 목표를 줄였다(ui 날짜 계산 삭제).
  - U7: **정정.** 반려 사유는 서버에 이미 구현돼 있었다. 2026-11-12의 "폐기"는 ui의 미구현 spec 문서 삭제 결정이었고, 그때 서버 구현 여부를 확인하지 않았다. 지침서 10 B4·D7을 "양쪽 삭제 / ui를 마저 만듦"으로 고쳤다. 사용자 결정 전까지 api는 지우지 않는다.
- **사용자 결정(2026-11-13): "모두 권장대로".**
  - 승인: D1(`/strategies` 병합), D2(`/admin/pending` 병합), D4(크립토 지표 조건부), D8(보관 이름 변경), D9(VR 투자금 경로 통일), D10(DCA 다음 실행 예정), D11 검색, D13(CSV 내보내기), D14(삭제 실행 취소), D16(반복 거래 안 함), D17(접근 로그), D18(memory 가드 폐기), E1(금액 숨김을 매매 화면까지), E3(승인 대기 주기 조회), E4(상태 클레임), E5(보안 헤더, 실행은 infra).
  - 아직 열림(권고가 "답에 따름"이었거나 승인 직전에 바뀜): D3(주택 벤치마크), D5(대시보드 오늘의 주문), D6(스케줄러 수동 실행 화면), D7(반려 사유 — 양쪽 삭제 / ui 마저 만듦), D11의 다중 선택, D12(비회원 화면), D15(CSV 가져오기), E2(react-doctor).
  - **D10 보류**: api 지침서 12 D4의 사용자 답("코인 DCA 주문 미리보기는 추가하지 않는다")과 겹칠 수 있어 api가 요청으로 올리지 않았다. 사용자 확인 전까지 지침서 10 태스크 6을 만들지 않는다.
  - api 반영: `cross-repo.md` B절 "ui 결정에서 온 요청"(D2·D8·D9·D13·D14·E3·E4, api 커밋 `fa745a32f`). 반려 사유 서버 구현은 D7 답까지 그대로 둔다.
  - 지침서 10에 "태스크 분해" 절(태스크 11개)을 추가했다. memory 가드 2건을 지웠다(D18).
- **사용자 결정(2026-11-13, 2차)**: D3 유지, D5 추가, D6 스케줄러 수동 실행 화면 추가, D7 양쪽에서 삭제, D15 만들지 않음. 지침서 10에 태스크 12~14를 추가했다. 남은 열림: D10(api 12 D4와의 관계), D11 다중 선택, D12, E2.
- api 확인(2026-11-13, api 커밋 `1e9bc3d97`): 스케줄러 수동 실행은 지금 202·본문 없음·감사 로그 없음 → 지침서 10 태스크 13을 api 06 뒤로 묶었다. D7 서버 삭제는 api 13 U1 묶음(컬럼 드롭은 다음 배포).
- **사용자 결정(2026-11-13, 3차, "추천대로")**: D11 자산 기록 다중 선택은 그대로, D12 비회원 메뉴는 대시보드·로그인만(지침서 10 태스크 15), E2 react-doctor 걷어냄(지침서 11 태스크 12를 삭제 태스크로 바꿈, 서버 무관하게 지금 가능).
- D10(2026-11-13, 4차): 다음 실행일만 표시. 예정 금액·조건은 만들지 않는다(api 12 D4와 맞춤). **정정**: 다음 실행일은 이미 화면에 있다(`DcaStrategyDetail.tsx:146`, `DcaStrategyCard.tsx:39-44`, 서버 `rules[].nextExecution`). B7의 처음 서술이 틀렸고 태스크 6은 없앴다. api 변경 없음(fable-api 확인). 05 7절이 지우겠다고 한 `dcaFormat.ts:73-93`은 서버 값 중 고르는 표시 코드라 05에서 대상에서 뺀다(다음 Fable 세션).
- **지침서 10·11의 사용자 결정은 전부 닫혔다.**
- 서버와 무관하게 지금 실행 가능: 지침서 10 태스크 3, 지침서 11 태스크 1·7·12. 승인 태스크 중 서버와 무관한 것은 지침서 10 태스크 3, 지침서 11 태스크 1·7이다.

## 추가 요청 3차 (2026-11-14, 사용자, fable-api 경유) — 완료

배경: Fable 한도가 끝나면 `questions.md`에 답할 세션이 없다. 실행 세션(Opus/Sonnet)이 묻지 않고 진행하도록 지침서에 답을 미리 넣는다. api에서 한 것(`../kista-api/docs/superpowers/fable-review/PROGRESS.md` "추가 요청 3차")을 ui에도 똑같이 했다.

| 항목 | 산출물 |
|---|---|
| 1 질문 일반화 | 유형 9개(V1 코드 전제, V2 기준 없음, V3 "모든 X"의 범위, V4 지침서 간 충돌, V5 문서 위치, V6 서버 계약 없음, V7 실기기·로컬 api, V8 코인·KIS, V9 화면 변화). 공통 규칙은 `guides/00-roadmap.md` 4절(api 로드맵 9절을 참조하고 ui에서 다른 것만 적었다). 유형 표는 `questions.md` 머리. `questions.md`는 결정 기록으로 바꿨다 |
| 2 구현 평가 | `findings/r-implementation-review.md` |
| 3 미구현 지침 보완 | 지침서 01~11 전부의 맨 끝에 "실행 전 보정" 절과 머리의 안내 한 줄. 전제 전수는 `findings/s-guide-premises-01-06.md`·`findings/t-guide-premises-07-11.md` |
| 추가 | `guides/12-crypto-removal.md`(신규). api의 코인 전체 삭제(15)에 대응하는 ui 태스크가 어느 지침서에도 없었다 |

- 구현 평가 요지: 끝난 태스크 11개(04의 1~5c, 07의 1·2·3·5). 제품 41,933 → 40,600줄(−1,333, 파일 −43), 테스트 30,240줄 그대로. 04 묶음 B·C의 감량은 예상의 73%이고 선행 테스트 때문에 테스트는 +287줄. 지침서와 다르게 구현된 13건은 전부 지침서가 틀렸거나 비어 있던 곳이다. 틀린 전제 15건 중 9건은 착수 전 grep 한 줄로 걸러진다. 위 "기준선"의 "제품 약 41,400줄"은 41,934줄이 맞다(`findings/e`의 세는 법).
- 지침서 본문을 뒤집은 정정(각 보정 절과 로드맵 3절에 있다): ① 10의 태스크 3·D4(크립토 지표 조건부)는 없앤다 — 뒤에 나온 코인 삭제 결정이 우선 ② 05 태스크 9는 KIS만, 코인은 12 ③ 05의 `dcaFormat.ts:73-93` 삭제 철회 ④ 09 A1(`fmtCompactUsdNarrow`) 삭제 철회 — 제품이 쓴다 ⑤ 09·04의 `subviewHistory`는 파일을 남긴다 ⑥ 06 `ConfirmDialog`에 `onConfirm` 방식 추가(폼 안 확인 단계), `AmountInput`의 자릿수는 메타가 아니라 `CURRENCY_SCALE` ⑦ 01 태스크 1의 판정 명령 교체(2,200 이하) ⑧ 04의 5d 대상에 `canSubmit` 6곳 추가, 잠금 조건의 `onSubmit` 가드는 남긴다, 5f는 코인·KIS 삭제 뒤 ⑨ 02의 단건 요청은 `GET /api/accounts/{id}` 하나(전략 단건은 이미 있다), `TRADING_API_BASE_URL` 대상 7곳 추가, `useAppForm` 소비 15파일 ⑩ 10의 태스크 14(반려 사유)·11의 태스크 4(`status-stream`)는 ui가 먼저 지운다 — 판정에서 생성물을 뺀다 ⑪ 11의 태스크 2: PENDING 토큰에 `role`이 없어진다 ⑫ 완료 판정은 `git grep`으로 바꿔 돌린다(생성물·docs 제외, `\b` 금지).
- 이번 세션에서 직접 확인한 것: `canSubmit` 사용처 전수, `GET /api/trading-cycles/{id}`가 스펙에 있음, `<AlertDialog` 14파일, 프록시 route 13개·전체 22개(서브에이전트의 "12개"는 `backtest`를 빠뜨린 오보였다), 비회원 대시보드가 `MarketChartCard`로 `/api/market/candles`를 부름, `CURRENCY_SCALE`의 위치, `.claude/settings.json:4`.
- 확인하지 못한 것(보정 절에 기본값을 적었다): 운영의 코인 계좌 잔존 여부(12의 T0), api 13 U1(status 클레임)의 구현 여부, infra의 `(site)` 스니펫 배포 여부, 03의 번들 크기 기준.
- api에 회신한 것(`cross-repo.md` G절 "ui 회신 (2026-11-14)"): G5(비회원 대시보드가 차트를 쓴다), 계좌 범위 `daily-trades` 호출 0건, HTTP 400에 기대는 분기 0건, 승인 대기 사용자가 부르는 경로 9개, G4·G7·G9, 그리고 코인 화면 제거는 아직 미실행(지침서 12)이라는 것.
- **G5 닫힘(2026-11-14, 사용자 확정, fable-api 전달)**: 비회원 차트는 나와야 한다. `GET /api/market/candles`는 공개로 유지하고 api는 인증 전환을 하지 않는다(api `cross-repo.md` G절, api 14의 11절, api 커밋 `03f6d25b3`·`dd822394e`). **ui는 할 일이 없다. 비회원에게서 차트를 빼는 태스크를 만들지 않는다.** api는 ui 회신의 나머지(15 T4 착수 조건, 13 U1·U8, 10 T8)도 지침서 보정 절에 넣었고, 13 U8에 "502 본문에 `ErrorCode`가 없으면 배포하지 않는다"를 조건으로 적었다.
- memory: "완료 작업 재작업 금지"의 코인 항목에 2026-11-14 삭제 결정을 적었다.
- 서브에이전트 3개(Sonnet)가 측정했다. 진행 중 서브에이전트: 없음.
- **남은 Fable 작업: 없음.** 다음은 실행이다. 순서는 로드맵 2절: S1(코인 제거, 지침서 12) → S2(11의 12·1, 09의 2·3) → S3(04의 5d·5e) → S4(06 프리미티브) → S5(02의 2). 01은 사용자가 로컬 api를 띄운 세션에서.

### e2e 대기 (로드맵 4-5의 2)

실행 세션이 로컬 api 없이 커밋한 화면 변경이 생기면 커밋 해시와 돌릴 명령을 여기 적는다.

- `6a3e0a14`(S1 코인 제거): 시드 의존 e2e 5건(`ledger-budget.spec.ts:9`, `strategy.spec.ts:8·15·32·51`)이 로컬 DB가 비어 단언까지 가지 못했다. 시드를 넣은 뒤 `npm run test:e2e`(worktree 절차)와 `npm run visual-diff -- 190caf90`(계좌 상세·전략 등록·`stock-dca-strategy`)을 돌린다.
  - 2026-11-20: 시드가 들어간 로컬 DB에서 `strategy.spec.ts` 4건 모두 통과했다(`f224bc5c` 기준). 32·51(투자금 추가·인출)은 시드 무한매수 전략이 사이클 대기 중(`cycleInProgress=false`)이라 버튼이 없어 실패했고, `f224bc5c`에서 진행 중 사이클 전략을 고르는 `seed.capital`로 고쳤다. 남은 것: visual-diff.
  - 2026-11-20(S2): `ledger-budget.spec.ts`를 포함한 chromium 15건과 setup이 통과했다(`--project=setup --project=chromium --no-deps`). 남은 것은 visual-diff(`npm run visual-diff -- 190caf90`)뿐이다.
- `265247be`(S3)와 `01782862`("바로 주문" 제거, kista-api 요청, 2026-11-21): **해소(2026-11-21)**. api 세션이 로컬 api를 main `38c44f09b`(local, `KISTA_ROLE=all`)로 다시 띄우고 시드를 넣은 뒤 돌렸다.
  - 읽기 전용 e2e(`--project=setup --project=chromium --no-deps`) 16건 통과.
  - `a11y-check` 위반 0건.
  - 운영 설정과 API 키 재등록(`CredentialsCard`) 화면을 확인했다(후 스크린샷만).
  - 함정: 셸 환경변수 `TRADING_API_BASE_URL=http://localhost:8081`이 `.env`를 덮어쓴다. 그래서 그냥 띄운 dev 서버의 `/api/accounts`가 ECONNREFUSED로 500이 됐고, 첫 a11y-check가 대시보드 h1 누락으로 위반 6건을 냈다. dev 서버는 `TRADING_API_BASE_URL=http://localhost:8080 npm run dev`로 띄운다. e2e는 `playwright.config.ts`가 주소를 주입해 영향이 없다.
- `309d6046`·`9c7d8557`(S4 1차): **해소(2026-11-21)**. 로컬 api(`KISTA_ROLE=all`)에서 돌렸다.
  - 읽기 전용 e2e 15건 통과, a11y-check 위반 0건.
  - 함정: `--project=setup --project=chromium --no-deps`를 한 번에 돌리면 병렬로 시작해 `admin.json`이 없다는 실패가 날 수 있다. `--project=setup --no-deps`를 먼저 돌리고 `--project=chromium --no-deps`를 돌린다.
  - visual-diff(`20982123` 대 `9c7d8557`) 116샷 중 16샷이 다르다. 14샷은 잔고 이력이 든 모바일 화면의 높이 차이다(카드 한 장 약 +20px, 8건이면 +165px, 티커 배지가 굵은 글자로, 금액이 보통 굵기로). `/stats` 모바일은 전략 유형 비교 카드, PC는 12×14px 글자 영역이다. 잔고 이력 카드는 뒤 커밋에서 촘촘한 모양으로 되돌렸고 높이가 전환 전과 같다(`account-detail` 1848px, `detail-vr` 2332px).
  - 집계할 때 `diff > 0`만 세면 크기 불일치(`diff`가 `"SIZE …"` 문자열)를 놓친다. `diff !== 0`으로 센다.
- `6a3e0a14`(S1)의 visual-diff: **해소(2026-11-21)**. 대상 화면만(`--only '^(account-detail|account-new|create-strategy|stock-dca)'`) `190caf90` 대 `6a3e0a14`로 돌렸다. 22샷 중 2샷만 다르고, 계좌 등록의 "증권사·거래소" → "증권사" 문구로 의도한 변경이다. 전체 시나리오를 돌린 실행은 옛 커밋 worktree의 폰트 모듈 오류로 판정에 쓰지 않았다.

## S1 실행 기록 — 코인 제거 (지침서 12, 2026-11-15~16)

- **T0 운영 확인(읽기 전용, 2026-11-15)**: `BINANCE`·`UPBIT` 계좌 live 0(전체 각 1, 삭제 표시), `BTC`·`ETH` 전략 live 0(`ETH` 전체 2), 코인 미체결 주문 0, 미완료 코인 이벤트 0. push 조건 충족.
- 한 커밋으로 묶었다(`refactor(crypto): 코인 화면과 분기를 전부 걷는다 (S1, 지침서 12)`). 지침서의 "태스크마다 커밋" 대신 전체 검증과 리뷰를 한 번 하고 커밋하라는 사용자 지시를 따랐다. 태스크 T1~T5는 SDD로 순서대로 위임했다(T3만 Opus).
- 실측: 169파일, 제품 93파일 +314/−1,637, 테스트 63파일 +280/−1,587, 도구·문서 13파일 +35/−103. 삭제 파일 11개. 예상(제품 1,800~2,300줄)보다 제품 감량이 작다. 공용 분기는 생각보다 얇았고, 전용 파일 일부는 테스트 쪽에 있었다.
- 선행 테스트 1: `DcaStrategyForm.test.tsx`의 "주식 등록: 규칙 1개를 채워 제출하면 요청 payload 전체가 고정된다"(`toEqual`). 삭제 전후 모두 통과했고 기대값은 바꾸지 않았다. 변이 확인으로 `buildDcaPayload`의 `shortfall`을 빼면 실패한다. 주식 바디에는 `executionHour`가 원래 없고 주문 유형은 `MOC`다(중단 조건 3행에 해당하지 않음).
- 판단: 대시보드 위쪽 패널 줄이 달력과 CNN 둘만 남아 `lg:grid-cols-3`을 `lg:grid-cols-2`로 바꿨다(스켈레톤도 2칸). `BrokerCode`는 `Extract<…, 'TOSS' | 'MOCK' | 'MERITZ'>`로 좁혔다. 생성 타입에는 서버가 지울 때까지 코인 코드가 남는다. 티커 시장 필터는 `isStockTicker`(US_STOCK 화이트리스트)로 바꿨다. 서버가 아직 코인 티커를 보내기 때문이다. (후속, 2026-11-16: api N18 배포 뒤 gen:types를 다시 받으면서 둘 다 걷었다. `isStockTicker`는 `a08e088b`에서 지우고 메타에 있는 티커만 남기는 검사로 바꿨고, `BrokerCode`의 `Extract`는 `e2c39815`에서 뺐다. 생성 broker enum이 TOSS·MOCK·MERITZ만 남았기 때문이다.)
- 판정 grep에서 남긴 것(코인 매매가 아님): 가계부 자산군 `CRYPTO`(`entities/finance/**`, `widgets/asset-composition` 테스트, `testMeta.ts`의 자산군 1줄), node `crypto` 모듈 import(`tests/e2e/support/account-cache-lock.ts`), IBIT·ETHA(주식 ETF) 벤치마크 문구.
- 리뷰(`/code-review high`) 10건: 6~10번(낡은 주석, 쓰지 않는 `broker` prop, 별칭, 들여쓰기)은 고쳤다. 1~5번은 코인 계좌·USDT 이력이 서버에 남아 있을 때만 생기는 문제라 그대로 뒀다(코인 계좌 편집 화면 크래시, 계좌 상세 400, 금액이 USD로 표시됨, 관리자 설정의 업비트·바이낸스 토글). 운영에 live 코인 계좌는 0이다. 다만 api 15 T4가 데이터를 지우기 전까지 과거 USDT 체결은 달력·관리자 체결 표에 `$`로 보인다.
- 비회원 대시보드는 dev 서버 스크린샷(1440폭)으로 확인했다. 패널 줄 2칸이 위쪽 안내 카드 줄과 맞는다. 시장 차트의 "크립토 · 보조지표" 카테고리(IBIT 등 주식 ETF)는 코인 매매가 아니라 그대로 뒀다.
- 확인하지 못한 것: visual-diff의 계좌 상세·전략 등록(DCA) 화면. 로컬 DB가 비어 있고 시드는 사용자 확인 없이 돌리지 않는다. 코인 DCA 시나리오는 지웠고 주식 DCA 시나리오(`stock-dca-strategy`·`stock-dca-strategies`)는 남겼다.
- e2e(worktree에 변경분을 적용해 실행, 로컬 api :8080·:8081): 12건 통과, 1건 건너뜀, 5건 실패. 실패 5건은 전부 시드 의존이다(`ledger-budget.spec.ts:9`, `strategy.spec.ts:8·15·32·51`, "dev 시드에 MOCK·TOSS 계좌가 있어야 한다"). 로컬 DB가 비어 있어서이고 이번 변경을 검증하지 못한 것이다(전략 목록 카드·등록 폼·투자금 추가·인출 화면). 아래 "e2e 대기"에 적었다.
- memory "완료 작업 재작업 금지": 코인 항목을 "삭제했고 다시 만들지 않는다"로 바꿨다.
- 배포: 2026-11-16 운영 배포됨(운영 ui 이미지 `8743fa99`, 2026-11-16 14:30 KST `docker ps`, api 세션 확인). api `cross-repo.md` G1 아래 줄에 배포일이 기록됐다(api 커밋 `47eee29a3`).

## S2 실행 기록 — 도구·설정 (지침서 11의 12·1, 09의 2·3, 2026-11-20)

- 한 커밋으로 묶었다. 태스크는 SDD로 Sonnet 2개에 순서대로 위임했다. 첫째는 11의 12와 09의 2·3(sharp·B5), 둘째는 11의 1과 09의 B6(axe-core)이다. 리뷰는 전체가 끝난 뒤 `/code-review medium` 1회만 돌렸다.
- **11의 12 react-doctor 삭제**
  - 억제 주석 48줄을 지웠다. 단독 줄이 43줄, 코드 줄 끝 주석이 5줄이다.
  - stub 플러그인을 지우고 `linterOptions.reportUnusedDisableDirectives: 'error'`를 명시했다. 쓸모없는 `no-console` 억제를 고의로 1건 넣어 보고되는지 확인한 뒤 되돌렸다.
  - 기존 `react-hooks/exhaustive-deps` 억제 3건은 실제로 필요해서 남았다.
  - 지운 파일: `doctor.config.json`, `.react-doctor/`, `.github/workflows/react-doctor.yml`, `.claude/skills/react-doctor/`. 함께 지운 것: `package.json`의 `doctor` 스크립트, `.claude/settings.json`의 허용 규칙(`allow`는 빈 배열로 남음), `commands.md`와 `finance-widgets.md`의 언급.
  - 판정 `git grep -n -i "react-doctor\|doctor" -- . ':!docs/superpowers' ':!package-lock.json'` 0건.
  - 리뷰 지적에 따라, 억제 주석의 `--` 뒤에 있던 사유 중 코드 이해에 쓸모 있는 것(Suspense를 쓰지 않는 이유, index key, 무효화가 없는 이유 등)은 일반 주석으로 되살렸다.
- **09의 2**
  - A1 후속: S1 뒤로 `fmtCompactUsdNarrow`는 `fmtCompactMoneyNarrow`의 USD 분기에서만 쓰여서 그 안으로 접었다. 테스트는 같은 기대값을 `fmtCompactMoneyNarrow(n, 'USD')`로 단언한다.
  - A2·A3·A5·A7도 끝냈다. A5에 맞춰 `finance.md`의 `isLiability` 문장을 "엔티티 내부 판정"으로 고쳤다.
- **09의 3**
  - `sharp` 0.34.5와 `axe-core` 4.14.0을 devDependency로 명시했다. 둘 다 전이 의존성으로 이미 설치돼 있던 버전이다. knip `ignoreDependencies`를 지웠다.
  - a11y-check는 `createRequire().resolve` 대신 `import axe from 'axe-core'`와 `axe.source`를 쓴다.
  - B5는 `components/ui/**` 예외를 빼도 knip이 0건이라 예외를 지웠다.
- **11의 1 도구 준비 코드**
  - `scripts/shared/browser.mjs`에 `devToken(role)`, `authedContext`, `VIEWPORTS`, `API_BASE`·`TRADING_API_BASE`를 모았다.
  - `scripts/shared/routes.mjs`에 경로 표 하나를 두었다. 표는 seed를 import하지 않고 시드 키 이름만 가진다. `statusCookies`와 `stubStatusStream`도 여기로 옮겼다.
  - `scripts/shared/check-routes.mjs`를 `npm run lint` 뒤에 붙였다. CI의 `ci.yml`이 lint를 돌린다.
  - 판정 `git grep -n "dev-token\|dev-admin-token" -- 'scripts/**/*.mjs' 'e2e/**/*.ts' 'tests/**/*.ts'`는 1줄이다.
  - 경로 검사 변이 확인: 표에서 행을 빼거나 없는 경로를 넣으면 exit 1이다.
  - e2e는 `tests/e2e/**`를 `e2e/`로 모았다. vitest 단위 테스트 `tests/account-cache-fixture.test.ts`는 vitest exclude(`e2e/**`)에 걸리지 않게 `tests/`에 남겼고 import 경로만 고쳤다(15건이 실제로 돈다).
  - `e2e/global.setup.ts`는 `devToken`을 동적으로 import한다. 정적 import는 setup과 chromium을 한 실행에서 돌릴 때 `seed.mjs`가 `browser.mjs`의 export를 찾지 못하는 SyntaxError를 냈다(재현함). Playwright의 `.mjs` 변환 캐시가 원인으로 보이지만 확정하지 못했다.
  - 줄 수는 거의 줄지 않았다. 중복을 지운 만큼 새 공용 파일 약 120줄이 생겼다. 효과는 a11y-check의 사각지대를 없앤 것이다.
- **검증**
  - typecheck·lint·knip 0건. 전체 vitest 259파일 1790건 통과.
  - a11y-check(dev 서버, 로컬 api 읽기 전용): 새 9개 화면(`/strategies`, `/pending`, `/rejected`, 가계부 4개, 전략 수정, VR 재설정)을 포함해 위반 0, 차단 요청 0, 건너뜀 0.
  - e2e: setup과 chromium 16건이 통과했다. `playwright --list`는 전후 18건이고 프로젝트 배치도 같다.
  - visual-diff 시나리오 58개는 전후 이름·경로·mode가 같다. 촬영은 돌리지 않았다.
- **돌리지 않은 것**: `account-cache` 프로젝트 2건(계좌 생성·삭제). "로컬 DB는 GET만" 제약 때문이다. 이 spec은 import 경로만 바뀌었다.
- **리뷰에서 남긴 것**: `components.json`의 `hooks` alias 삭제(A7)가 shadcn 기본값과 같은 `@/hooks`라 동작 차이가 없다고 보고 그대로 뒀다.
- push 전에 확인할 것: 화면 변경이 없어 e2e 대기에 추가하지 않는다. `.github/workflows/react-doctor.yml` 삭제는 PR에만 걸리던 검사라 배포에 영향이 없다.

## S3 실행 기록 — 폼 마무리 (지침서 04의 5d·7b·5e, 2026-11-21)

- 한 커밋으로 묶었다(`265247be`). 바로 앞 `01782862`는 S3가 아니라 kista-api 요청으로 한 "바로 주문" 제거다(사용자 승인). SDD로 5d(Sonnet)와 5e(Opus)를 병렬로 위임했다(파일이 겹치지 않음). 리뷰는 전체가 끝난 뒤 `/code-review medium` 1회, 수정 라운드 1회, 수정분 재리뷰 1회를 했다.
- 실측: 제품 19파일 +266/−206, 테스트 10파일 +329/−28. 감량은 없다. 5d는 조건을 zod로 옮기며 오류 문구가 늘었다. 5e는 줄 수가 331 → 334로 거의 그대로이고 `useState`가 4 → 1이다.
- **착수 전 재측정**: `canSubmit` 비테스트 사용처는 지침서 보정 절과 같았다(가계부 4, 자산 기록, `CredentialsCard`, 전략 4). 제출 버튼 방식은 둘로 나뉘어 있었다.
  - 빈 값이면 비활성: 7개. 보정 절에 없던 `AcceptInvitationForm`이 포함된다(`disabled={… watch('code') …}`).
  - 이미 항상 활성 + 제출 시 zod 오류: 5개(`EditAccountForm`, 텔레그램 연결, `CapitalForm`, 관리자 개인정보 2).
  - 이제 앞의 7개도 항상 활성이다. 판정 명령과 자체 결정은 04 보정 절 끝 "S3 실행 보정"에 있다.
- **5d**:
  - `FormActions`의 `canSubmit`을 `locked`로 바꿨다.
  - 빈 날짜·카테고리·금액·이름·키·초대 코드, 예산 금액 0 이하는 zod 필수로 옮겼다. 제출하면 필드 오류가 보이고 요청이 나가지 않는다.
  - `locked`와 Enter 가드에 남긴 것: 월 마감, 기간 밖 날짜, 경로로 풀리지 않는 자산 카테고리, 예산 종료일 < 시작일(api T7까지).
  - 새로 필수가 된 카테고리(예산)·금액(자산)에 `*`가 붙는다.
  - 7b: `a11y.md`에 "폼" 3줄을 추가했고, `app.md`의 낡은 문장을 지웠고, `shared.md`의 폼 항목을 갱신했다.
- **5e**:
  - `values: 서버값` + `resetOptions`로 서버값을 따라간다. 서버값이 바뀌면 편집한 필드만 보존한다(승인된 변경).
  - 경로별 setter 3개는 `Controller` 연결로 바꿨다. 편집기가 자체 라벨·오류를 그려서 `FormField`를 쓰면 라벨이 이중으로 나온다.
  - 선행 테스트: 토글·필드·벤치마크를 함께 편집해 저장하면 나가는 바디 전체(`toEqual`)를 고정했다. 전환 전 코드에서 통과했고, 전환 뒤 기대값은 바꾸지 않았다. benchmarks가 없는 낡은 응답의 바디 테스트도 전환 전 코드로 같은 기대값을 확인했다.
  - RHF 7.79 내부 동작에 기대는 장치 셋을 더했다(04 보정 절). `react-hook-form`을 올릴 때 `features/admin/settings` 테스트를 다시 돌린다.
- **리뷰**: `/code-review medium` 6건은 모두 고쳤다.
  - important 3건: 서버값이 바뀔 때 오류가 지워짐, 자산 수정 화면이 카테고리 로딩 중 "찾을 수 없음"을 띄움, benchmarks가 없을 때의 바디 확인(코드는 원래 맞았고 테스트만 추가).
  - nit 3건: 카테고리 선택·편집기의 ref·aria 연결, 검증 문구 "~해 주세요." → "~하세요."(copy.md 규칙, 지침서 04 예시도 정정), 로드 실패 시 잠금 이유.
- **검증**:
  - typecheck·lint(경로 표 검사 포함)·knip 0건.
  - 전체 vitest 259파일 1,803건 통과(+ `it.fails` 1건).
  - 변이 확인: 5d는 zod 필수 검사를 빼면 새 테스트 11건이 실패한다. 5e는 변이 4건에 수정 라운드 2건을 더해 모두 실패를 냈다. 수정 라운드의 카테고리 `aria-invalid` 전달을 빼면 예산·거래 테스트 2건이 실패한다.
- **전후 스크린샷**(scratchpad, 세션이 끝나면 남지 않음): 거래내역·예산·재무계좌·카테고리 다이얼로그, 자산 기록, 초대 코드.
  - 전: 빈 값에서 버튼이 비활성이다.
  - 후: 버튼이 활성이고, 누르면 필드 오류가 보인다.
  - 운영 설정 화면은 로컬 api 상태 때문에 전후 모두 "불러오지 못했습니다"라 화면을 확인하지 못했다. `CredentialsCard`는 시드 계좌가 없어 찍지 못했다.
- **e2e·a11y-check**: 처음에는 로컬 api 상태 때문에 돌리지 못했다. 사용자 승인 뒤 api 세션이 복구했고, 읽기 전용 e2e 16건 통과, a11y-check 위반 0건이다("e2e 대기" 참고).
- 미검증(실기기 필요): 바뀐 다이얼로그 오류 표시의 모바일 키보드 겹침.

## S4 실행 기록 — 화면 프리미티브 1차 (지침서 06의 1·4·5, 2026-11-21)

- 한 커밋(`309d6046`), 52파일 +1,100/−895(테스트·문서 포함). S4가 100파일을 넘어 세 세션으로 나눴다. **남은 것: 06의 3·7(판정이 vitest·lint라 api 없이 된다), 그다음 06의 6 + 11의 11.** 06의 6과 11의 11은 visual-diff가 판정이라 로컬 api가 `KISTA_ROLE=all`로 떠 있는 세션에서 한다.
- `DataList`: 시범 전환 2개(`StrategyTypeComparison`, `CycleHistoryTable`). 실측과 API 결정은 06 보정 절의 "S4 1차 실행 보정".
- `ConfirmDialog`: `ConfirmDeleteDialog`를 넓혔다. `AlertDialog` 직접 조립은 `CloseStrategyDialog` 1파일만 남았다. 계좌 삭제의 별칭 입력 확인도 `typeToConfirm`으로 옮겼다.
- `AmountInput`: `UnitInput`을 넓혔다. `type="number"` 4파일과 `InputWithUnit` 4파일은 동작 보존을 위해 그대로 뒀다. 돈이 움직이는 폼의 요청 바디는 바뀌지 않았다.
- 화면에서 달라진 것:
  - 잔고 이력 모바일 카드: 라벨 "평단"이 "평단가"로. 처음 전환에서 카드가 길어져 사용자 결정으로 배지·굵은 금액·한 줄 라벨을 되살렸다(`mobile: 'titleBadge'`, 날짜 그룹 카드). 화면 높이는 전환 전과 같다.
  - 전략 유형 비교 모바일: 사이클 값이 흐린 색으로.
  - 승인·거절·역할 변경·탈퇴 다이얼로그: 성공하면 닫힌다(전에는 열린 채 남았다).
  - 계좌 삭제 다이얼로그: 진행 중 스피너 없이 문구만, 입력칸 100자 제한 제거. `Dialog`에서 `AlertDialog`로 바뀌어 바깥 클릭으로 닫히지 않는다(Base UI `AlertDialogRoot`의 `disablePointerDismissal: true`). Esc와 취소 버튼으로 닫는다.
- **리뷰**: `/code-review high` 7건 중 5건을 고쳤고 수정분 재리뷰에서 결함이 없었다. 고친 것: 닫힘 중 확인 재클릭(역할이 되돌아갈 수 있었다), Safari 포커스 복귀, 삭제 성공 뒤 이동 전 재요청, 처리 중 트리거 차단, USD 자릿수 표기.
- **VR 입력 자릿수**(`questions.md` Q-06, 사용자 결정 A): 적립·인출은 정수만, 재설정의 매수단가는 소수 2자리까지 받는다.
- **검증**: typecheck·lint·knip 0건, 전체 vitest 261파일 1,819건 통과(+ `it.fails` 1건). 변이 확인: 모바일 숨김 옵션 제거, 이전 회차 성공 가드, 닫힘 중 클릭 가드.
- **e2e·a11y-check·visual-diff**: 통과 또는 차이 확인 완료("e2e 대기" 참고).

## S4 2차 실행 기록 — 구역 상태·표기 (지침서 06의 3·7, 2026-11-21)

- 한 커밋이다. 판단과 실측은 06 끝의 "S4 2차 실행 보정"에 있다. **남은 S4는 06의 6 + 11의 11이다.** S4b·S4c는 하지 않았다.
- `AsyncSection`·`asyncFallback`: 소비처를 실제로 옮겨 본 뒤 넣었고 `DataList`와 판정을 공유한다. `shared/ui/skeletons`로 `app`의 `animate-pulse`가 0파일이 됐다.
- 서버 재시작 안내는 조회 구역에만, 상태 코드(502·503)로 판정한다. 자동 재시도와 mutation 안내는 리뷰 지적으로 뺐다.
- 사용자 요청으로 범위를 넓혀, 프록시 밖 Route Handler의 업스트림 연결 실패도 `fetchUpstream`으로 502를 낸다.
- 태스크 7: `toFixed`·`toLocale*` 금지 lint를 위반 0에서 켰고, 성공 토스트 어미를 조사까지 고쳐 통일했다.
- **리뷰**: `/code-review high` 10건 중 9건을 고쳤다. 남은 1건(프록시 밖 Route Handler)도 사용자 요청으로 고쳤고 그 수정분을 따로 리뷰했다.
- **검증**: typecheck·lint·knip 0건, 전체 vitest 262파일 1,834건 통과(+ `it.fails` 1건). 변이 확인: 재시작 판정의 `detail` 제외, 502 변환.
- **e2e·a11y-check·visual-diff**: 로컬 api(`KISTA_ROLE=all`)에서 e2e setup 1건·chromium 15건 통과, a11y-check 위반 0건, visual-diff(`c2f06b7e` 기준) 116샷 중 차이 0건(`diff !== 0`). 첫 재실행의 116건 차이는 기준 쪽 Google 폰트 로드 실패였고 다시 돌려 해소했다. a11y-check와 visual-diff는 `fetchUpstream` 적용 전 코드로 돌렸다. e2e는 `fetchUpstream` 적용 뒤에도 돌렸다. 그때 첫 실행은 setup 결과 줄 없이 chromium 11건이 실패했고, 같은 patch로 다시 돌리니 setup 1건·chromium 15건이 통과했다. 첫 실패의 원인은 확인하지 못했다(로그를 남기지 않았다).
- **미해결 의심**: 서버 재시작 중 AT가 만료되면 `/api/auth/refresh`가 연결 실패도 401로 돌려 `clientFetch`가 로그아웃시킨다(`shared/lib/auth/refresh.ts`). 인증 흐름 변경이라 사용자 판단을 기다린다.

### S4 2차 후속 — 서버 재시작 중 세션 유지 (사용자 요청, 2026-11-21)

- 문제: 서버 재시작 중 AT가 만료되면 토큰 갱신의 연결 실패가 401로 바뀌어 `clientFetch`가 로그아웃했다.
- 고친 것: 갱신 요청이 kista-api에 **닿지 않은 것이 확실할 때**(연결 거부 등 연결 코드, 503, API URL 없음)만 세션 쿠키를 유지한다. 클라이언트는 503 `ApiError`로 조회 구역에 재시작 안내를 보이고, `proxy.ts`는 쿠키를 지우지 않은 채 보호 경로를 `/login`으로 보낸다(상태·역할을 확인할 수 없어 화면을 열지 않는다). 서버가 돌아오면 다시 방문할 때 갱신된다.
- 세션 유지에서 뺀 것: 서버 쪽 timeout·연결 끊김·500·502. kista-api는 RT를 회전하고(`TokenService.refresh`) 60초 grace 뒤 옛 RT 재제시를 전체 세션 폐기로 처리한다. 회전이 커밋된 뒤 응답만 잃었을 수 있어 옛 RT를 계속 쓰면 모든 기기가 로그아웃된다. 이 경우는 전과 같이 이 기기만 로그아웃된다.
- **남은 위험**: 브라우저의 `/api/auth/refresh` 네트워크 실패는 오프라인과 응답 유실을 구분할 수 없어 세션을 유지한다. 응답 유실이면 위 전체 세션 폐기가 날 수 있다. 근본 해결은 kista-api의 갱신을 재시도 안전하게 만드는 것이다(이 세션에서 api는 고치지 않았다).

## 로드맵 재점검 (2026-11-21)

- 끝난 묶음은 S1·S2·S3이고 다음은 S4다. 현재 상태와 새 배정은 `guides/00-roadmap.md` 1-1절과 2절이 기준이다.
- 로드맵에 없던 태스크를 배정했다. 새 묶음은 S4b(11의 8·10), S4c(06의 8 중 내비, 10의 1·15), S6b(11의 7)다. 기존 묶음에 더한 것은 S4(11의 11), S5(11의 6), S8(02의 8, 11의 2·4·5), S12(09의 7 C3, 11의 13)다.
- 10의 10은 `bdc86260`으로 이미 끝나 있었다. 09의 7은 C3만 남았다.

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
| `findings/r-implementation-review.md` | 구현 대조: 커밋 ↔ 태스크, 다르게 구현된 곳, 예상 감량 대 실제, 틀린 전제 15건 |
| `findings/s-guide-premises-01-06.md` | 지침서 01~06의 전제·가드·중단 조건·서버 선행·충돌 전수 |
| `findings/t-guide-premises-07-11.md` | 지침서 07~11의 같은 전수, 코인·KIS 지형, 승인 대기 경로 |

지침서가 실행 중 만들라고 한 산출물: `m-form-inventory.md`(04 태스크 1, 작성함). 아직 없음: `k-invalidation-map.md`(02 태스크 4), `l-move-map.csv`(03 태스크 1).

## 다른 세션과 주고받은 것

- fable-api에 전달: cross-repo 후보 6건, 주제 목록, 원칙 위반 전수 목록과 집계 명세, 검증 전용 엔드포인트·단건 조회 요청(전부 수용, api T10·T11·T12).
- fable-api에서 받음: BigDecimal은 JSON number(코드 확인), 지침서 10 규약, 예외 대장 판정(등록 예외 0건), KIS·업비트 삭제 결정, 프로세스 구조 권고(D1=A: 진입점 하나, 사용자 결정 전).
- fable-infra에서 받음: 배포 자산 후보 6건(09에 반영).

# E. 테스트·스토리·픽스처·스크립트 비대 원인 측정

측정 시점: 2026-11-11, main(HEAD 98f0373b). 읽기 전용(테스트·빌드·dev 서버 미실행). 모든 수치는 `git ls-files` 기준 파일을 파이썬 스크립트로 센 값이며 스크립트는 스크래치(`.../scratchpad/{m,b,c,d,f,g,cat}.py`)에 있다. "추정"이라 적은 것만 추정이다.

계수 규칙: 줄 수는 `\n` 개수+1(빈 줄·주석 포함). "제품 코드"는 tracked `*.ts(x)` 중 테스트·`__fixtures__`·`docs/.claude/scripts/e2e/tests/public`·`*.d.ts`·설정 파일을 뺀 것이며 생성 파일 `shared/lib/api-types.ts`(9,564줄)는 뺐다(포함하면 shared 비율이 0.23으로 왜곡됨). `components/`(shadcn 15파일 1,065줄)는 root/other에 들어간다. 케이스 수는 줄 시작 `it(`/`test(` 정규식 기준이며 `it.each` 1회는 1건으로 센다.

## 0. 먼저 결론

- 테스트가 비대하다는 인상은 절반만 맞다. 단위·컴포넌트 테스트 30,240줄 / 제품 41,934줄 = 0.72배다. 전체 TS 코드(제품+테스트+e2e+픽스처+스크립트 약 74,300줄)의 41%가 테스트·검증 계열이다.
- 3배를 넘는 "비대 슬라이스"는 사실상 없다(5절). 비대는 비율보다 소수의 큰 파일(상위 5개 파일 3,786줄 = 12.5%)과 반복 보일러플레이트(mock·wrapper·import·인라인 리터럴 합계 약 4,900줄 = 16%)에 있다.
- 동작 근거를 줄이지 않고 뺄 수 있는 양은 약 1,900~2,500줄(테스트 총량의 6~8%)이다. 그 이상을 줄이려면 매매·인증 근거를 건드리게 된다(7·8절).
- 스토리(`*.stories.*`)는 0개다. Storybook 없음.

## 1. 총량

| 범주 | 파일 수 | 줄 수 | 비고 |
|---|---:|---:|---|
| 단위·컴포넌트 테스트 (`*.test.ts(x)`) | 260 | 30,240 | 케이스 1,816(it/test 줄 기준) |
| e2e Playwright (`e2e/*.spec.ts` 5 + `tests/e2e/*.spec.ts` 1) | 6 | 395 | test() 17건. `e2e/global.setup.ts` 43줄 별도 |
| e2e 지원 코드 (`tests/e2e/support/*`) | 2 | 189 | 계좌 캐시 픽스처·락 |
| e2e 지원 코드를 검증하는 vitest (`tests/account-cache-fixture.test.ts`) | 1 | 129 | 위 260개에 포함 |
| 공용 픽스처 (`__fixtures__`) | 2 | 129 | `testMeta.ts`, `dcaTestMeta.ts` 뿐 |
| 스토리 | 0 | 0 | 없음 |
| `vitest.setup.ts` (EventSource mock 등) | 1 | 약 60+ | 전역 mock은 이것 하나 |
| `scripts/` | 12 | 1,365 | visual-diff 8파일 871, a11y-check 2파일 356, shared 1파일 95, fetch-spec.mjs |
| `.github/tests` (bats) | 3 | 85 | 배포 워크플로 계약 테스트 |
| 제품 코드 (위 기준) | 704 | 51,499 (api-types 제외 41,934) | |

계층별 제품 대 테스트(api-types 제외):

| 계층 | 제품 파일/줄 | 테스트 파일/줄 | 케이스 | 테스트÷제품 |
|---|---|---|---:|---:|
| app | 147 / 3,906 | 15 / 945 | 47 | 0.24 |
| widgets | 180 / 14,853 | 66 / 10,109 | 537 | 0.68 |
| features | 143 / 10,868 | 69 / 9,581 | 596 | 0.88 |
| entities | 130 / 7,485 | 68 / 6,199 | 356 | 0.83 |
| shared | 86 / 3,540 | 40 / 3,008 | 261 | 0.85 |
| root/other (components, proxy.ts, tests/) | 17 / 1,282 | 2 / 398 | 19 | 0.31 |
| 합계 | 703 / 41,934 | 260 / 30,240 | 1,816 | 0.72 |

참고: 제품 파일 중 테스트가 있는 비율은 widgets 66/180, features 69/143, entities 68/130, app 15/147. 테스트 파일 중 대응 제품 파일(같은 이름) 없는 것 7개(`cacheArchitecture`, `proxy.test.ts`, `tests/…` 등).

## 2. 테스트 종류 분류 (260개 전수, 파일 내용 grep)

분류 규칙: `renderHook`만 쓰면 hook, `@testing-library/react` 또는 `.test.tsx`면 component(`render(` 사용), `NextRequest` 사용·`route.test.ts`면 route, 나머지는 pure. 경계 사례(예: `*.test.tsx` 안의 순수 함수 테스트)가 있어 ±수 개 오차가 있다.

| 종류 | 파일 | 줄 | 케이스 | 파일당 평균 줄 |
|---|---:|---:|---:|---:|
| 컴포넌트 렌더 | 133 | 17,566 | 964 | 132 |
| 순수 함수 단위 | 85 | 7,625 | 653 | 90 |
| hook (`renderHook`) | 37 | 4,743 | 195 | 128 |
| Route Handler (`NextRequest`) | 5 | 306 | 18 | 61 |
| 합계 | 260 | 30,240 | 1,830* | |
| e2e (Playwright) | 6 | 395 | 17 | 66 |

*종류별 합 1,830은 `it.each(`를 별도 패턴으로 센 값, 1절·3절의 1,816은 줄 시작 `it/test` 기준. 방식 차이일 뿐 같은 모집단이다.
Route Handler는 5파일(admin/auth-refresh/runtime-config/stats/auth-callback)이며, `shared/lib/proxy/*.test.ts`(2파일)는 pure로 분류됐다. `app/api` route 24개 중 5개만 테스트가 있다.
컴포넌트 렌더 테스트가 줄의 58%를 차지한다. 이것이 감량의 1차 표적이다. 단 이 안에 StrategyForm류 핵심 화면이 섞여 있다(7절).
케이스당 평균 줄 수: 컴포넌트 18.2, hook 24.3, pure 11.7. hook이 가장 비싸다.

## 3. 비대 원인 정량화

### 3-1. setup·mock 보일러플레이트

- `vi.mock`/`vi.doMock` 문 395개, 155/260 파일(60%)에서 사용. 줄 수 합 2,384(+`vi.hoisted` 87건 포함). 테스트 파일당 평균 9.2줄, mock 쓰는 파일당 평균 15.4줄. 테스트 총량의 7.9%.
- `vi.stubGlobal`/`vi.stubEnv` 98건, `vi.spyOn` 32건.
- QueryClientProvider를 쓰는 파일 27개. 파일마다 자체 wrapper를 정의한다: `createWrapper` 11개, `createTestQueryClient` 6개, `createClient` 4개(함수 정의 기준, 이름만 다른 동형). wrapper 정의 약 324줄(앞 10줄 상한 기준 추정).
- import 문 1,034줄, 빈 줄 4,705줄, 주석 줄 283줄. 이 셋은 코드 가독성에 필요한 부분도 있어 감량 대상이 아니다. 다만 import는 mock·wrapper 복붙의 부산물이다.
- 같은 mock 블록이 복붙된 정도(파일 수 = 문 수, 정규화한 본문 동일 기준):
  - `next/navigation` 49개 파일·161줄 (본문 동일 3종이 각 3회)
  - `@entities/meta` 44개·334줄 (본문 동일 5회 + 변형 4회). 반면 공용 `MetaProvider` + `testMeta`를 쓰는 파일은 10개뿐이다. 즉 이미 올바른 공용 경로가 있는데 44개 파일이 `useMeta`를 손으로 mock한다.
  - `sonner` 39개·95줄 (동일 본문 6회+3회+3회)
  - `../api`(상대 경로 mock) 26개·144줄, `@shared/lib/api-client` 13개·67줄(동일 4회)
  - `@tanstack/react-query` 17개·73줄(동일 6회 + 변형), `next/link` 8개·24줄(동일 6회)
  - 위 6종 합계 754줄. 이 중 `vitest.setup.ts` 전역 mock이나 공용 헬퍼로 올릴 수 있는 동일 본문 블록이 대부분이다(추정 60% = 약 450줄).
- mock 최다 파일: `widgets/strategy-detail/StrategyDetail.test.tsx` 109줄(15블록), `useStrategyForm.test.ts` 75줄, `StrategyForm.test.tsx` 58줄.

### 3-2. 인라인 픽스처

- 6줄 이상인 `const/let X = { | [ | ({` 리터럴 블록 124개, 78개 파일. 모듈·describe 수준 1,185줄 + `it` 내부 201줄 = 약 1,386줄(테스트 총량의 4.6%). 최다: `HousingBenchmarkComparison.test.tsx` 107줄, `AdminTradesWorkbench.test.tsx` 70줄, `StrategyForm.test.tsx` 67줄, `AssetForm.test.tsx` 41줄.
- 공용 픽스처 팩토리는 사실상 없다. 도메인 객체(Account·Strategy·Order 등) 공용 빌더는 0개. 공용으로 쓰는 것은 메타 픽스처 2개(`testMeta`, `dcaTestMeta`)뿐이며 이를 import하는 테스트 파일은 33개(12.7%). 나머지는 파일 로컬 `make*/create*/build*` 정의 39개와 인라인 리터럴이다.
- 부산물: `as unknown as` 캐스트 29건(16개 파일), `as never`/`as any` 24건. 타입 맞는 빌더가 없어서 생기는 캐스트다(StrategyMetaSection.test.tsx:9 `{...} as unknown as Strategy` 등).

### 3-3. 구현 세부 vs 동작 단언 (총 `expect(` 3,969개)

- 카피 문자열 단언: `getByText('…')`류 837건(95개 파일), `getByRole(... name: '…')` 985건(114개 파일), `getByLabelText/Placeholder/…` 174건(28파일), `toHaveTextContent('…')` 153건(32파일). 한글 리터럴이 들어간 expect/getBy 호출은 1,219건(126개 파일 = 48%). 한글 비포함 영문 문구 단언은 따로 세지 않았다(확인 못 함).
- 접근성 role+이름 질의는 구현 세부가 아니라 사용자 관점 동작이지만 문구에 결합돼 있어 카피 변경 시 깨진다(6절 이력 참조).
- 클래스·스타일 단언(`toHaveClass`, `className`, `classList`, `toHaveStyle`): 61건(16개 파일) — 구현 세부로 분류하면 전체의 1.5%.
- 호출 횟수 단언(`toHaveBeenCalledTimes/Once`, `mock.calls`): 92건(37파일). `toHaveBeenCalledWith`는 319건(103파일)이며 상호작용 계약 단언이라 구현 세부로 단정하지 않았다.
- `getByTestId`: 114건(20파일). 스냅샷: 0건.
- 결론: 순수 구현 세부(클래스·호출 횟수·testid) 합계 약 266건 = `expect` 6.7%. 나머지는 동작 단언이다. 비대의 원인은 "구현 세부 단언"이 아니라 "문구 결합"(48%)이다.

### 3-4. 타입·lint가 이미 보장하는 것, 단순 pass-through (추정 + 예시)

추정 방법: 제목 키워드(렌더·표시한다·그대로·전달한다·shows/renders/forwards/passes)로 359건(125파일)이 후보로 잡혔으나 이 중 상당수는 실제 로직을 검증한다. 아래 구체 예시만 직접 읽고 확인했고, 전체 후보 중 진짜 pass-through는 약 80~120건으로 추정한다(미검증, 샘플 읽기 기준).

예시 10개:
1. `entities/user/model/status.test.ts:6,16,26` — 상수 테이블(`USER_STATUS_LABEL` 등)을 `toEqual`로 같은 값에 다시 대조. `Record<UserStatus,…>` 타입이 키 누락을 이미 막고, 값은 소스를 복사한 것.
2. `entities/account/model/queryKeys.test.ts:7-10` — `accountKeys.list()`가 `['accounts','list']`인지 리터럴 재진술.
3. `entities/admin/model/queryKeys.test.ts:7-11` — 키 튜플 리터럴 재진술(정규화 부분 7-9만 로직 있음).
4. `entities/finance/lib/colors.test.ts:7-8, 17-19` — 색이 서로 다른지 `Set.size`로 확인(상수 테이블 점검).
5. `entities/finance/lib/colors.test.ts:22-24` — `f(x) === f(x)` 항등 단언.
6. `features/settings/theme-select/ThemeCards.test.tsx:13-19` — 활성 테마가 `aria-pressed`로 렌더되는지(파일 전체 1케이스, mock 포함 20줄).
7. `entities/account/api/index.test.ts:20-42` — 목 `apiFetch`/`clientFetch`가 `'/api/accounts'`로 호출됐는지 확인(전달 경로 단언, 반환값 `toBe`).
8. `entities/error-log/api/index.test.ts:20-29` — URL·method·body가 `clientFetch`에 그대로 전달되는지.
9. `entities/stats/api/index.test.ts:14,28,41,54,63,76,85` — 쿼리스트링 조립 케이스 7건(`omits`, `includes`, `forwards`)이 거의 같은 구조(일부는 it.each 후보).
10. `features/auth/logout/DashboardLogoutErrorToast.test.tsx:27-33` — 카피 문자열 두 건을 그대로 `toHaveBeenCalledWith('로그아웃된 토큰입니다…')`로 재진술.
추가: `widgets/revealable-value/RevealableValue.test.tsx:46-50`(기본 prop 값 렌더), `widgets/strategy-detail/StrategyMetaSection.test.tsx:26-46`(4케이스 중 `-` placeholder).

규모: `entities/*/api/index.test.ts` 14파일·1,576줄·82케이스, 이 중 제목이 URL·쿼리·메서드 조립인 것 63건. 이 안에는 BigDecimal 문자열→number 정규화처럼 실제 로직을 단언하는 케이스도 섞여 있다(`entities/trade/api/index.test.ts:74,128,150`, `entities/strategy/api/index.test.ts:16,99-140`). 정규화 케이스는 보존하고 URL 조립 케이스만 표로 묶는 것이 안전하다.
`queryKeys/queryOptions` 테스트 10파일 437줄: `queryOptions.test.ts`는 토큰 전달·부재와 전송 실패 구분 같은 실제 계약을 갖고 있어(`entities/account/model/queryOptions.test.ts:44`) 전부 pass-through는 아니다.

lint·아키텍처 대체 가능 테스트(소스 패턴을 검사하는 테스트):
- `shared/lib/query/cacheArchitecture.test.ts` 282줄 7케이스: TS AST로 `unstable_cache`·`cacheTag` import를 금지. ESLint `no-restricted-imports`/`no-restricted-syntax`로 표현 가능한 규칙을 vitest+typescript-eslint 파서로 직접 구현한 것이다. `eslint.config.mjs`에 `no-restricted*` 규칙이 0건이어서 이쪽으로 안 옮겨진 것으로 보인다(옮겼을 때 동일 규칙이 표현되는지는 확인 못 함).
- `shared/lib/metadata.test.ts` 26줄 2케이스: `| KISTA` 접미사 금지 문자열 검색. 같은 유형.
- `tests/account-cache-fixture.test.ts` 129줄: e2e 지원 코드(`tests/e2e/support`)를 검증하는 단위 테스트. e2e가 로컬 전용이라 가치는 있으나 테스트를 위한 테스트 계층이다.

### 3-5. 같은 로직의 다계층 중복 검증

- 전략 폼 payload·검증 로직: `initialDeposit`은 17개 테스트 파일(`buildStrategyPayload`, `buildDcaPayload`, `dcaFormSchema`, `useStrategyForm`, `StrategyForm`, `DcaStrategyForm`, `StrategyFormPage`, 그리고 e2e `ledger-budget.spec.ts` 등), `gMax`는 12개, `scheduledStartDate`는 6개, `availableCash`는 6개 파일에 나온다. `useStrategyForm.test.ts`(1,169줄, 43케이스) 안의 payload/blocked 케이스가 `buildStrategyPayload.test.ts`·`strategyFormGuards.test.ts`·`strategyFormSchema.test.ts`와 같은 규칙을 hook 통합 수준에서 다시 검증한다. 겹침 규모 추정 300~450줄(미검증; 케이스별 단언 대조는 하지 않음).
- 시드 > 가용 예수금 경고: `e2e/ledger-budget.spec.ts:9-36` ↔ `useStrategyForm.test.ts:1155`, `SeedInputSection.test.tsx`, `StrategyForm.test.tsx`. e2e 1건이 앞선 3계층 단위 테스트와 같은 규칙이다(단 e2e는 요청 body가 서버로 나가는 것까지 확인하는 차이가 있다).
- 인증 가드: `e2e/auth-guard.spec.ts` 4케이스 35줄 ↔ `proxy.test.ts` 268줄(리다이렉트 규칙 전수). `/dashboard` 비보호·`/accounts` 보호·`/` 리다이렉트는 양쪽에 있다. e2e는 실제 쿠키·미들웨어 결합을 확인하므로 스모크로 가치가 있다.
- 투자금 추가·인출 폼 오류: `e2e/strategy.spec.ts:32-66` ↔ `features/strategy/inject-capital`·`withdraw-capital` 테스트(`InjectCapitalForm.test.tsx:62`에 동일 케이스).
- DCA 규칙 카드 문구: 같은 라벨 문구(예: '다음 판정')를 전략 카드·상세 쪽 테스트가 각각 단언해, 4ecda2c1(테스트 2파일)과 9c59d177(1파일) 커밋이 두 번에 나눠 고쳤다(어느 파일인지는 커밋 diff 미확인).
- e2e는 6파일 395줄·17케이스뿐이라 e2e 자체는 비대하지 않다. 중복은 "단위·컴포넌트 3계층"에서 난다.

### 3-6. `it.each`·표 주도로 줄일 수 있는 묶음

기존 `it.each`/`test.each`/`describe.each` 사용은 31건(20파일)으로 이미 쓰이고 있다. 구조 동일(문자열·숫자·식별자를 치환해 동일) `it` 3개 이상 묶음을 자동 탐지: 18묶음, 80케이스, 341줄. 상위 10:

| 파일 | 케이스 | 줄 |
|---|---:|---:|
| `shared/lib/format/index.test.ts` | 19 | 57 |
| `entities/finance/lib/period.test.ts` | 5 | 30 |
| `proxy.test.ts` | 3 | 30 |
| `app/auth/callback/route.test.ts` | 3 | 21 |
| `entities/user/model/status.test.ts` | 3 | 21 |
| `widgets/benchmark-comparison/HousingBenchmarkComparison.test.tsx` | 3 | 21 |
| `entities/strategy/model/dcaFormat.test.ts` | 6 | 18 |
| `features/strategy/create-strategy/model/strategyFormSchema.test.ts` | 4 | 16 |
| `features/strategy/create-strategy/model/strategyFormSchema.test.ts`(2번째 묶음) | 4 | 16 |
| `features/admin/settings/model/normalizers.test.ts` | 3 | 15 |

해석: 보수 기준(구조 동일만)이라 341줄이 상한이고 `it.each`로 바꿨을 때 실제 절감은 약 40~50%(150줄 안팎)다. 큰 반복은 아니다. 큰 파일이 큰 이유는 반복 케이스가 아니라 케이스마다 다른 시나리오 setup 때문이다.

## 4. 가장 큰 테스트 파일 상위 20 (대상 제품 파일 대비)

| # | 테스트 파일 | 줄 | 대상 줄 | 배율 | 케이스 |
|---|---|---:|---:|---:|---:|
| 1 | `features/strategy/create-strategy/model/useStrategyForm.test.ts` | 1,169 | 279 | 4.2 | 43 |
| 2 | `widgets/strategy-detail/StrategyDetail.test.tsx` | 888 | 125 | 7.1 | 37 |
| 3 | `widgets/benchmark-comparison/HousingBenchmarkComparison.test.tsx` | 785 | 148 | 5.3 | 33 |
| 4 | `widgets/strategy-card/StrategyCard.test.tsx` | 505 | 222 | 2.3 | 26 |
| 5 | `widgets/crypto-market-indicators/CryptoMarketSection.test.tsx` | 439 | 102 | 4.3 | 34 |
| 6 | `features/strategy/create-strategy/StrategyForm.test.tsx` | 408 | 201 | 2.0 | 20 |
| 7 | `entities/strategy/hooks/useStrategyQueries.test.tsx` | 393 | 241 | 1.6 | 15 |
| 8 | `widgets/asset-record-list/AssetRecordList.test.tsx` | 377 | 274 | 1.4 | 20 |
| 9 | `features/strategy/create-strategy/sections/VrSettingsSection.test.tsx` | 366 | 125 | 2.9 | 20 |
| 10 | `features/backtest/run-backtest/model/useBacktestForm.test.ts` | 347 | 207 | 1.7 | 14 |
| 11 | `entities/finance/lib/aggregate.test.ts` | 346 | 272 | 1.3 | 29 |
| 12 | `features/strategy/reconfigure-vr/ReconfigureVrForm.test.tsx` | 332 | 180 | 1.8 | 22 |
| 13 | `widgets/admin-trade-list/AdminTradesWorkbench.test.tsx` | 329 | 173 | 1.9 | 9 |
| 14 | `features/strategy/create-strategy/DcaStrategyForm.test.tsx` | 327 | 216 | 1.5 | 22 |
| 15 | `features/finance/manage-budgets/BudgetManager.test.tsx` | 315 | 251 | 1.3 | 15 |
| 16 | `entities/strategy/api/index.test.ts` | 295 | 243 | 1.2 | 17 |
| 17 | `features/admin/settings/ui/AdminSettingsForm.test.tsx` | 294 | 332 | 0.9 | 16 |
| 18 | `features/finance/manage-accounts/AccountManager.test.tsx` | 287 | 195 | 1.5 | 18 |
| 19 | `shared/lib/query/cacheArchitecture.test.ts` | 282 | (대응 없음) | — | 7 |
| 20 | `entities/order/api/index.test.ts` | 278 | 135 | 2.1 | 14 |

상위 5개 합 3,786줄(12.5%), 상위 20개 합 8,762줄(29.0%). 배율이 큰 이유: #2는 `StrategyDetail.tsx` 125줄이 하위 컴포넌트(`StrategyDetailContent`·`DcaStrategyDetail`·`OrderRows` 등)를 조립만 하고, 테스트는 하위 전부를 통합 렌더로 검증한다(대상 파일 줄 수가 낮게 잡힌 것은 로직이 하위로 분산됐기 때문이며 슬라이스 전체로는 1.1배, 5절). #3도 같은 구조.

## 5. 테스트 ÷ 제품 3배 초과

- 슬라이스 단위(widgets/features/entities는 도메인·슬라이스, app은 3단계 경로): 제품 코드가 있는 슬라이스 중 3배 초과는 `app/api/stats`(제품 8줄 / 테스트 54줄 = 6.8배, route 래퍼가 8줄)뿐이다. 제품 코드가 없는 테스트(대응 슬라이스 없음): `proxy.test.ts` 268줄(제품 `proxy.ts` 215줄 — 0.8배로 별도 계산하면 3배 미만. 경로 매칭이 달라 위 목록에 "제품 없음"으로 잡힌 것), `tests/` 130줄, `app/pending/PendingStatusWatcher` 63줄, `app/(admin)/layout` 36줄. 이들은 `*.test.ts`가 슬라이스 루트에 있어 경로 규칙이 안 맞은 것이다.
- 슬라이스 상위(테스트 줄 기준): `features/strategy/create-strategy` 4,371/3,213 = 1.4배, `shared/lib` 2,163/1,473 = 1.5배, `widgets/strategy-detail` 2,017/1,776 = 1.1배, `widgets/strategy-card` 597/339 = 1.8배, `widgets/account-detail` 596/404 = 1.5배, `entities/account` 536/380 = 1.4배, `entities/order` 536/396 = 1.4배.
- 파일 단위 3배 초과(대응 제품 파일 매칭 가능한 것): 13개 파일 합 4,100줄. 150줄 이상은 `useStrategyForm`(4.2), `StrategyDetail`(7.1), `HousingBenchmarkComparison`(5.3), `CryptoMarketSection`(4.3), `strategyFormSchema`(4.8).
- 결론: 슬라이스 평균으로는 3배 초과가 사실상 없고 1.1~1.8배가 최대다. "비대"는 평균이 아니라 위 5개 파일 쏠림이다.

## 6. git 이력으로 본 유지 비용 (최근 200커밋: 2026-10-22 ~ 2026-11-11)

- 테스트 파일(`*.test/spec`, `e2e/`, `tests/`, `__fixtures__`)만 고친 커밋: 5개(2.5%). 이 중 2건은 시간 제한 상향(acdb0423, 2043bc90), 1건은 e2e 신규(0b74e306), 2건은 UI 변경 후속 보정(538d795c 라벨 단언, 539d6d98 폼 변경 맞춤).
- 테스트 파일이 하나라도 포함된 커밋: 130개(65%). 제품 코드(문서·테스트 제외)를 건드린 커밋 184개 중 테스트도 함께 고친 커밋 125개(68%).
- 파일 touch 비율: 전체 1,490 중 테스트 443(29.7%). 라인 churn(추가+삭제): 테스트 7,795 / 제품 14,024(문서 제외) → 테스트가 변경 줄의 35.7%.
- 문구·표기 변경(커밋 제목에 문구/카피/라벨/표기/텍스트 등)에 테스트가 딸려 간 커밋 28건. 예시 5개:
  1. `4ecda2c1` DCA 전략 카드의 '다음 판정일'을 '다음 판정'으로 — 테스트 2/3파일
  2. `9c59d177` 남은 '다음 판정일' 표기를 테스트 제목·단언·주석에서 맞춤 — 테스트 1/2파일(카피 후속 정리용 커밋이 따로 생김)
  3. `714e56aa` 값 없을 때 자리 표기를 앱 전역 하이픈으로 통일 — 테스트 4/14파일
  4. `9cfb5b03` 크립토 전략 벤치마크 노출·통화 표기 — 테스트 7/16파일
  5. `bebcd421` 전략 유형 비교 라벨에서 "평균" 삭제 — 테스트 1/2파일
- 해석: 문구 단언이 한글 리터럴 1,219건이므로 카피 변경이 테스트 수정으로 이어지는 구조는 맞다. 다만 이 기간에 테스트만 고친 커밋은 5건뿐이라 "테스트 유지가 개발을 막는" 수준은 아니고, 변경 줄의 약 1/3이 테스트라는 점이 비용이다.

## 7. 감량 가능 / 위험 범주

경로 규칙으로 분류(자동, 겹침 없음, 합 260파일). 규칙은 `cat.py` 참조.

| 범주 | 파일 | 줄 | 케이스 | 판단 |
|---|---:|---:|---:|---|
| A. 인증·토큰·프록시·route handler (`proxy.test.ts`, `shared/lib/auth/*`, `app/api/*`, `app/auth/*`, `api-client`, `proxy/*`, `user/model/status`, `env`) | 19 | 1,567 | 103 | 감량 금지. 케이스 삭제 불가. 보일러플레이트 정리만 가능 |
| B. 매매·주문·금액·전략 폼 payload/검증 (`entities/strategy/model·api`, `entities/order`, `entities/trade`, `features/strategy/*/model`, `inject·withdraw·reconfigure`, `shared/lib/format`, `OrderRows/NextOrder/orderBanner`, finance 집계, `cacheArchitecture`) | 40 | 6,194 | 472 | 위험. 케이스 삭제 금지. 다계층 중복 병합만 신중히(3-5) |
| C. entities 훅·API 래퍼·queryKeys·providers | 43 | 3,637 | 155 | 일부 감량 가능. 정규화·토큰 분기 케이스는 보존, URL 조립 표 묶음·queryKeys 재진술 정리 |
| D. 핵심 화면 컴포넌트 렌더 (전략·계좌·백테스트 features/widgets) | 40 | 6,485 | 370 | 중간 위험. 보일러플레이트·인라인 픽스처만 축소, 단언 삭제는 신중 |
| E. 그 외 컴포넌트·hook·shared/ui·app 페이지 | 118 | 12,357 | 716 | 감량 여력이 가장 큼. 상세 단언 중복·카피 결합·mock 복붙이 몰려 있다 |

주의: 분류 B에 `useStrategyForm.test.ts`(1,169줄)가 있어 B가 크다. 이 파일은 hook 통합 테스트이면서 payload/검증 규칙 근거이기도 하다. "줄이면 위험한 범주"의 대표는 이 파일과 `buildStrategyPayload/strategyFormGuards/strategyFormSchema/vrDerived`다.
e2e(395줄)와 bats(85줄)는 CI에서 안 도는 e2e와 배포 계약 테스트라 감량 대상이 아니다. `scripts/`(1,365줄)는 테스트가 아니라 개발 도구이며 `README` 등이 있는 수동 실행용이다(`knip.json` 예외 관리). 이 보고서는 `scripts/`의 사용 빈도를 측정하지 않았다(확인 못 함).

## 8. 종합

### 8-1. 범주별 감량 가능 줄 수 (동작 보존 근거를 줄이지 않는 항목만, 추정)

| 항목 | 근거 | 추정 절감 줄 |
|---|---|---:|
| 반복 mock 공용화 (`next/navigation`, `sonner`, `next/link`, `@entities/meta`→MetaProvider+testMeta, `react-query`, `api-client`) | 동일 본문 블록 합계 754줄, 공용 setup·헬퍼로 올리면 60% 감소 | 약 450 |
| 파일별 QueryClient wrapper 21개 정의 → 공용 헬퍼 1개 | wrapper 정의 약 324줄 | 약 220 |
| 인라인 픽스처 → 도메인 빌더(Account·Strategy·Order·Meta) | 리터럴 1,386줄, 빌더+`Partial` override로 25% 감소 추정, `as unknown as` 29건 동반 제거 | 약 350 |
| `it.each` 표 묶음 | 탐지 341줄의 40~50% | 약 150 |
| API URL 조립 케이스(63건) 표 주도화 | 정규화 케이스 제외, 약 700줄 중 30% 추정 | 약 200 |
| 소스 패턴 테스트 → ESLint 규칙 (`cacheArchitecture` 282, `metadata` 26) | lint로 동일 규칙 표현 가능한지는 확인 못 함 | 약 280 (lint 설정 증가분 별도) |
| 상수 재진술·항등·단순 prop 렌더 (`status`·`colors`·`queryKeys`·`ThemeCards` 등) | 직접 읽은 예시 + 제목 후보 359건 중 80~120건 추정, 케이스당 평균 약 8줄 | 약 600~900 |
| 합계 | | 약 2,250~2,550 (테스트 총량의 7.5~8.4%) |
| 위험 구간(다계층 중복 병합, `useStrategyForm`↔`buildStrategyPayload`) | 300~450줄 추정, 단언 대조 미수행 | 별도, 합계에 불포함 |
| 카피 결합 해소(문구 단언을 상수·메타 참조로) | 줄 수 변화 거의 없음. 6절의 문구 변경 연동 수정 비용 감소 효과 | 줄 수 0 |

### 8-2. 구조적 원인 상위 5

1. 공용 테스트 인프라 부재. 전역 setup은 `vitest.setup.ts` 하나이고 `MetaProvider`+`testMeta`가 있는데도 44개 파일이 `useMeta`를 손으로 mock한다. wrapper 21개·`createTestQueryClient` 6개가 파일마다 복붙이다. 영향: mock·wrapper 보일러플레이트 약 2,700줄(테스트 9%).
2. 도메인 픽스처 빌더 부재. 인라인 리터럴 약 1,386줄, 캐스트 53건. 공용 픽스처는 메타 2개뿐이고 사용 파일 33개.
3. 대형 조립 컴포넌트·폼 hook을 통합 수준에서 한 파일에 몰아 검증. 상위 5개 파일이 3,786줄(12.5%). `StrategyDetail`은 대상 125줄에 테스트 888줄, `useStrategyForm`은 1,169줄. 케이스별 시나리오 setup이 길고 하위 단위 테스트(`buildStrategyPayload` 등)와 규칙이 겹친다.
4. 카피를 문자열 리터럴로 단언 + 같은 카피를 여러 위젯 테스트에서 각자 단언. 한글 리터럴 단언 1,219건(48% 파일), 카피 변경 커밋 28건/200이 테스트까지 고침. 줄 수보다 변경 비용 문제.
5. 계층 책임 불명확한 테스트: (a) 상수·queryKeys·정렬 재진술, 단순 URL 조립이 단위 테스트로 존재(약 600~900줄), (b) lint로 가능한 소스 패턴 검사를 vitest로 구현(308줄), (c) 같은 규칙이 hook·schema·builder·컴포넌트·e2e 다계층에서 반복(3-5).

### 8-3. 확인 못 한 것

- 의미 있는 pass-through 비율: 전체 359건 후보 중 직접 읽은 것은 약 25건. 80~120건은 샘플 비율 외삽이다.
- 다계층 중복의 정확한 단언 중복 수(케이스 단위 대조 안 함).
- ESLint로 `cacheArchitecture` 규칙을 대체 가능한지.
- `scripts/visual-diff`·`a11y-check`의 실제 사용 빈도(git log·실행 이력 미조사).
- 영문 문구 단언 수, `vitest.setup.ts` 전체 줄 수 정확값(앞 40줄까지만 확인).
- 커버리지(실행 금지로 측정 불가): 감량 후 회귀 탐지력 변화는 변이 확인 없이 평가하지 않았다.

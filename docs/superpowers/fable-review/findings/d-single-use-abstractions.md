# D. 단일 사용 추상화 측정 (kista-ui)

측정 기준: `git ls-files` 기준 `.ts/.tsx` 979개(`.d.ts` 제외). 스크립트 `scratchpad/an.mjs`(정규식 기반 import 그래프, `@alias`·상대경로 해석, `index.ts` 순수 재수출 barrel은 통과 처리)로 센다. 줄 수는 `wc -l` 방식. "core" = 테스트(`*.test.*`, `tests/`, `e2e/`)·스토리 제외(스토리 파일은 0개). 빌드·테스트·knip은 실행하지 않았다.

한계(확인 못 한 것): 정규식 파서라 동적 문자열 import, `require`, `export * as ns` 같은 특수 형태는 놓칠 수 있다. 의심 항목(사용처 0)은 grep으로 재확인했다(아래 2번 `pnl.ts`). next 규약 파일(page/layout/loading/route)은 소비처 계산에서 제외했다. `.css`·`.json`·`.mjs` 파일과 `docs/`는 줄 수에 포함하지 않았다.

## 1. 지형

| 계층 | 파일(전체) | 줄(전체) | 파일(core) | 줄(core) | 테스트 파일 |
|---|---|---|---|---|---|
| app | 162 | 4,689 | 147 | 3,759 | 15 |
| widgets | 246 | 24,716 | 180 | 14,673 | 66 |
| features | 213 | 20,243 | 144 | 10,731 | 69 |
| entities | 199 | 13,605 | 131 | 7,474 | 68 |
| shared | 127 | 15,986 | 87 | 13,018 | 40 |
| components(shadcn) | 15 | 1,050 | 15 | 1,050 | 0 |
| lib | 1 | 1 | 1 | 1 | 0 |
| 루트(proxy, next.config 등) | 6 | 619 | 4 | 293 | 2 |
| tests / e2e | 10 | 750 | 0 | 0 | 10 |
| 합계 | 979 | 81,659 | 709 | 50,999 | |

- shared의 13,018줄 중 `shared/lib/api-types.ts`(생성 파일)가 약 10,000줄이다. 이를 빼면 shared core는 약 3,000줄이다.
- 슬라이스 수: entities 16, widgets 42, features 31(그룹/슬라이스 2단). 슬라이스당 평균(core): entities 8.2파일·467줄, widgets 4.3파일·349줄, features 4.6파일·346줄. 테스트 포함 시 entities 12.4파일·850줄, widgets 5.9파일·588줄, features 6.9파일·653줄.
- 파일 크기 분포(core 709개): 30줄 미만 324(46%), 30~100 240, 100~300 135, 300줄 이상 10. 전체(테스트 포함 979개)는 364 / 370 / 220 / 25.
- 계층별 30줄 미만 core 파일: app 104/147, widgets 59/180, features 44/144, entities 64/131, shared 46/87.

## 2. shared / components / lib 사용처 수 (파일 단위, 비테스트 importer 파일 수)

`lib/utils.ts`는 1줄(`export { cn } from '@shared/lib/utils'`, shadcn 호환용)이다. 수치: `shared`(export가 있는 파일 82개) 사용처 0곳 0개, 1곳 10개(367줄), 2곳 12개(476줄), 3곳 이상 60개. `components/ui`(15개): 1곳 2개(179줄), 나머지 3곳 이상.

사용처 1곳(비테스트):

| 파일 | 줄 | 유일한 사용처 | 테스트 import |
|---|---|---|---|
| components/ui/pagination.tsx | 130 | shared/ui/PaginationBar.tsx | 0 |
| components/ui/sonner.tsx | 49 | app/layout.tsx | 0 |
| shared/lib/format/pnl.ts | 6 | shared/lib/format/index.ts(barrel 재수출뿐) | 아래 참고 |
| shared/lib/hooks/use-decimal-amount-text.ts | 50 | features/strategy/create-strategy/sections/SeedAmountInput.tsx | 0 |
| shared/lib/hooks/use-scrolled-to-end.ts | 33 | widgets/strategy-detail/NextOrderCard.tsx | 1 |
| shared/lib/normalize.ts | 15 | entities/strategy/api/index.ts | 1 |
| shared/lib/query/detailFromList.ts | 16 | entities/account/model/queryOptions.ts | 1 |
| shared/providers/Providers.tsx | 14 | app/layout.tsx | 0 |
| shared/providers/QueryProvider.tsx | 11 | shared/providers/Providers.tsx | 0 |
| shared/ui/SuggestionListEditor.tsx | 110 | features/finance/manage-strategy-suggestions/StrategySuggestionManager.tsx | 1 |
| shared/ui/YearSelect.tsx | 66 | widgets/finance-summary/FinanceSummaryParts.tsx | 1 |
| shared/ui/stepper/Stepper.tsx | 46 | features/account/create-account/CreateAccountStepper.tsx | 0 |

사용처 2곳: shared/lib/auth/redirectPath.ts(21), auth/refresh.ts(46), firebase.ts(24), hooks/use-media-query.ts(18), hooks/use-reload-on-chunk-error.ts(31), hooks/use-search-param.ts(19), indicators.ts(37), subviewHistory.ts(61), ui/CurrencyToggle.tsx(24), ui/EquityLineChart.tsx(101), ui/SectionTabBar.tsx(47), ui/SegmentedTabs.tsx(47). 합 476줄.

- 사용처 0곳(파일 단위): 없다. 처음 스크립트가 `AdminTableSkeleton`·`ModalFormSkeleton`을 0곳으로 잡았으나 `export { X as default } from` 형태의 `loading.tsx`가 소비처였다(스크립트 수정 후 3곳·해당 수로 정정).
- 테스트에서만 쓰이는 export(export 단위, 비테스트 사용 0): `shared/lib/format/index.ts`의 `pnlTextClass`(`shared/lib/format/pnl.ts:2`, barrel 재수출 `shared/lib/format/index.ts:187`, 사용은 `index.test.ts:81`뿐 — grep 확인), `shared/lib/subviewHistory.ts`의 `pushSubviewEntry`·`SUBVIEW_HISTORY_KEY`, `shared/lib/query/createQueryClient.ts`의 `QUERY_DEFAULT_STALE_TIME`·`QUERY_DEFAULT_GC_TIME`, `components/ui/button.tsx`의 `buttonVariants`(knip이 `components/ui/**`를 예외 처리: `knip.json`). `shared/lib/api-types.ts`의 `paths/webhooks/$defs/operations` 4개는 생성 파일이라 제외.
- export 단위(shared+components 총 205개 export): 비테스트 사용처 0곳 10개(위 항목, 생성 4개 포함), 1곳 36개, 2곳 30개. 파일 사용처가 3곳 이상인 파일 안에도 사용처 1곳 export가 14개 있다(예: `shared/ui/TableHeadCell.tsx`의 `TABLE_HEAD_TEXT_CLASS`, `shared/ui/iconButtonStyles.ts`의 `VARIANT_CLASS`, `shared/lib/date-range.ts`의 `kstDateMinusDays`·`kstWeekStartDate`, `shared/lib/proxy/routeHelpers.ts`의 `sseAuthErrorResponse`, `shared/lib/auth/jwt.ts`의 `isJwtExpired`).
- 해석: shared의 "공용" 82개 중 22개(27%, 843줄)는 사용처가 2곳 이하이다. 다만 shared는 FSD상 계층 규칙(동일 계층 cross-import 금지) 때문에 두 슬라이스가 쓰는 코드를 올릴 곳이 shared뿐이어서, 2곳짜리는 "승격"이 구조적으로 강제된 면이 있다. 1곳짜리 12개(546줄)가 순수한 후보이다.

## 3. entities / features / widgets 소비 슬라이스

소비 슬라이스 = 슬라이스 밖에서 import하는 비테스트 파일의 슬라이스(app은 파일 단위). 슬라이스 내부 import는 제외.

| 계층 | 슬라이스 | 소비 1곳 | 파일/줄(core) |
|---|---|---|---|
| entities | 16 | 0 (분포: 2곳 5개, 6~31곳 11개) | - |
| features | 31 | 21 (68%) | 63파일 / 4,037줄 |
| widgets | 42 | 30 (71%) | 126파일 / 10,582줄 |

- entities는 소비 1곳짜리가 없다. 2곳짜리 5개: admin-settings, backtest, error-log, fcm, privacy.
- features 21개 소비 1곳 목록(→ 소비처): account/edit-account 247줄 → app page; admin/approve-reject 105, admin/change-role 84, admin/withdraw-user 71 → widgets/admin-user-list; admin/error-logs 187 → widgets/admin-log-list; admin/logs 55, admin/settings 733 → app page; asset/toggle-monthly-check 48 → widgets/asset-record-check; backtest/run-backtest 464 → widgets/backtest; finance/hide-amounts 21, manage-accounts 428, manage-group 448, manage-strategy-suggestions 44 → widgets/asset-settings; settings/{delete-user-account 60, edit-nickname 93, notification-channel 149, notification-prefs 43, theme-select 67} → widgets/settings; strategy/inject-capital 133, reconfigure-vr 412, withdraw-capital 145 → app `*FormBody.tsx`.
- features 슬라이스가 widgets 1곳에서만 쓰이는 비율: 15/31(48%). app 파일 1곳만: 6/31. 소비 계층 조합 전체: widgets만 16, app만 9, app+widgets 6.
- widgets 슬라이스가 app 파일 1개에서만 쓰이는 비율: 27/42(64%, 10,350줄, 120파일). widgets 전체가 app에서만 소비되는 것은 34/42. widgets 중 소비가 여러 곳인 것은 12개(layout, page-header, error-display, glass-card, kpi-card 등 공용 UI 성격). 참고: widgets 간 import(동일 계층 cross-import)가 8개 슬라이스에서 관측된다(예: kpi-card ← 6개 widgets, strategy-card ← all-strategies/strategy-list, cycle-history ← account-detail/strategy-detail). 규칙 위반 후보이며 이번 과제 범위 밖이라 개수만 적는다.
- 상위 소비 1곳 widgets(줄): strategy-detail 1,761(15파일), benchmark-comparison 1,503(17), stats-overview 819(11), crypto-market-indicators 670(5), asset-record-list 553(4), admin-trade-list 469(5).

## 4. barrel (`index.ts`)

- 105개, 합 2,115줄. 그중 순수 재수출만 하는 barrel 87개(83%), 481줄. 나머지 18개는 entities `api/index.ts` 16개와 `shared/lib/api-client/index.ts`·`shared/lib/format/index.ts`로, 실제 코드를 담고 있다(합 1,634줄).
- 계층별: widgets 37개(합 45줄, 모두 순수), features 31개(합 46줄, 모두 순수), entities 32개(16개 순수), shared 5개(3개 순수).
- 순수 barrel 87개 중 54개는 모듈 1개만 재수출(1줄짜리), 31개는 직접 importer가 정확히 1개이다. 직접 importer 0개인 순수 barrel은 없다.
- barrel 자체의 줄 수는 작다(순수 barrel 합 481줄). 비용은 줄이 아니라 파일 수(87개, core 709개의 12%)와 경로 간접이다.

## 5. 래퍼 컴포넌트 (30줄 미만, 단일 자식·프로퍼티 전달, hook/조건 로직 없음)

휴리스틱: `.tsx` 30줄 미만, 고유 대문자 태그 1~2개, `use*()`·`if`·`.map`·`?`·`&&` 없음, 소문자 태그 4개 이하. 조건을 넘는 래퍼(로직이 조금 있는 것)는 놓친다. 총 58개 검출(app 48, components 2, shared 4, widgets 4)이며 이 중 app 48개는 Next 규약상 필요한 `page/loading/layout/route`라 "라우트 보일러플레이트"로 따로 본다.

shared/widgets/components 10개:

| 파일 | 줄 | 소비 | 내용 |
|---|---|---|---|
| components/ui/button.tsx | 22 | 61 | shadcn 래퍼(ButtonPrimitive+cva) |
| components/ui/input.tsx | 20 | 32 | shadcn 래퍼 |
| shared/ui/TableDataCell.tsx | 12 | 15 | `<td>` 스프레드 |
| shared/providers/Providers.tsx | 14 | 1 | QueryProvider+ThemeProvider 합성 |
| shared/ui/AdminTableSkeleton.tsx | 20 | 3 | Skeleton 반복 |
| widgets/benchmark-comparison/BenchmarkStates.tsx | 19 | 1 | Skeleton |
| widgets/cycle-history/StrategyTradesTab.tsx | 19 | 1 | `<CycleHistoryTable>` 위임 |
| widgets/dashboard/DashboardSkeleton.tsx | 24 | 2 | Skeleton |
| widgets/dashboard/MarketChartCard.tsx | 26 | 1 | Surface+MarketChartCardInner |
| widgets/glass-card/BrandWordmark.tsx | 13 | 2 | Image+span |

app 라우트 래퍼 48개(패턴별, 각 파일 5~19줄):

- `@modal/(.)…/page.tsx` 8개(전략 수정·신규·inject-capital·reconfigure-vr·withdraw-capital, 가계부 수정, 예산 수정·목록): `<RouteModal><XFormBody …/></RouteModal>`만 있다(예: `app/(main)/@modal/(.)finance/new/page.tsx`, 14줄).
- `<div className="max-w-lg mx-auto"><XFormBody/></div>`형 `page.tsx` 7개(예: `app/(main)/finance/new/page.tsx:12-18`).
- 동일 구조 `loading.tsx` 스켈레톤 13~14줄 11개 이상(`<Skeleton/>` + `CardSkeleton` 반복; 예: `app/(main)/finance/new/loading.tsx`).
- `FlowPageView` 위임 `page.tsx` 3개(expense/income/saving, 각 5줄), `BenchmarkPageContent.tsx` 23줄(소비 1), `not-found.tsx`·`stats/layout.tsx`·`dashboard/loading.tsx` 등.

## 6. 한 번만 호출되는 custom hook

hook 파일(`use*.ts(x)`, 테스트 제외) 46개, 합 3,520줄. 소비처 1곳(비테스트 파일 1개): 14개, 717줄. 소비 0곳은 없다(knip 0건과 일치).

재사용 없이 컴포넌트/훅에서 로직만 떼어낸 것(소비처가 같은 슬라이스/디렉토리): 7개, 444줄.

| 파일 | 줄 | 유일한 소비처 |
|---|---|---|
| app/(main)/finance/(dashboard)/(flow)/useFinanceFlowData.ts | 134 | 같은 디렉토리 FlowPageView.tsx |
| features/strategy/create-strategy/model/useStrategyFormData.ts | 44 | model/useStrategyForm.ts |
| features/strategy/create-strategy/model/useStrategyFormEffects.ts | 101 | model/useStrategyForm.ts |
| features/strategy/create-strategy/model/useTypeDefaults.ts | 70 | model/useStrategyForm.ts |
| widgets/benchmark-comparison/model/useBenchmarkStrategyOptions.ts | 38 | HousingBenchmarkComparison.tsx |
| widgets/benchmark-comparison/model/useEtfBenchmarkOptions.ts | 21 | HousingBenchmarkComparison.tsx |
| widgets/strategy-detail/useTodayMarketStatus.ts | 36 | StrategyDetail.tsx |

슬라이스 간 단일 사용 7개(273줄): entities hook 6개(`entities/admin-settings/hooks/useAdminSettings.ts` 28, `admin/hooks/useAdminTradesQuery.ts` 21, `backtest/hooks/useBacktestMutation.ts` 15, `fcm/hooks/useFcmToken.ts` 59, `trade/hooks/useDailyTradesRangeQuery.ts` 67 — 쿼리 1개를 감싼 hook을 entities에 둔 형태) + shared hook 2개(`use-decimal-amount-text.ts` 50, `use-scrolled-to-end.ts` 33).

주의: 파일명이 `use*`가 아닌 파일 안에 정의된 hook이나 컴포넌트 파일 내부 hook은 세지 않았다.

## 7. 설정·상수·타입 전용 파일 중 소비 1곳

JSX·`export function/class`가 없는 파일을 기준으로(생성 파일 `api-types.ts`, 루트 config 제외) 50개가 검출됐고 그중 소비 1곳이 5개(53줄)뿐이다. 이 코드베이스는 상수·타입 전용 파일이 많지 않다.

- `features/strategy/withdraw-capital/model/withdrawCapitalFormSchema.ts` 23줄 → 같은 슬라이스 `WithdrawCapitalForm.tsx`
- `features/strategy/inject-capital/model/injectCapitalFormSchema.ts` 14줄 → `InjectCapitalForm.tsx`
- `entities/error-log/model/types.ts` 6줄 → `entities/error-log/api/index.ts`
- `entities/privacy/model/options.ts` 5줄 → `widgets/admin-privacy-trade-list/orderSelectItems.ts`
- `features/admin/settings/ui/recurringModeOptions.ts` 5줄 → `RecurringModeEditor.tsx`

범위를 넓힌 지표(다른 단일 사용 파일): 계층 규약 파일(`page/layout/loading/route` 등)을 뺀 core 471개 파일 중 소비 1곳이 225개(48%, 21,848줄). 그중 같은 슬라이스 안에서만 쓰이는 파일(내부 분할)이 124개/12,618줄, 슬라이스 밖에서 쓰이는 단일 소비가 101개/9,230줄이다(대부분 widgets 진입 컴포넌트 45개 + features 진입 33개 + entities 13개). 내부 분할 상위: features/strategy/create-strategy 19파일·1,873줄, widgets/strategy-detail 8·1,215, widgets/benchmark-comparison 12·1,090, widgets/admin-privacy-trade-list 5·921, features/account/create-account 6·791. 이들은 "한 컴포넌트를 쪼갠 것"이라 추상화라기보다 분할 비용이다.

## 8. FSD 계층 분리 비용 — 3개 기능의 파일 분산

import 폐포(비테스트, barrel은 실제 사용 이름으로 풀어 계산) 기준. 아래 목록에서 shared·components·`entities/{meta,runtime-config,user,stats,order,trade}`와 api-types는 공통 인프라로 보고 제외했다. 추가로 BFF 경유 때문에 `app/api/<domain>/[[...path]]/route.ts`(catch-all)가 한 장 더 있으나 import 그래프에 잡히지 않는다.

### (1) 전략 수정 — `/accounts/[id]/strategies/[sid]/edit`
폐포 전체 99파일 / 16,152줄(api-types 약 10,000줄 포함), 15개 디렉토리(app, components, shared/{lib,model,ui}, entities 7개, features 1개, widgets 1개). 주요 구현 파일 48개:
- app 3: `(main)/@modal/(.)accounts/[id]/strategies/[sid]/edit/page.tsx`(14), `edit/page.tsx`(19), `edit/EditStrategyFormBody.tsx`(34). 그 외 `loading.tsx` 2개
- entities/account 6, entities/strategy 10(`api/index.ts` 242, `hooks/useStrategyQueries.ts` 240, `model/*`, `ui/VrFieldControls.tsx` 239 등)
- features/strategy/create-strategy 32(폼 `StrategyForm.tsx` 200, `DcaStrategyForm.tsx` 215, `model/useStrategyForm.ts` 278, `strategyFormGuards.ts` 200, `sections/*` 14개 등. 이름은 create지만 edit도 이 슬라이스를 쓴다)
- widgets/page-header 1
- 의견: "수정"이라는 이름의 슬라이스가 없다. 기능 소재 위치가 app(3) → features(32) → entities(16) → widgets(1) 4개 계층 + 이름 불일치(create-strategy)에 흩어진다.

### (2) 가계부 자산/거래 기록 추가 — `/finance/new` (`features/asset/save-asset`)
참고: 이름이 비슷한 `features/finance/save-transaction`(`NewTransactionButton`, `TransactionFormDialog`, `transactionFormHelpers`, `index.ts`)은 다이얼로그 경로이고 `/finance/new`는 `features/asset/save-asset`을 쓴다. 폐포 55파일 / 13,367줄(api-types 포함), 10개 디렉토리. 주요 구현 파일:
- app 3 + loading 2: `(main)/@modal/(.)finance/new/page.tsx`(14), `finance/new/page.tsx`(19), `NewAssetFormBody.tsx`(30)
- entities/finance 9: `api/index.ts` 360, `hooks/useFinanceMutations.ts` 465, `useFinanceQueries.ts` 75, `useCategoryPathState.ts` 24, `lib/aggregate.ts` 271, `lib/categoryTree.ts` 57, `model/{queryKeys,queryOptions,types}.ts`
- features/asset/save-asset 5: `AssetForm.tsx` 232, `AssetFormFields.tsx` 144, `AssetFormPage.tsx` 23, `model/assetFormHelpers.ts` 119, `model/loadAssetFormContext.ts` 9
- widgets/page-header 1, entities/{meta,user} 7
- 의견: 폼 구현(features) 5파일에 비해 진입 경로(app 5파일: modal page·page·loading×2·FormBody)와 엔티티 9파일이 따로 있다.

### (3) 계좌 수정 — `/accounts/[id]/edit`
폐포 38파일 / 11,389줄(api-types 포함), 13개 디렉토리. 주요 구현 파일:
- app 1: `(main)/accounts/[id]/edit/page.tsx`(39)
- features/account/edit-account 2: `EditAccountForm.tsx` 179, `CredentialsCard.tsx` 67 (+ `index.ts`)
- entities/account 8: `api/index.ts` 66, `hooks/useAccountMarginQuery.ts` 99, `model/{apiKeyExpiry,brokerCredentials,queryKeys,queryOptions,types}.ts`, `ui/ApiKeyExpiryField.tsx` 21
- entities/strategy 2(`model/queryKeys.ts`, `model/types.ts`), widgets/page-header 1
- 의견: 구현 자체는 features 247줄 + 진입 39줄로 작은데, 타입·쿼리키 때문에 entities/strategy까지 끌고 온다(`queryKeys`로 invalidate하려고 import).

## 9. knip과의 관계

knip 0건이므로 "미사용"이 아니라 "사용처 1곳"만 대상으로 했다. 위 2번의 테스트 전용 export(`pnlTextClass` 등)는 knip이 `ignoreExportsUsedInFile`·`components/ui/**` 예외 설정(`knip.json`)과 테스트 import 때문에 통과시키는 것으로 추정된다(knip 실행은 하지 않았으므로 추정).

## 10. 종합

카테고리별 합산(중복 제거 전):

| 범주 | 파일 | 줄 |
|---|---|---|
| A. shared/components 소비 1곳 | 12 | 546 |
| B. 소비 1곳 features 슬라이스 전체 | 63 | 4,037 |
| C. 단일 app 파일만 쓰는 widgets 슬라이스 전체 | 120 | 10,350 |
| D. 단일 사용 hook | 14 | 717 |
| E. 순수 barrel | 87 | 481 |
| F. 소비 1곳 이하 비-app 얇은 래퍼 | 4 | 약 80 |

- 좁은 정의(A+B+D+E+F의 합집합): 156파일 / 5,739줄(core 709파일 / 50,999줄 대비 파일 22%, 줄 11%).
- 넓은 정의(위 + C): 248파일 / 15,949줄(파일 35%, 줄 31%). 단 C는 "페이지 본문"이라 재사용이 없는 것이 정상일 수 있고, 계층 분리 자체의 비용 지표로만 본다.
- 인라인·통합하면 파일이 실제로 사라질 것으로 추정: 순수 barrel 87 + 같은 슬라이스 단일 사용 hook 7(인라인 시 컴포넌트가 그만큼 커진다) + 얇은 래퍼 4 + 상수/타입 5 + `pnl.ts` 1 = 약 104파일(약 1,062줄, core 파일의 15%, 줄의 2%). 줄 수는 거의 줄지 않고 파일·간접 경로가 줄어드는 형태다. 반대로 슬라이스 병합(소비 1곳 features 21개를 소비 widgets/app 쪽으로)은 barrel 외 파일을 없애지는 못하고 이동만 한다.
- 핵심 관찰: 비대의 줄 수 기여는 "단일 사용 공용 코드"가 아니라 (a) 큰 기능 슬라이스 내부 분할(소비 1곳 파일 225개, 21,848줄)과 (b) 테스트(전체 81,659줄 중 약 30,660줄, 38%)에 더 크다. 순수한 단일 사용 추상화(A+D+E+F)의 직접 줄 수는 작다.

구조적 원인 상위 5개:

1. 계층 분리 규약이 소비 1곳 슬라이스를 양산한다. features 31개 중 21개, widgets 42개 중 30개가 소비 1곳이다. 예: `features/settings/*` 5개 슬라이스(합 412줄)가 `widgets/settings` 1곳에서만 쓰이고(`features/settings/theme-select/index.ts:1` 등) `widgets/settings`는 `app/(main)/settings/page.tsx` 1곳에서만 쓰인다. 한 화면이 app → widgets → features(×5) → entities 4계층으로 나뉜다.
2. 슬라이스마다 `index.ts` 강제로 순수 barrel 87개. 54개는 1줄짜리(`features/settings/theme-select/index.ts` = `export { ThemeCards } from './ThemeCards'`), 31개는 importer가 1개이다.
3. 폼 라우트 1개당 app 파일 5개 패턴. 일반 `page.tsx` + `@modal/(.)…/page.tsx` + `loading.tsx` ×2 + `*FormBody.tsx`로 구성되며 본문은 `RouteModal`/`div` 래퍼뿐이다(`app/(main)/@modal/(.)finance/new/page.tsx:6-13`, `app/(main)/finance/new/page.tsx:12-18`, `app/(main)/finance/new/loading.tsx:4-11`). 폼 라우트 수만큼 반복되어 app 래퍼 48개를 만든다.
4. 훅·로직 분리가 기본 관행이어서 단일 사용 hook과 단일 소비 내부 파일이 늘어난다. `features/strategy/create-strategy/model/useStrategyForm.ts:13-21`이 하위 hook·헬퍼 9개를 import하며 그중 hook 3개(`useStrategyFormData` 44, `useStrategyFormEffects` 101, `useTypeDefaults` 70)는 이 파일에서만 쓰인다. 소비 1곳 내부 분할 124파일/12,618줄이다.
5. shared/entities 승격 규칙. 두 슬라이스가 쓰면 shared로, 쿼리 1개짜리도 entities hook으로 올리는 관행 때문에 shared 12개(546줄)와 entities hook 6개가 소비 1곳이다(`shared/ui/SuggestionListEditor.tsx` 110줄 → 1곳, `shared/ui/YearSelect.tsx` 66줄 → 1곳, `entities/trade/hooks/useDailyTradesRangeQuery.ts` 67줄 → `widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx` 1곳). 또 `Providers.tsx` → `QueryProvider.tsx`처럼 파일 하나를 건너 위임하는 shared 래퍼도 있다(`shared/providers/Providers.tsx` 14줄).

재현: 스크립트와 중간 산출물은 `/private/tmp/claude-501/-Users-phs-workspace-kista-kista-ui/8d2ab239-c12e-41c9-8afd-e894aae9f287/scratchpad/`(`an.mjs`, `s2~s10.mjs`, `R.json`)에 있다.

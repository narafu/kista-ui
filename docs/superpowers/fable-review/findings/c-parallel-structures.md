# C. 평행 구조 측정 (kista-ui)

측정 방식: `wc -l`, `grep -c/-l`, `find`, `diff`로 센 값이다. 테스트 파일(`*.test.*`)은 기본적으로 제외했다. 표기 "추정"은 diff 결과에서 유추한 값이고, 그 외는 명령 출력 그대로다.
빌드·테스트·dev 서버는 실행하지 않았다.

기준 규모 (테스트 제외 `.ts/.tsx`): entities 7,474줄 / features 10,731 / widgets 14,673 / shared 13,018 / app 3,759 (합계 49,655줄).
shared가 크지만(13,018줄) 생성 타입이 포함되는지는 확인하지 않았다.

diff 표기 규칙: `A-only=n B-only=m`은 `diff A B`에서 A에만/B에만 있는 줄 수다. 두 파일이 완전히 같은 골격이면 둘 다 0에 가깝다.

---

## 1. Route Handler (`app/api/**/route.ts`)

총 22개, 377줄 (테스트 제외).

| 모양 | 개수 | 줄 수 | 비고 |
|---|---|---|---|
| A. `createProxyRoute()` 공용 헬퍼 사용 (그대로 프록시) | 13 | 102 | 11개가 5~7줄. `admin`(23줄)은 `Cache-Control: no-store` 래퍼, `runtime-config`(13줄)는 `requireAuth:false` + 헤더 추가 |
| B. 헬퍼 없이 직접 `getAuthToken` + `fetch` + `relayUpstreamError` | 5 | 155 | `auth/me` 44, `auth/logout` 35, `auth/reapply-done` 31, `fcm/tokens` 23, `fcm/tokens/[token]` 22 |
| C. 쿠키 발급·갱신 | 1 | 33 | `auth/refresh` (Set-Cookie 직접 조립) |
| D. SSE 스트림 | 2 | 82 | `trades/stream` 46, `auth/status-stream` 36 |
| E. 그 외 | 1 | 5 | `health` |

- 공용 헬퍼: `shared/lib/proxy/createProxyRoute.ts`(67줄) + `routeHelpers.ts`(53줄). 헬퍼 사용 13개 / 미사용 9개.
- 대표 예시
  - 그대로 프록시: `app/api/accounts/[[...path]]/route.ts:1-6` (6줄), `app/api/finance/[[...path]]/route.ts` (5줄)
  - 수동 토큰 fetch: `app/api/fcm/tokens/route.ts:6-23`, `app/api/auth/me/route.ts:12-44`
  - 쿠키: `app/api/auth/refresh/route.ts:7-33`
- 비교 `diff`: `stats/[[...path]]/route.ts`(7줄) vs `trading-cycles/[[...path]]/route.ts`(6줄) — 달라지는 건 `basePath` 한 줄뿐이다.
- 관찰: 프록시 계층은 이미 헬퍼로 정리돼 있다. 남은 중복은 B군(5개, 155줄)의 "토큰 취득 → fetch → 에러 릴레이" 골격이다.

## 2. entities api 함수 / React Query hook

- `entities/*/api/index.ts`: 16개 파일, 1,307줄. 함수 선언 130개 (finance 42, strategy 16, admin 13, user 9, account 8, stats 8, market 7, 나머지).
- 같은 쿼리의 서버/클라이언트 이중 정의: `fetchEither`(서버면 `apiFetch`, 클라이언트면 `clientFetch`)로 통합돼 있다. `token?: string` 파라미터를 가진 함수가 87개다. `apiFetch`만 쓰는 함수는 `listAdminAuditLogs`, `getAdminAnomalies` 2개뿐이고 `app/(admin)/admin/logs/page.tsx:60,63`에서만 호출된다. 이중 정의된 쿼리는 확인되지 않았다.
- query key: `entities/*/model/queryKeys.ts` 방식의 객체 팩토리(`strategyKeys.lists()` 등). 파일 수와 줄 수는 `find entities -name queryKeys.ts` 기준 합계 167줄이고, test 포함 여부는 구분하지 못했다.
  `queryOptions()` 래퍼는 `entities/*/model/queryOptions.ts` 11개 파일, 320줄, 30개 export. 서버 prefetch와 클라이언트 훅이 같은 `queryOptions`를 공유한다.
- React Query 호출 (테스트 제외, entities+features+widgets): `useQuery(` 35, `useMutation(` 21, `useSuspenseQuery`·`useInfiniteQuery`·`useQueries` 0. react-query를 직접 부르는 파일 17개(entities 14, features 1, widgets 2).
- `entities/*/hooks/`: 23개 파일, 1,912줄. entities의 export된 `use*` 함수 125개, 그중 `use*Mutation` 계열은 entities+features+widgets에서 73개.
  - 최대 파일: `finance/hooks/useFinanceMutations.ts` 465줄(`use*Mutation` 33개), `strategy/hooks/useStrategyQueries.ts` 240, `admin/hooks/useAdminQueries.ts` 208, `user/hooks/useUserQueries.ts` 121.
- "api 함수 + key를 묶는 것뿐"인 얇은 hook: `return useQuery(xxxQueryOptions(...))` 형태가 17개 (grep `return useQuery\(\w+QueryOptions`). 예: `entities/account/hooks/useAccountQueries.ts:17-19`.
- mutation 반복 패턴
  - `onError: (err) => toast.error(apiMsg(err, '...'))`: 28회 (entities 27 + `features/strategy/manage-strategy/useManageStrategyMutations.ts` 1). 파일별: user 7, finance 5, privacy 5, admin 4, strategy 3, account 2, admin-settings 1.
  - 이미 만든 헬퍼: `useInvalidateFinanceMutation`(`useFinanceMutations.ts:260`)을 28곳이 사용한다. `useStrategySaveMutation`을 strategy 5곳이 사용한다.
  - `invalidateQueries` 호출 35회, 컴포넌트에서의 `mutate/mutateAsync` 호출 55회.
- 관찰: finance 쪽은 `shareToggle`, `useInvalidateFinanceMutation`, `synchronizeListQueries`로 이미 압축돼 있다. 그런데도 `share/unshare/delete` 훅이 자산·카테고리·계좌·거래·예산 5개 리소스에 각각 반복된다 (api 쪽 `delete|share|unshare` 함수 16개, 훅 쪽 `useInvalidateFinanceMutation` 사용 28곳). 인스턴스마다 다른 부분은 함수 이름, 엔드포인트, key, 에러 문구 약 3~4줄이다.

## 3. 서버 프리페치 (`app/**/page.tsx`)

- `page.tsx` 50개 / 1,520줄. `<HydrationBoundary`를 쓰는 파일 21개(page.tsx 16 + Body/layout 5), 합계 893줄. `prefetchQuery` 29회(테스트 제외), `fetchQuery(` 37회.
- 반복 골격: `getAuthToken()`/`requirePageToken()` → `createQueryClient()` → `prefetchQuery(xxxQueryOptions(..., token))` → `<HydrationBoundary state={dehydrate(queryClient)}>`. 위 5개 식별자 라인만 21개 파일에서 144회 나온다. `if (token)` 게이팅 14회, `.catch(() => ...)` 31회.
- 페이지당 줄 수: admin 계열 22~111줄 (`admin/pending` 22, `admin/users` 34, `admin/logs` 111 최대), main 계열 19~56줄.
- 대표 예시: `app/(admin)/admin/users/page.tsx:15-34` (34줄 중 prefetch 골격이 약 12줄).
- 이중 정의: 앞서 말했듯 `queryOptions`가 서버·클라이언트에서 공유돼 0건으로 확인했다.
- 서버·클라이언트 이중 정의는 없지만, "페이지 + `loading.tsx` + `@modal` 인터셉트 페이지 + `*FormBody`" 4종 세트가 폼 라우트마다 반복된다 (5절 아래 묶음 참고).

## 4. 폼

- 폼 컴포넌트(이름에 `Form` 포함, `.tsx`, 테스트 제외) 31개. 폼 라이브러리는 두 갈래다.
  - react-hook-form + zod: `useForm` 사용 파일 6개 — `features/strategy/` 아래 `DcaStrategyForm.tsx`(215줄), `create-strategy/model/useStrategyForm.ts`(278), `sections/DcaRuleEditor.tsx`(62), `InjectCapitalForm.tsx`(118), `WithdrawCapitalForm.tsx`(121), `ReconfigureVrForm.tsx`(179). zod 스키마 5개(`dcaFormSchema` 187, `strategyFormSchema` 45, `reconfigureVrFormSchema` 68, `injectCapitalFormSchema` 14, `withdrawCapitalFormSchema` 23 = 337줄).
  - `useState` 수동 폼 + `submitFormDialog`(`shared/lib/form/submitFormDialog.ts`, 42줄): finance 5개 폼(`AccountFormDialog` 180, `CategoryFormDialog` 130, `SystemCategoryFormDialog` 120, `TransactionFormDialog` 189, `BudgetForm` 169 = 788줄, 각 `useState` 4~8개).
  - 그 외: `AssetForm` 232(useState 9), `EditAccountForm` 179(useState 6), `AdminSettingsForm` 331, `BacktestForm` 256(+`useBacktestForm.ts`), `BulkRegisterForm` 358.
- 평행 묶음 (diff 근거)
  - `InjectCapitalForm.tsx`(118) vs `WithdrawCapitalForm.tsx`(121): A-only=24, B-only=27 → 약 78~80% 동일. 스키마 14 vs 23줄(A-only=11, B-only=20). `*FormBody.tsx` 32 vs 32줄(A-only=6, B-only=6).
  - `CategoryFormDialog.tsx`(130) vs `SystemCategoryFormDialog.tsx`(120): A-only=34, B-only=24 → 약 73~80% 동일. 파일 상단 주석에 "CategoryFormDialog와 거의 동일하되 시스템 카테고리 mutation 사용"이라고 적혀 있다.
  - `AccountFormDialog`(180) vs `TransactionFormDialog`(189): A-only=101, B-only=110 → 같은 골격(Dialog+useState+submitFormDialog)이나 필드가 달라 약 40% 공유.
  - `StrategyForm`(200) vs `DcaStrategyForm`(215): A-only/B-only를 따로 재지는 않았고 `diff` 전체 변경 줄이 351/415로 평행 구조가 아니다 (분기 구조).
- 폼 공용 조각: `shared/ui/FormActions.tsx`(46), `SaveButton`, `ModalFormSkeleton`(17), `UnitInput`. 필드 래퍼(`FormField`/`Controller`)는 RHF 폼 2개(`InjectCapital`, `WithdrawCapital`)에서만 쓰이고 나머지는 `<Label>` + `<Input>` 직접 배치다 (`components/ui`에 shadcn `form.tsx` 없음).
- 에러 표시: finance 5개 폼 파일에서 "error" 문자열이 0회 — 에러는 mutation의 `toast.error`로만 간다. 필드별 에러 렌더링은 RHF 폼 쪽에만 있다.

## 5. 다이얼로그·시트·확인창

- `<Dialog` 사용 파일 10, `<AlertDialog` 15, `<Popover` 5, `<Sheet` 0, `<RouteModal` 11, `<ConfirmDeleteDialog` 7.
- 파일명에 Dialog/Modal/Sheet가 들어가는 컴포넌트 17개, 줄 수 합계: finance 5(AccountFormDialog 180, DeleteAccountDialog 53, CategoryFormDialog 130, DeleteCategoryDialog 46, SystemCategoryFormDialog 120) + group 2(InviteDialog 120, LeaveGroupDialog 42) + 거래 1(189) + 전략 2(DeleteStrategyDialog 66, CloseStrategyDialog 96) + admin-privacy 4(AddPrivacyOrder 114, CreatePrivacyBase 193, EditPrivacyBase 120, EditPrivacyOrder 89) + shared 3(ConfirmDeleteDialog 43, ModalFormSkeleton 17, RouteModal 132).
- `AlertDialog`를 직접 쓰는 파일 15개 중 `shared/ui/ConfirmDeleteDialog`를 쓰는 곳은 7개. 직접 구성: `ChangeRoleButton` 83, `WithdrawUserButton` 70, `ApproveRejectButtons` 104, `DeleteAccountButton` 59, `DeleteAccountDialog` 53, `DeleteCategoryDialog` 46, `LeaveGroupDialog` 42, `DeleteStrategyDialog` 66, `CloseStrategyDialog` 96 (전부 AlertDialog 구성).
- 생성/수정 쌍 diff
  - `CreatePrivacyBaseDialog`(193) vs `EditPrivacyBaseDialog`(120): A-only=136, B-only=63 (공유 약 30%).
  - `AddPrivacyOrderDialog`(114) vs `EditPrivacyOrderDialog`(89): A-only=45, B-only=20 (공유 약 60%).
  - `DeleteAccountDialog`(53) vs `DeleteCategoryDialog`(46): A-only=20, B-only=13.
- open 상태 관리 방식 (4종 확인)
  1. 로컬 `useState(false)`로 open boolean: `useState(false|true)` 중 이름에 open/dialog가 들어가는 선언 20개.
  2. 대상 선택형: `useState<T | null>(null)`에서 target/selected/editing/deleting 이름을 가진 선언 6개 (null이면 닫힘, 값이면 열림).
  3. 라우트 기반 모달: `app/(main)/@modal/(.)…` 인터셉트 라우트 10개 + `RouteModal` 11곳. 이 중 폼 라우트는 5절 하단 묶음 참고.
  4. 공용 훅: `shared/lib/hooks/use-confirm-dialog.ts` (사용처 수는 세지 않았다).

## 6. 테이블·목록·카드

- `<table>`/`<Table>`을 쓰는 파일 15개, 합계 2,698줄: `AdminPrivacyBaseTable` 489, `FinanceRecordList` 333, `AssetRecordRows` 214, `DcaExecutionHistory` 202, `StrategyOrderHistory` 202, `CycleHistoryTable` 178, `CycleRows` 175, `OrderRows` 164, `StrategyTypeComparison` 138, `CryptoHoldingsCard` 127, `HousingBenchmarkSummary` 125, `AdminUsersTable` 121, `AdminTradesTable` 113, `AdminAccountsTable` 62, `AccountTable` 55.
- 컬럼 정의: 선언형 `columns` 배열/`ColumnDef`를 쓰는 파일은 1개뿐이다. 나머지는 JSX 안에 `<TableHeadCell>`/`<TableDataCell>`을 직접 나열한다 (`TableHeadCell` 사용 파일 14, `TableDataCell` 16).
- 정렬·페이지네이션: 공용 훅·컴포넌트가 이미 있다 — `use-table-sort`, `use-client-pagination`, `SortableHeadCell`(11개 파일 사용), `PaginationBar`(15), `PageSizeSelector`(13), `MobileSortControl`(7). 정렬 상태 코드는 12개 파일에 등장한다.
- 테이블 쌍 diff
  - `AdminUsersTable`(121) vs `AdminTradesTable`(113): A-only=97, B-only=89 (컬럼이 달라 대부분 다름)
  - `AdminAccountsTable`(62) vs `AccountTable`(55): A-only=42, B-only=35
  - `DcaExecutionHistory`(202) vs `StrategyOrderHistory`(202): A-only=122, B-only=122 (페이지네이션+필터+테이블 골격은 같고 컬럼·문구가 다름, 공유 약 40%)
- 스켈레톤·빈 상태·에러 전용 컴포넌트
  - `loading.tsx` 39개 / 438줄. 그중 1줄 re-export가 13개. 13줄짜리가 10개(`accounts/[id]/edit`, `strategies/[sid]/{edit,inject-capital,reconfigure-vr,withdraw-capital}`, `strategies/new`, `finance/{new,[id]/edit}`, `pending`, `rejected`)이고 inject vs withdraw의 diff는 2줄이다.
  - 이름에 Skeleton/loading이 들어간 `.tsx` 45개 / 565줄 (loading.tsx 39 포함). 비-loading: `StrategyFormSkeleton` 56, `DashboardSkeleton` 24, `AdminTableSkeleton` 20, `ModalFormSkeleton` 17, `CardSkeleton` 6, `LoadingRow` 4.
  - 사용 횟수: `<Skeleton` 38개 파일, `<CardSkeleton` 22, 인라인 `animate-pulse` 20개 파일.
  - 빈 상태: `shared/ui/EmptyState.tsx`(50줄) 사용 30개 파일. `DashboardEmpty` 82줄은 전용. "없습니다/없어요/아직" 문구를 가진 파일 75개 (EmptyState 미사용 인라인 빈 문구가 섞여 있는지는 구분하지 못했다).
  - 에러: `SectionError`(72줄) 사용 37개 파일, `ErrorDisplay` 129줄, `ErrorLogItem` 66 등. `error.tsx` 3개.

## 7. 종류별 분기 (전략 / 브로커)

- 전략 종류 리터럴: `'DCA'` 20회, `'INFINITE'` 16회, `'VR'` 15회 (`shared/model` 제외한 비테스트 코드). 이 리터럴이 있는 파일 19개.
- 종류를 가르는 조건 분기: `type === 'X'`/`strategy.type === 'X'` 비교 21곳, `switch (…type)`은 1곳이고 그것도 reducer(`ApiStep.tsx:86`)라 전략 분기가 아니다. 즉 `switch`가 아닌 `if`/삼항으로 갈린다.
  - 가르는 지점 (file:line): `StrategyCard.tsx:217`, `StrategyDetailContent.tsx:79`, `app/(main)/accounts/[id]/strategies/[sid]/page.tsx:39`, `StrategyForm.tsx:86`, `InjectCapitalForm.tsx:74`·`WithdrawCapitalForm.tsx:76` (동일 코드 복제), `useStrategyForm.ts:160,176`, `CycleHistoryTable.tsx:112`, 백테스트 4+4곳(`BacktestForm.tsx`, `useBacktestForm.ts`).
- 같은 모양 파일이 종류 수만큼 있는 묶음: 접두사로 갈리는 `Dca*` 트리가 한 개 있다.

  | 일반(INFINITE/VR) | DCA 전용 | 줄 수 | 차이 |
  |---|---|---|---|
  | `StrategyCard.tsx` | `DcaStrategyCard.tsx` | 221 / 114 | A-only=84(DCA), B-only=191 → 공유 약 25% |
  | `StrategyDetail.tsx` | `DcaStrategyDetail.tsx` | 124 / 181 | diff 전체 205줄 |
  | `StrategyOrderHistory.tsx` | `DcaExecutionHistory.tsx` | 202 / 202 | A-only=122, B-only=122 → 공유 약 40% |
  | `StrategyForm.tsx` | `DcaStrategyForm.tsx` | 200 / 215 | 전체 diff 351줄 → 거의 별개 |

  DCA 전용 파일 합계(`Dca` 이름 포함 비테스트): `DcaStrategyForm` 215, `DcaStrategyCard` 114, `DcaStrategyDetail` 181, `DcaExecutionHistory` 202, `DcaExecutionFilters` 42, `dcaFormSchema` 187, `buildDcaPayload` 52, `dcaFormat` 93, `DcaRuleSummaryLabel` 31, 섹션 4개(`DcaConditionsSection` 144, `DcaSettingsSection` 199, `DcaRuleEditor` 62, `DcaRuleList` 80) = 약 1,602줄.
  VR 전용: `VrSettingsSection` 124, `ReconfigureVrForm` 179, `ReconfigureVrSections` 154, `reconfigureVrFormSchema` 68, `VrFieldControls` 239, `vrRamp` 43, `vrDerived` 84, `vr-rollover` 10 등.
  INFINITE는 접두사 파일이 없다 — "일반" 파일이 사실상 INFINITE이고 VR은 필드 분기로 얹혀 있다. 즉 종류별로 `XxxInfinite/XxxDca/XxxVr` 3벌이 있는 구조는 아니다.
- 브로커/시장 분기: `isCryptoMarket`/`isCryptoBroker`(`shared/lib/api-schema.ts:78,112`)를 쓰는 호출 30회(21개 파일). 브로커 리터럴(`'KIS'` 3, `'UPBIT'` 2, `'BINANCE'` 2, `'CRYPTO'` 2)은 적다. 크립토 전용 파일: `CryptoHoldingsCard` 127, `crypto-market-indicators` 위젯 5파일(`CryptoIndicatorCards` 473 등), `BrokerStep` 83.

## 5절 보충. 폼 라우트 4종 세트 (page + loading + @modal 인터셉트 + FormBody)

`app/(main)/@modal/(.)…`가 가진 폼 라우트 10개마다 일반 라우트의 `page.tsx`, `loading.tsx`, `*Body.tsx`가 짝으로 있다. 10개 라우트의 이 파일 합계는 777줄(@modal 쪽 약 154줄 + 일반 쪽 약 623줄)이다.
(이 수치는 각 라우트 디렉토리의 `page.tsx`·`loading.tsx`·`*Body.tsx`를 `cat | wc -l` 한 값이다.)
- @modal page 14줄짜리 쌍 diff: `edit` vs `inject-capital`: 3줄만 다름(6줄 변경 중 양쪽 3+3). `finance/new` vs `finance/[id]/edit`: 8줄.
- 일반 `page.tsx` 쌍(inject vs withdraw): 19줄 중 5줄만 다름(메타데이터 문구와 컴포넌트명).
- `FormBody` 쌍: `InjectCapitalFormBody` vs `WithdrawCapitalFormBody` 32줄 중 6줄만 다름. `NewAssetFormBody` vs `EditAssetFormBody` 30/31줄 중 9/10줄. `NewBudgetFormBody` vs `EditBudgetFormBody` 44/36줄 중 17/9줄. `EditStrategyFormBody` vs `NewStrategyFormBody` 34/27줄 중 17/10줄.

---

## 8. 종합 표 (감량 잠재력 큰 순, 상위 10)

"다른 부분 추정"은 대표 쌍의 `diff`에서 한쪽에만 있는 줄 수를 기준으로 한 값이다. 감량 잠재력은 "공유 가능한 줄 수의 추정"이며, 실제 감량은 추상화 오버헤드 때문에 이보다 작다. 모든 잠재력 수치는 추정이다.

| 순위 | 묶음 | 인스턴스 수 | 총 줄 수 | 인스턴스 간 실제 다른 부분(추정) | 근거(대표 diff) | 감량 잠재력(추정) |
|---|---|---|---|---|---|---|
| 1 | finance entity 레이어: 5개 리소스(자산·카테고리·계좌·거래·예산)의 CRUD+share/unshare api·훅·queryOptions·keys | 5 리소스 (api 함수 42, 훅 33) | 1,001 (api 360 + mutations 465 + queries 75 + options 74 + keys 27) | 훅당 3~4줄(함수명·key·문구) | `useInvalidateFinanceMutation` 28개 호출이 전부 `mutationFn / rootKey / 문구` 3인자, `delete|share|unshare` api 16개가 1~2줄 본문 | 250~300줄 (주석이 길어 실제 코드 줄은 더 적음) |
| 2 | 폼 라우트 4종 세트 (page+loading+@modal+Body) | 10 라우트 | 777 | 라우트당 약 6~15줄 (제목·메타·컴포넌트) | @modal page 쌍 3줄 차이, 일반 page 쌍 5줄 차이, loading 쌍 2줄 차이, Body 쌍 6줄 차이 | 250~300줄 (라우트 팩토리/설정 테이블화 가정) |
| 3 | 테이블 15개의 헤더·행·정렬·페이지·빈 상태 골격 | 15 | 2,698 | 컬럼·문구 (쌍 diff 70~95%가 다름) | `AdminUsersTable` vs `AdminTradesTable` A-only=97 B-only=89, `Accounts` vs `AccountTable` 42/35 | 200~300줄, 신뢰도 낮음 (컬럼이 본질) |
| 4 | DCA vs 일반 전략의 카드·상세·이력·폼 `Dca*` 트리 | 4쌍 | 약 1,000 (쌍 합 `Strategy*`/`Dca*` 중 위 4쌍) | 쌍마다 공유 25~40% 정도 | Card 84/191, History 122/122, Form 전체 diff 351 | 200줄 내외, 위험 높음 (분기 로직이 본질) |
| 5 | AlertDialog 직접 구성 확인창 | 9 (직접) + 7 (`ConfirmDeleteDialog` 이미 사용) | 619 (직접 구성 9개: 83+70+104+59+53+46+42+66+96) | 제목·설명·mutation | `DeleteAccountDialog` vs `DeleteCategoryDialog` A-only=20 B-only=13 | 150줄 내외 |
| 6 | finance 수동 폼 다이얼로그 (`useState`+`submitFormDialog`) | 5 | 788 | 필드 (Category/SystemCategory는 25~34줄만 다름) | Cat vs SysCat A-only=34 B-only=24, Account vs Transaction 101/110 | 150줄 내외 (Cat/SysCat 병합만 ~95줄) |
| 7 | `app/**/page.tsx` 프리페치 골격 | 21 | 893 | 쿼리 옵션과 prop (골격 약 12줄/파일) | `admin/users/page.tsx:15-34` 등 5식별자 라인 144회 | 120줄 내외 |
| 8 | RHF 전략 폼: inject/withdraw/reconfigure + 스키마 + FormBody | 3 폼 | 약 800 (폼 418 + 스키마 105 + Body 92 + 섹션 154 등) | 폼 24~27줄, 스키마 11~20줄, Body 6줄 | Inject vs Withdraw 폼 A-only=24 B-only=27 | 90~130줄 |
| 9 | admin-privacy 다이얼로그 생성/수정 쌍 | 2쌍 (4파일) | 516 | Create/Edit Base 63~136줄, Add/Edit Order 20~45줄 | Create vs Edit Base A-only=136 B-only=63 | 100~110줄 |
| 10 | `loading.tsx` 스켈레톤 | 39 (13개가 1줄, 10개가 13줄 동형) | 438 | 동형 10개는 문구 2줄 | inject vs withdraw loading diff 2줄 | 100줄 내외 (공용 스켈레톤 re-export화) |

참고로 순위 밖이지만 확인된 것들
- Route Handler B군(수동 토큰 fetch 5개, 155줄)의 공용화: 약 60줄.
- 얇은 query 훅 17개: 각 3~4줄이라 약 60줄 (호출부가 `useQuery({...queryOptions})`로 바뀌므로 감량이 작고 가치가 낮음).
- `toast.error(apiMsg(...))` 28회 반복: 한 줄씩이라 공용화해도 줄 수 이득은 작다.

## 확인 못 한 것 / 한계

- `shared/` 13,018줄 중 생성 타입이 얼마인지 구분하지 못했다. 코드 비대 논의에서 shared를 어떻게 볼지는 별도 확인이 필요하다.
- `queryKeys.ts` 합계 167줄은 `find -name queryKeys.ts | xargs wc -l` 값으로 test 파일(`queryKeys.test.ts`)이 일부 섞였을 수 있다(`entities/admin/model/queryKeys.test.ts`, `entities/finance/model/queryKeys.test.ts`가 find에 잡혔다).
- "공유 N%"는 `diff`의 한쪽 전용 줄 수에서 유추한 값으로, 줄 단위 비교라 들여쓰기·포맷이 다르면 과소평가된다.
- 감량 잠재력은 현재 구조를 유지한 채 공통화했을 때의 이론 상한이며, 실제 리팩토링으로 줄 수가 줄어든다는 보장은 없다.
- 구성 요소별 "상태 관리 방식"(`use-confirm-dialog` 사용처 등)과 로딩 UI의 실제 렌더 동형성은 파일 목록과 diff 수준까지만 봤다.
- 5절 보충의 "일반 쪽 623줄"은 `*Body.tsx` 글롭으로 잡은 파일 기준이라 `BudgetListBody.tsx`처럼 이름이 `*Body.tsx`인 것만 포함하고 `layout.tsx`·그 외 보조 파일은 빠졌다.

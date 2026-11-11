# G. UX 패턴 분산도 측정 (읽기 전용)

측정 범위: `app/ widgets/ features/ entities/ shared/` 의 `*.ts`/`*.tsx` 중 `*.test.*`·`*.d.ts` 제외. `components/ui/`(shadcn 생성물)는 제외하되 사용처로는 센다. 모수: 비테스트 tsx 381개, 27,763줄.
표기: "N줄/M파일"은 `grep -E` 일치 줄 수와 파일 수(동일 줄 중복 없음). 줄 수 추정이 필요한 곳은 "추정"이라 적고 근거를 달았다. 빌드·테스트·dev 서버·브라우저는 쓰지 않았다(정적 grep 한정 → 실제 렌더 결과는 확인 못 함).

## 0. 이미 정해진 규칙 (읽은 문서 5종 요약)

| 문서 | 이 측정과 관련된 규칙 |
|---|---|
| `copy.md` | 종결 패턴(명사구/합니다체), 토스트 마침표는 레이어별(entities 훅 onError는 항상 마침표, features·widgets 인라인은 한 문장이면 마침표 없음), "-" 하나로 빈값 표기, PageHeader eyebrow/제목 규칙, onError 이중 토스트 금지. 로딩·빈 상태·확인 다이얼로그 문구 자체의 규칙은 없음 |
| `a11y.md` | 아이콘 버튼 aria-label, 색 대비, 가로 스크롤 표 region, recharts title, 모달 트리거 disabled 금지, heading 레벨, 체크박스/라디오 공용 컴포넌트. 폼 에러/필수 표시/로딩 상태 규칙 없음 |
| `widgets.md` | CTA 위계(brand/brand-soft/default/destructive), 파괴적 동작 트리거·최종 버튼은 `destructive`, 테이블 정렬 규칙(`TableHeadCell`/`TableDataCell`), `SegmentedToggle` 재사용 규칙, 인라인 style 원칙적 금지(토큰값 예외), 사이드바 외 CSS 토큰 용도 |
| `shared.md` | stale time 표, `ui` 절(IconButton·SegmentedToggle/Tabs/SectionTabBar 선택 기준·`SelectionCard`·`SortableHeadCell`+`MobileSortControl`+`useTableSort` 세트·`YearMonthSelect`·`InputWithUnit` vs `UnitInput`), router.refresh 허용 범위 |
| `app.md` | `loading.tsx`는 "animate-pulse + 실제 레이아웃 모방 skeleton, 새 라우트 추가 시 함께", `app/error.tsx`·`(main)/error.tsx`, 인터셉팅 라우트 모달 패턴(+`FormBody` 공유 조립), Toaster는 루트 하나 |

규칙이 없는 영역은 11(d)에 모았다.

---

## 1. 화면 상태 표현

### 1-1 로딩: 5종 + 문구 변종

| 방식 | 사용처 | 대표 위치 |
|---|---|---|
| 라우트 `loading.tsx` | 39개 파일 / 438줄 (구성: `CardSkeleton` 18, `ModalFormSkeleton` 10, `<Skeleton>` 직접 8, `AdminTableSkeleton` 3) | `app/(main)/accounts/[id]/loading.tsx` |
| `loading.tsx` 안에 `animate-pulse` 손수 작성 | 17개 파일 / 257줄 | `app/(main)/accounts/[id]/strategies/new/loading.tsx:6`, `app/pending/loading.tsx:6` |
| 위젯 내부 `<Skeleton>`/`CardSkeleton` | `<Skeleton` 88줄/38파일, `CardSkeleton` 61줄/23파일 | `widgets/dashboard/DashboardSkeleton.tsx` (24줄), `features/strategy/create-strategy/StrategyFormSkeleton.tsx` (56줄) |
| `LoadingRow`(중앙 텍스트 "불러오는 중…") | 25줄/25파일 | `shared/ui/LoadingRow.tsx` |
| 직접 쓴 텍스트("불러오는 중…"/"차트 불러오는 중…") | LoadingRow 외 약 14곳 | `widgets/strategy-detail/NextOrderCard.tsx:131`, `widgets/account-card/AccountCard.tsx:38`, `features/finance/manage-group/GroupManager.tsx:55`, `widgets/dashboard/MarketChartCardInner.tsx:266` |
| `EmptyState variant="text"`로 로딩 표시(오용) | 1곳 | `features/finance/manage-budgets/BudgetManager.tsx:188` |
| 버튼 안 `<Spinner>` | 18줄/17파일 (`animate-spin`은 Spinner.tsx 1곳뿐, lucide `Loader2` 0) | `shared/ui/FormActions.tsx:39`, `shared/ui/SaveButton.tsx:10` |
| `<Suspense fallback>` | 11줄/9파일, fallback 7개 중 전부 `null` | `widgets/admin-log-list/AnomaliesSection.tsx:28` |

- 종류 수: 시각 방식 5(스켈레톤 위젯 / 라우트 loading / LoadingRow 텍스트 / 직접 텍스트 / 버튼 스피너). 다수파: 스켈레톤(CardSkeleton·ModalFormSkeleton).
- 같은 "목록 위젯 로딩"이 `LoadingRow`(`widgets/stats-overview/CycleRows.tsx:163`)·스켈레톤(`widgets/cycle-history/CycleHistoryTable.tsx:86`)·텍스트(`AccountCard.tsx:38`)로 갈려 있다. 같은 계열의 "차트 불러오는 중…" 동적 import fallback이 5개 래퍼에 복붙(`asset-trend/AssetTrend.tsx`, `asset-composition/AssetComposition.tsx`, `finance-trend/FinanceTrend.tsx`, `fear-greed-card/FearGreedCard.tsx`, `dashboard/MarketChartCard.tsx`, 합 202줄).
- `loading.tsx`가 없는 `page.tsx` 디렉토리: `(auth)/login`, `finance/bulk-register`, `stats/backtest`, `finance/budgets/[type]/new`, `finance/budgets/[type]/[id]/edit` 등(상위 세그먼트 loading이 덮는지는 확인 못 함).
- 규칙: `app.md`가 loading.tsx만 규정(위 수치상 준수). 위젯 내부 로딩 방식 선택 규칙은 없음.

### 1-2 빈 상태

- 공용 `EmptyState`: 42줄/30파일 (variant 'text' 21, 박스형 21, icon/title/action을 쓰는 rich형 0곳 — 컴포넌트에 rich 분기는 있으나 사용처 없음).
- 직접 마크업(`<p>/<div>/<li>` 안 "…없습니다"): 11곳 — `widgets/asset-overview/AssetOverview.tsx:82`, `widgets/finance-summary/FinanceSummary.tsx:87`, `widgets/finance-budget-progress/FinanceBudgetProgress.tsx:149`, `widgets/finance-trend/FinanceTrendInner.tsx:60`, `widgets/asset-trend/AssetTrendInner.tsx:154`, `widgets/asset-overview/AssetOverviewParts.tsx:154`, `widgets/finance-bulk-register/BulkRegisterForm.tsx:293`, `widgets/dashboard/MarketChartCardInner.tsx:268`, `features/finance/manage-group/GroupManager.tsx:109`, `shared/ui/SuggestionListEditor.tsx:83`, `shared/ui/EquityLineChart.tsx:47`. 이 중 `py-8`/`py-10` + `text-center text-sm text-muted-foreground`를 직접 쓴 곳 4곳(AssetOverview, FinanceSummary, FinanceBudgetProgress, EquityLineChart)은 EmptyState text variant(`py-8 text-center`)와 사실상 동일.
- 종류: 3(EmptyState 박스 / EmptyState text / 직접 `<p>`). 다수파 EmptyState(30 vs 11파일). 가계부 위젯(asset-*/finance-*)에 직접 마크업이 집중.
- 규칙: `copy.md`에 "EmptyState message는 마침표" 한 줄, 사용 강제 규칙은 없음.

### 1-3 에러 상태

| 방식 | 사용처 |
|---|---|
| `error.tsx`(→ `ErrorDisplay`) | 3개(`app/error.tsx`, `app/(main)/error.tsx`, `app/(admin)/admin/error.tsx`) + `global-error.tsx`(인라인 style 수작업) + `not-found.tsx` |
| `<SectionError>` | 38줄/37파일 |
| `role="alert"` 직접 마크업 블록 | 19줄/16파일 (`BenchmarkResult.tsx:35`·`EtfPriceChart.tsx:63`·`HousingPriceIndexChart.tsx:64`는 `role="alert" aria-live="assertive"` 동일 복붙) |
| 위젯 내 한 줄 텍스트("…불러오지 못했습니다") | 총 60줄/52파일 중 SectionError 경유 외 약 22곳: `MarketChartCardInner.tsx:264`, `FearGreedCard.tsx:30`, `WeeklyMarketCalendar.tsx:300,303`, `CryptoMarketSection.tsx:69,95`(자체 `Message`+retry), `GroupManager.tsx:53`, `AssetFormFields.tsx:141` 등 |
| `toast.error` | 44줄/17파일 (대부분 mutation 훅) |

- 에러 문구에 쓰는 색 클래스가 4종: `text-destructive` 36줄/26파일, `text-[var(--status-error)]` 33줄/24파일, `text-warn` 18줄/12파일, `text-muted-foreground`(예: `GroupManager.tsx:53`, `PrivacyBaseChart.tsx:73`). 같은 "조회 실패"가 destructive(`StrategyOrderHistory.tsx:103`)·warn(`MarketChartCardInner.tsx:264`)·muted(`GroupManager.tsx:53`)로 표시된다.
- 규칙: `widgets.md`에 `--warn`·`--status-error` 계열 토큰 사용만 언급, 어느 상황에 어느 색을 쓰는지는 없음. SectionError 존재를 알리는 규칙도 없음(`shared.md` ui 절의 SectionError 설명뿐).

### 1-4 비회원·권한 없음

- 비회원 분기는 `isAuthenticated` prop이 5파일(`dashboard/page.tsx:23`, `(main)/layout.tsx:38`, `DesktopSidebar.tsx:51`, `DashboardContent.tsx:19`, `WeeklyMarketCalendar.tsx:183`)에만 있고 `enabled: isAuthenticated` 게이팅 규칙은 `architecture.md`에 있음(준수 확인: `useAccountsQuery({ enabled: isAuthenticated })` 2곳). 권한 없음 화면은 별도 컴포넌트 없이 `proxy.ts` 리다이렉트로만 처리(관리자 비권한 → `/dashboard`). `redirect(` 7줄/3파일, `notFound(` 18줄/14파일.
- 종류 3(proxy 리다이렉트 / `notFound()` / 위젯 내 게스트 분기). 변동폭은 작고 규칙도 `architecture.md`에 있어 우선순위 낮음.

---

## 2. 생성·수정 흐름의 형태

전역 사용 현황: `Dialog` 10파일, `AlertDialog` 15파일(확인용), `RouteModal`(인터셉팅 `@modal`) 10개 라우트 + 정의 1, `Popover` 5파일(YearMonthSelect 등 선택기), Sheet/Drawer 0. 인라인 편집은 닉네임·알림·텔레그램 등.

| 엔티티 | 생성 | 수정 | 삭제/위험 |
|---|---|---|---|
| 계좌(브로커) | 전용 페이지 `/accounts/new` (4단계 스텝퍼) | 전용 페이지 `/accounts/[id]/edit` (모달 쌍 없음) + `CredentialsCard` 페이지 내 인라인 폼 | 수정 페이지 안 **Dialog + 별칭 타이핑 확인** (`features/account/edit-account/EditAccountForm.tsx:134`) |
| 전략 | 페이지 + `@modal` 쌍 | 페이지 + `@modal` 쌍 | 삭제 `DeleteStrategyDialog`·종료 `CloseStrategyDialog` AlertDialog (자체 마크업) |
| 전략 투자금 추가/인출/VR 재설정 | 페이지 + `@modal` 쌍, **폼 제출 전 AlertDialog 확인 한 번 더** (`InjectCapitalForm.tsx:109`, `WithdrawCapitalForm.tsx:112`, `ReconfigureVrForm.tsx:170`) | — | — |
| 가계부 거래내역 | **Dialog** (`NewTransactionButton` → `TransactionFormDialog`) | **Dialog** (`widgets/finance-record-list/FinanceRecordList.tsx:303,313`) | `ConfirmDeleteDialog` |
| 가계부 자산 기록 | **페이지 + `@modal` 쌍** (`/finance/new`, 복제는 `?duplicateFrom=`) | **페이지 + `@modal` 쌍** (`/finance/[id]/edit`) | `ConfirmDeleteDialog` (`AssetRecordList.tsx`) |
| 가계부 일괄 등록 | 전용 페이지 `/finance/bulk-register` (모달 쌍 없음) | — | — |
| 가계부 예산 | 페이지 + `@modal` 쌍 (목록 자체도 라우트 모달) | 페이지 + `@modal` 쌍 | `ConfirmDeleteDialog` (`BudgetManager.tsx`) |
| 가계부 카테고리·시스템 카테고리 | **Dialog** | **Dialog** | `DeleteCategoryDialog` AlertDialog 자체 마크업 |
| 재무 계좌 | **Dialog** (`AccountFormDialog`) | **Dialog** | `DeleteAccountDialog` AlertDialog 자체 마크업 |
| 그룹 | `InviteDialog` Dialog / `AcceptInvitationForm` 인라인 | — | `LeaveGroupDialog`·`GroupMemberList` AlertDialog 자체 마크업 |
| 설정: 닉네임 | — | **인라인 편집**(`NicknameEditor`) | — |
| 설정: 알림 채널·알림 항목 | — | 인라인 토글 + toast | — |
| 설정: 텔레그램 | 인라인 폼 | — | `ConfirmDeleteDialog`(연결 해제) |
| 설정: 회원 탈퇴 | — | — | AlertDialog 자체 마크업 (`DeleteAccountButton.tsx`) |
| 운영 설정(admin) | — | 인라인 폼(`AdminSettingsForm`) | — |
| P 매매표(admin) | Dialog | Dialog (4종) | `ConfirmDeleteDialog` |
| 사용자(admin) | — | 역할 변경 AlertDialog | 탈퇴·승인/거절 AlertDialog 자체 마크업 |

- 종류 수: 6(전용 페이지 / 페이지+모달 쌍 / Dialog / AlertDialog 확인 / 인라인 편집 / 타이핑 확인 Dialog).
- **같은 성격 다른 형태 사례**
  1. 가계부 안에서만 "한 건 등록·수정"이 4가지다: 거래내역 = Dialog, 자산 기록 = 페이지+모달, 예산 = 페이지+모달, 카테고리/재무계좌 = Dialog. 이 중 거래내역(날짜·카테고리·금액·메모)과 자산 기록(날짜·계좌·카테고리·금액)은 필드 구성이 거의 같은데 각각 `TransactionFormDialog`와 `AssetForm`(+`AssetFormPage`+`FormBody`+`@modal` 쌍+`loading.tsx` 쌍)으로 나뉜다.
  2. 계좌 삭제: 브로커 계좌는 Dialog + 별칭 타이핑 확인, 재무 계좌는 단순 AlertDialog.
  3. 계좌(브로커) 수정은 모달 쌍이 없고 전략 수정은 쌍이 있다(둘 다 "하위 화면으로의 이동").
  4. 확인 단계: 투자금 추가/인출은 폼 제출 → AlertDialog 확인 → 완료로 단계가 하나 더 들어가는데 가계부 금액 입력에는 없다.
- 규칙: `app.md`가 "다이얼로그/드로어 폼을 페이지로 바꾼" 인터셉팅 패턴만 설명한다. **어떤 폼을 페이지/모달/Dialog로 할지 선택 기준 규칙은 없다.**

---

## 3. 삭제·위험 동작 확인

- 확인 다이얼로그 구현: `ConfirmDeleteDialog`(공용, 7개 호출처: `BudgetManager`, `PendingTelegramConnect`, `TelegramSection`, `SuggestionListEditor`, `AdminPrivacyBaseTable`, `AssetRecordList`, `FinanceRecordList`) vs `AlertDialog` 자체 구성 14파일(위 공용 정의 1 제외). 자체 구성 9개 파일 합 619줄: `DeleteAccountDialog`53, `DeleteCategoryDialog`46, `LeaveGroupDialog`42, `DeleteStrategyDialog`66, `ChangeRoleButton`83, `WithdrawUserButton`70, `DeleteAccountButton`59, `ApproveRejectButtons`104(2 다이얼로그), `CloseStrategyDialog`96. 추가로 `GroupMemberList`, `ErrorLogsSectionClient`, `InjectCapitalForm`, `WithdrawCapitalForm`, `ReconfigureVrForm`에도 AlertDialog가 인라인.
- 종류: 3(공용 `ConfirmDeleteDialog` / AlertDialog 자체 / Dialog+타이핑 확인 `EditAccountForm`). 다수파는 자체 구성(14 vs 7).
- 문구 패턴: 제목은 15/16이 "~하시겠습니까?"(나머지 1은 `{title}` 변수)로 일관. 취소 라벨은 15/15 "취소", 버튼 순서는 취소→확인 15/15(일관). 제목 색은 일부가 destructive 색(`DeleteAccountButton.tsx` `text-destructive`, `WithdrawUserButton.tsx` `text-[var(--status-error)]` — 같은 의도에 서로 다른 토큰).
- 확정 버튼: `variant="destructive"` 12곳(공용 포함), 기본(primary) 4곳(`ChangeRoleButton`, `ApproveRejectButtons`의 승인, `InjectCapitalForm`, `WithdrawCapitalForm` — 이 중 인출은 파괴적 성격이나 기본색). 진행 중 라벨: "삭제 중..." 8곳, "처리 중..." 4곳, "변경 중..."·"인출 중..."·"재설정 중..." 등 동사별로 제각각.
- 규칙: `shared.md` CTA 위계에 "확인 다이얼로그 최종 버튼도 destructive"가 있고 12곳이 준수. 다이얼로그 제목·본문·진행 라벨 문구 규칙은 없다.

---

## 4. 폼 UX

- 폼 라이브러리 설치: `react-hook-form` + `zod` + `@hookform/resolvers`. 사용: `useForm` 6파일(전부 `features/strategy/*`: `DcaStrategyForm`, `useStrategyForm`, `DcaRuleEditor`, `InjectCapitalForm`, `ReconfigureVrForm`, `WithdrawCapitalForm`), zod 스키마 5파일(전부 strategy). **`<form>` 19파일 중 RHF 5, `useState` 수동 14**(`AssetForm`, `TransactionFormDialog`, `BudgetForm`, `AccountFormDialog`, `CategoryFormDialog`, `SystemCategoryFormDialog`, `EditAccountForm`, `CredentialsCard`, `AdminSettingsForm`, privacy 다이얼로그 4, `StrategyForm`은 `useStrategyForm` 훅). 가계부·계좌·관리자 폼은 전부 수동 폼이고 폼당 `useState` 3~6개(`AssetForm`·`AccountFormDialog`·`CreatePrivacyBaseDialog` 각 6).
- 검증 시점: RHF `mode`/`reValidateMode` 지정 0곳(기본 onSubmit). 수동 폼은 입력값에서 파생한 `canSubmit`로 제출 버튼만 비활성(38줄/17파일). 즉 "제출 시 에러 표시"와 "항상 비활성 + 힌트 문구"가 섞여 있다(예: `TransactionFormDialog.tsx:120` 힌트, `AccountInfoFields.tsx:29` 필드 에러 `<p>`).
- 에러 표시: 필드 에러 `<p>` 52줄(`text-destructive` 또는 `text-[var(--status-error)]`, `text-xs`/`text-sm` 혼재, `mt-1` 유무 혼재), `aria-invalid` 24줄/16파일, `aria-describedby` 32줄/23파일, `role="alert"`를 필드 에러에 쓰는 곳과 안 쓰는 곳 혼재. 공용 필드 에러 컴포넌트 없음(`FormField`류 0).
- 필수 표시: 라벨의 `*`(빨강 span) 4줄/2파일(`AccountInfoFields`, `ApiStepParts`), "(선택)" 25줄/14파일(선택 표기 방식), `required` 속성 6줄/4파일, `aria-required` 0, `noValidate` 0. 즉 "필수에 *를 단다"와 "선택에 (선택)을 단다"가 공존.
- 제출 중 버튼: `FormActions`(스피너+라벨, 9곳) / `SaveButton`(스피너+"{라벨} 중...", 8곳) / 라벨만 바꾸는 버튼 약 20곳("삭제 중..." 등) / `<Spinner>` 직접 사용. 진행 문구 말줄임이 "중..." 47줄 vs "중…" 4줄(불러오는 중… 16줄은 별도).
- 성공 후 동작: `router.push` 20줄/18파일, `router.back` 9줄/8파일, `dismiss === 'back' ? back : push` 패턴 5곳(`StrategyFormPage:30`, `ReconfigureVrForm:68`, `WithdrawCapitalForm:46`, `InjectCapitalForm:46`, `AssetFormPage:18`, `BudgetForm:48`), Dialog는 `submitFormDialog`(공용 5곳) → toast + 닫기. `CredentialsCard`는 toast만.
- 취소: `FormActions` 취소 버튼(`onCancel` 또는 `cancelHref`) / `DialogFooter`의 직접 만든 취소 / `AlertDialogCancel`.
- 숫자·금액·날짜 입력 컴포넌트: 금액·수량 입력이 5종 — `UnitInput`(단위 박스, 26줄/8파일), `InputWithUnit`(`InputUnitSuffix`, 4파일), 콤마 금액(`formatAmountDisplay` 4파일: `AssetForm`, `TransactionFormDialog`, `BudgetForm`, `BulkRegisterForm`), `type="number"`(15줄/8파일, privacy 다이얼로그 4파일 집중), 기본 `Input inputMode="decimal|numeric"`(8줄/7파일). 날짜는 네이티브 `type="date"` 15줄/10파일 vs `YearMonthSelect`(4파일)·`YearSelect`(1파일)·`type="month"`(2파일).
- 공용: `FormActions`, `SaveButton`, `submitFormDialog`, `UnitInput`, `SelectionCard`, `CascadingCategorySelect`는 있음. 입력 전체(라벨+필드+힌트+에러)를 묶는 컴포넌트는 없음. `<Label>` 104줄/34파일 직접 조합.
- 규칙: `shared.md`에 폼 하단 `FormActions` 사용, `InputWithUnit` vs `UnitInput` 구분만 있다. **검증 시점·에러 표시·필수 표시·제출 중 표시 규칙은 없다.**

---

## 5. 피드백 (toast·갱신)

- `toast.*` 호출 106줄/45파일: success 54, error 44, 기타 7(info/warning/message 등 — 세부 미분류). 루트 Toaster 1개(`app/layout.tsx:45`, 규칙 준수).
- 성공 문구 어미: "~했습니다" 21, "~되었습니다" 19, "~됐습니다" 5, 변수 전달(`successMessage`) 나머지. 같은 레이어도 갈림: features의 `AssetForm.tsx:103,112`는 "되었습니다", `AssetRecordList.tsx:59`·`FinanceRecordList.tsx:85`는 "했습니다"; entities `useUserQueries.ts:74,104,116`은 "됐습니다."(마침표 있음) vs `useUserQueries.ts:62` "저장했습니다"(마침표 없음).
- 실패 문구: "~에 실패했습니다" 24, "~하지 못했습니다" 6, "오류가 발생했습니다" 5(같은 `entities/finance/hooks/useFinanceMutations.ts`가 "수정하지 못했습니다."와 같은 파일 다른 훅에서 "…실패했습니다"를 혼용하지는 않으나 entities 간 `useAccountMarginQuery.ts:52` "수정에 실패했습니다." vs `useFinanceMutations.ts:390` "계좌를 수정하지 못했습니다." 로 도메인별 갈림).
- mutation 훅 위치: `useMutation(` 21줄/6파일 전부 entities 훅. 호출부 `.mutate(` 60줄/42파일, `.mutateAsync(` 5줄/3파일. 호출부 직접 `toast.success` 약 40곳(`copy.md`의 레이어별 컨벤션이 이를 허용).
- 낙관적 업데이트: `onMutate` 1파일(`entities/user/hooks/useUserQueries.ts`)만. 나머지는 낙관적 업데이트 없음.
- 갱신 방식: `invalidateQueries` 35줄/16파일, `setQueryData` 17줄/8파일, `router.refresh` 5줄/4파일(허용 예외 문서화됨: `shared.md`), `refetchQueries` 1줄. 
- 규칙: `copy.md`가 마침표·이중 토스트·용어 규칙을 갖고 있어 문구는 가장 잘 통제됨. 어미("했습니다/되었습니다/됐습니다")와 실패 문구("실패했습니다/하지 못했습니다") 선택 규칙은 없다.

---

## 6. 목록 표현

- `<table>` 15파일(`TableHeadCell` 14파일, `SortableHeadCell` 11파일, `useTableSort` 12파일, `MobileSortControl` 7파일). 정렬 미적용 표 6파일(`HousingBenchmarkSummary`, `StrategyOrderHistory`, `DcaExecutionHistory`, `CycleHistoryTable`, `CycleRows`, `AdminAccountsTable` — 일부는 서버 페이지네이션이라 `shared.md`가 의도한 예외).
- **모바일 카드 + 데스크톱 표 이중 마크업**(같은 데이터를 두 마크업으로): 표+`lg:hidden` 카드 리스트를 한 파일에 같이 가진 파일 10개 — `OrderRows`(164줄), `StrategyOrderHistory`(202), `DcaExecutionHistory`(202), `CryptoHoldingsCard`(127), `AssetRecordRows`(214), `FinanceRecordList`(333), `AdminPrivacyBaseTable`(489), `CycleHistoryTable`(178), `CycleRows`(175), `StrategyTypeComparison`(138) = 합 2,222줄. 카드 자체가 모바일/데스크톱 두 레이아웃을 한 파일에 가진 `StrategyCard`(221), `DcaStrategyCard`(114), `AccountCard`(146) = 481줄 추가. (`lg:hidden`/`hidden lg:*` 37줄/26파일, md 분기 0, 분기점은 사실상 `lg` 하나.) 표 전용(이중 구현 없음): `AdminUsersTable`, `AdminTradesTable`, `AdminAccountsTable`, `AccountTable`, `HousingBenchmarkSummary` 5파일.
- 정렬: `useTableSort`(클라이언트, 12파일) 외에 서버 정렬 없음. 필터 방식: `SegmentedToggle`(20곳)·`Select`(46줄/25파일)·`UrlRangeFilterBar`(URL, 9파일)·`useRangeFilterState`(로컬)·`ALL_FILTER_VALUE` 셀렉트(8파일).
- 페이지네이션: `PaginationBar` 14파일 — URL 모드(`?page=`, admin 서버 페이지 5)와 `onPageChange` 콜백 모드(클라이언트 `useState(1)`: `StrategyOrderHistory.tsx:40`, `DcaExecutionHistory.tsx:37`, `CyclePerformanceList.tsx:32`, `use-client-pagination`) 2가지. 무한 스크롤은 없고 "더 보기" 버튼 `useInfiniteQuery` 1파일(`CycleHistoryTable`, `IntersectionObserver` 0). `PageSizeSelector` 13파일. 즉 방식 3(URL 페이지 / 클라이언트 페이지 / 더 보기).
- 한 화면에서 상태 위치가 섞임: `StrategyOrderHistory`는 기간 필터는 URL(`UrlRangeFilterBar`)인데 방향·주문유형·상태 필터와 페이지는 `useState`(`StrategyOrderHistory.tsx:40-43`).
- 규칙: `shared.md`/`widgets.md`가 정렬·열 정렬·`SortableHeadCell`+`MobileSortControl`을 규정. 모바일/데스크톱 이중 마크업 방식과 페이지네이션 상태 위치 규칙은 없다.

---

## 7. 숫자·금액·수익률·날짜 표기

- 공용 포매터: `shared/lib/format/index.ts` 안에 `fmt*` 약 25종(금액 `fmtUsd`/`fmtKrw`/`fmtMoney`/`fmtSignedMoney`/컴팩트, 퍼센트 `fmtSignedPercent`/`fmtSignedPercentPoint`, 날짜 `fmtDate`/`fmtDateTime`/`fmtMonthDay`/`fmtTime`/`fmtYearMonthKo`/`fmtShortYearMonth`, 수량 `fmtQuantity`, 입력용 `formatAmountDisplay`) + 손익색 `pnlTextClass`(`shared/lib/format/pnl.ts`). 임포트 파일 81. 사용처: `fmtUsd` 53줄/15파일, `fmtMoney` 21줄/14파일, `fmtDate` 21줄/16파일, `fmtKrw` 20줄/10파일, `fmtSignedPercent` 15줄/7파일, `fmtQuantity` 12줄/8파일.
- 공용 밖 자체 포매터: 위젯 로컬 `fmt*`/`format*` 정의 약 20개 — `widgets/crypto-market-indicators/CryptoIndicatorCards.tsx`(`fmtPct`, `fmtFunding`, `fmtMultiple`, `fmtUtcDate`, `fmtKstDate`, `fmtKstTime`, `fmtCoinbasePct`, `fmtPlainPct`, `fmtHashrate` 등 9), `PrivacyBaseChartInner.tsx`(`fmtPrices`, `fmtAvgPrice`, `fmtCash`, `fmtPeriod`), `privacyChartParts.tsx:23 fmtPercent`, `AdminTradesTable.tsx:14 fmtTradePrice`, `AssetRecordCheck.tsx:28 formatMonthDay`(공용 `fmtMonthDay`와 중복 의심), `entities/stats/lib/housingBenchmarkChartFormatters.ts`(11개), `entities/strategy/model/dcaFormat.ts`(6개).
- 포매터 우회: `toFixed` 31줄/12파일 중 포매터 파일 밖 23줄/9파일(`CryptoIndicatorCards.tsx` 9줄, `StrategyCard.tsx:98,150`, `StrategyMetaSection.tsx:160,182`, `StrategyTypeComparison.tsx:86,115`, `AssetCompositionInner.tsx:115`, `EquityLineChart.tsx:39`); `toLocaleString`/`Intl.NumberFormat` 공용 밖 7줄(`CryptoIndicatorCards` en-US, `AdminTradesTable.tsx:16`, `CryptoMarketSection.tsx:23` 등); `${n}%` 템플릿 24줄(`StrategyMetaSection.tsx:132`, `FinanceSummaryParts.tsx:96`, `privacyChartParts.tsx:24` 등 — **부호 없는 퍼센트 공용 포매터가 없음**); `${n}원` 2줄; `slice(0, 10)`/`.replace(/-/g, '.')` 등 날짜 문자열 가공 7줄; `new Date(` 30줄/18파일.
- 손익 색: 공용 `pnlTextClass` 47줄/16파일(다수파). 로컬 래퍼 `pnlClass`(`widgets/stats-overview/CycleRows.tsx:20`)가 공용을 감싸 `tabular-nums`를 붙임. 그 외 `text-pos`/`text-neg` 직접 사용은 손익이 아닌 매수/매도·주말색(`direction.ts:5`, `WeeklyMarketCalendar.tsx:95,170,263`, `TradeToast.tsx:10`)과 `PrivacyBaseChartInner`. `var(--pos)` 인라인 style·차트 stroke 별도. 손익 색 방식은 사실상 1종 + 방향색 + 차트 색으로 분리되어 양호.
- 규칙: `copy.md`에 값 없음 "-" 통일 규칙이 있고 준수(검색 범위: 문자열 안의 "—" 직접 확인 못 함). 포매터 사용 의무·소수 자릿수·통화 규칙 문서는 없음.

---

## 8. 레이아웃 골격

- 페이지 헤더: 공용 `PageHeader` 30곳 사용(제목·eyebrow·description·actions). 별도 `<h1>` 8곳은 인증/에러/pending 화면(`app/pending/page.tsx:48`, `app/rejected/page.tsx:17`, `app/(auth)/login/page.tsx:60`, `global-error.tsx:60`, `ErrorDisplay.tsx:76`) + `sr-only` 2곳. 방식 2(PageHeader / 직접 h1) — 의도적 분리로 보이며 일관성 문제는 작음.
- 섹션 제목: 공용 `CardTitle`(`role="heading" aria-level={2} className="text-base lg:text-lg"` 26곳 복붙) vs 손수 `<h2>`(40줄/28파일, 클래스 조합 12종: `text-sm font-bold mb-0.5` 6, `text-base font-bold` 6, `text-sm font-bold text-foreground` 4, `text-lg font-bold mb-1` 4, `text-sm font-semibold` 등). 방식 3(CardTitle / h2 클래스 12종 / 상태색 h2).
- 섹션 카드 컨테이너: `Card`(shadcn, `rounded-xl ring-1 ring-foreground/10`, 28파일) vs `Surface`(`rounded-[var(--r-lg)] bg-card border shadow-[var(--sh-card)]`, 13파일) vs 직접 `rounded-[var(--r-lg)] … border` 41줄/33파일 vs `GlassCard` 3파일. 시각 언어가 2종(ring-1+rounded-xl vs border+r-lg+shadow). `Surface` 패딩 조합: `p-6` 9곳, `p-4 lg:p-5` 3곳, `p-5 …` 6곳. `p-` 값 분포 `p-4` 38, `p-5` 27, `p-0` 20, `p-6` 12, `p-3` 7.
- 간격: `space-y-` 값 91(2)/57(4)/13(3)/12(6)/12(1.5)…, `gap-` 148(2)/96(3)/74(1.5)/49(4)/46(1)/14(2.5)/12(6)/7(5) — 값 종류가 8단계 이상. 페이지 최대폭은 `max-w-lg mx-auto`(폼 페이지 12곳 + 로딩 복제 10곳)만 공용 규칙처럼 쓰이고, 목록·대시보드 페이지는 폭 제한 없음(`(main)/layout.tsx`의 `p-4 lg:p-9`만 적용).
- 반응형 분기: Tailwind breakpoint — `lg:` 153줄/80파일, `sm:` 126줄/51파일, `xl:` 17줄/8파일, `md:` 4줄/4파일(사실상 sm/lg 2단); JS 미디어쿼리 `useMediaQuery` 호출 2곳(`NextOrderCard.tsx:164` `(min-width: 1280px)`, `privacyChartParts.tsx:99` `(max-width: 1023px)`) + 직접 `window.matchMedia` 2곳(`BacktestPageContent.tsx:18-19`); 별도 컴포넌트 분리(`DesktopSidebar`/`MobileBottomNav`/`MobileHeader`/`AdminSidebar`/`AdminTopBar`). 방식 3. JS 분기점이 1280px·1023px로 Tailwind `lg`(1024px)와 어긋나 1px 차이를 코드에서 `1023`으로 맞춤(`privacyChartParts.tsx:99`).
- 규칙: `widgets.md`에 "커스텀 반응형 그리드는 globals.css 클래스" 한 줄뿐. 페이지 골격·카드 컨테이너·간격 규칙 없음.

---

## 9. 내비게이션·정보 구조

- 최상위 메뉴(사용자): 6개 — 대시보드, 계좌, 전략, 통계, 가계부, 설정(`DesktopSidebar.tsx:15-20`, `MobileBottomNav.tsx:10-15`가 목록을 각자 복제). 서브 메뉴: 통계 3(성과/벤치마크/백테스트), 가계부 5(자산/수입/소비/저축/설정). 관리자: 7개(`AdminSidebar.tsx:11-17`, `AdminTopBar.tsx:9-15`가 동일 목록을 라벨만 줄여 복제).
- 화면 깊이: 최대 5 세그먼트(`/accounts/[id]/strategies/[sid]/{edit|inject-capital|reconfigure-vr|withdraw-capital}`, `/finance/budgets/[type]/[id]/edit`). 전략 상세는 계좌 하위(3단계)인데 사이드바에는 별도 최상위 "전략" 목록도 있어 같은 전략이 두 경로(`/strategies`, `/accounts/[id]/strategies/[sid]`)로 접근됨.
- 탭·세그먼트 구현: `SectionTabBar`(라우트 이동, 2곳: `FinanceHeader.tsx:81`, `StatsHeader.tsx:21`), `SegmentedTabs`(패널 전환, 2곳: `AccountDetailTabs.tsx:37`, `CryptoMarketSection.tsx:71`), `SegmentedToggle`(값 선택, 20곳/19파일), `Select`(46곳/25파일), 직접 `aria-pressed` 버튼(`AssetOverviewParts.tsx:125`, `MarketChartCardInner.tsx:259`), 상태 컨텍스트(`FinancePeriodProvider.tsx:31-33`). 방식 5. 선택 기준은 `shared.md`에 문서화되어 있고 3종 컴포넌트는 준수.
- URL 상태 대 로컬 상태: URL(`useSearchParams`/`useSearchParam`/`window.history.replaceState`)로 탭·필터를 쥔 곳 약 10곳(`AdminAccountsFilterBar`, `LogsFilterChips`, `BudgetManager`, `UrlRangeFilterBar` + 소비 9파일, `PaginationBar`(URL 모드), `PageSizeSelector`, `PrivacyBaseChart`, `AdminPrivacyBaseTable`, `AllStrategiesList`, `AccountsGrid`); 로컬 `useState`로 쥔 곳 20개 이상 상태(`FinancePeriodProvider` 3, `useBenchmarkFilters` 2, `StrategyOrderHistory` 3+페이지, `AssetRecordList` 2, `AssetTrendInner` 1, `StatsOverview` 1, `AccountManager`, `CategoryManager`, `SystemCategoryManager`, `CyclePerformanceList`, `DcaExecutionHistory` 등). 대략 URL : 로컬 = 1 : 2 이상(정확한 화면 단위 분류는 안 함). 같은 성격의 "기간·종류 필터"가 admin은 URL, 사용자 화면은 대부분 로컬이라 새로고침·공유 시 복원 여부가 화면마다 다름.
- 규칙: 탭/세그먼트 3종 선택은 문서화. URL 대 로컬 상태 기준은 `app.md`의 예산 관리 케이스(`BudgetManager`)만 있고 일반 기준은 없음.

---

## 10. 디자인 토큰

- 토큰 정의: `app/globals.css` `--r-sm/md/lg/xl`, `--sh-card`, `--sh-rose`, `--pos/--neg(-bg)`, `--warn`, `--status-*`, `--brand-*` 등(`@theme` 계열 변수 65줄).
- 토큰형 사용: `rounded-[var(--r-lg)]` 50, `rounded-[var(--r-sm)]` 28, `rounded-[var(--r-md)]` 24, `shadow-[var(--sh-card)]` 10, `shadow-[var(--sh-rose)]` 5. 이 값들은 Tailwind theme 클래스가 아니라 임의값 문법 + CSS 변수라 (Tailwind `rounded-lg` 14, `rounded-md` 10, `rounded-sm` 13, `rounded-xl` 등과 섞여) 같은 반경이 두 표기로 공존.
- 리터럴 임의값: 반경 `rounded-[10px]` 9, `[1.25rem]` 4, `[7px]` 3, `[6px]` 2, `[5px]` 1, `[12px]` 1 (합 20); 그림자 리터럴 4(`shadow-[0_4px_16px_rgba(143,68,48,.25)]` 등); 색 `[#hex]` 3줄/3파일(`#FEE500`, `#229ED9` 외부 브랜드색); hex 리터럴 23줄/8파일(`fearGreedZones.ts` 5, `ThemeCards.tsx` 9, `manifest.ts`, 로그인 카카오색 등); `text-[10px|11px]` 4; 전체 `[px|rem|em|vh|%]` 임의값 196줄/89파일(높이·최소높이 `min-h-[240px]` 14, `min-h-[224px]` 9, `h-[240px]` 9, `h-[280px]` 7 등 차트 높이가 반복).
- 원색 Tailwind 팔레트: `text-rose-600` 7, `border-rose-300` 5, `bg-rose-50` 4 등 12파일(`DesktopSidebar` 외 `AdminTopBar.tsx:25`, `ThemeToggle.tsx:34`, `BrokerStep.tsx:71`, `StrategyTypeSection.tsx:25`, `Stepper.tsx:23,32` 등). 브랜드색이 `--brand-*`/`--rose-*` 토큰과 `rose-600` 팔레트 둘로 표기됨.
- 인라인 `style`: 58줄/28파일(`style={{`). 이 중 정적 토큰 색(`style={{ color: 'var(--status-error)' }}` 등 → Tailwind `text-[var(...)]`로 대체 가능한 것): `app/rejected/page.tsx:13-28`, `app/pending/page.tsx:43-46`, `app/(auth)/login/page.tsx:73`, `widgets/layout/AdminSidebar.tsx:27`, `BrandWordmark.tsx:8`, `EquityLineChart.tsx:54-63`, `ErrorDisplay.tsx:64-67` 등 약 25줄. 동적(데이터 의존 색·폭·회전: `AssetOverviewParts.tsx:39`, `PullToRefresh.tsx:81,95`, `FearGreedGauge.tsx:70`, `StrategyCard.tsx:195`)은 약 25줄. 나머지는 이미지 크기 `{ height: N, width: N }`(`app.md` Next Image 경고 회피, 5곳: `DesktopSidebar.tsx:68`, `MobileHeader.tsx:21` 등). 이 정적 토큰 style 25줄은 `constraints.md`의 "CSS 토큰 값" 예외로 해석될 수 있으나, 같은 토큰을 `text-[var(--status-error)]`(33줄/24파일)로도 쓰므로 표기가 2종.
- 규칙: `constraints.md`(인라인 style 원칙 금지, 토큰값·픽셀 계산 예외), `widgets.md`(토큰 용도), `shared.md`(variant). 임의값 사용 한도·반경/그림자 토큰의 Tailwind theme 승격 규칙은 없음.

---

## 11. 종합

### (a) 방식이 3가지 이상으로 갈린 항목

| # | 항목 | 방식 수 | 요약 |
|---|---|---|---|
| 1 | 로딩 표시 | 5 | 라우트 skeleton 39파일(손수 pulse 17) / 위젯 skeleton / LoadingRow 25 / 직접 텍스트 약 14 / 버튼 Spinner |
| 2 | 에러 표시·색 | 5+색 4 | error.tsx / SectionError 38 / role=alert 블록 16 / 인라인 한 줄 약 22 / toast; 색 destructive·status-error·warn·muted |
| 3 | 생성·수정 폼 형태 | 6 | 전용 페이지 / 페이지+@modal / Dialog / AlertDialog 확인 / 인라인 / 타이핑 확인 Dialog (가계부 안에서만 3종) |
| 4 | 폼 검증·에러·필수·제출 표시 | 3~5씩 | RHF 5 vs 수동 14, canSubmit 비활성 vs 에러 표시, `*` vs `(선택)`, 스피너+라벨 vs 라벨만, 말줄임 `...` vs `…` |
| 5 | 금액·수량 입력 컴포넌트 | 5 | UnitInput / InputWithUnit / 콤마 금액 / type=number / inputMode Input |
| 6 | 위험 동작 확인 | 3 | ConfirmDeleteDialog 7 / AlertDialog 자체 구성 14 / Dialog+타이핑 확인 |
| 7 | 반응형 목록 | 3 | 표+카드 이중 마크업 10파일 / 카드 내부 이중 3파일 / 표 단독 5파일 |
| 8 | 섹션 카드 컨테이너·제목 | 4 / 3 | Card / Surface / 직접 r-lg border / GlassCard; CardTitle / `<h2>` 12종 / 상태색 h2 |
| 9 | 탭·필터·페이지 상태 위치 | 3 | URL / 로컬 useState / 컨텍스트; 페이지네이션도 URL·클라이언트·더 보기 |
| 10 | 반응형 분기 | 3 | Tailwind lg 중심 / JS 훅 1280·1023 / 별도 컴포넌트 |
| 11 | 빈 상태 | 3 | EmptyState 박스·text / 직접 `<p>` |
| 12 | 퍼센트·날짜 포맷 | 3 | 공용 fmt / 위젯 로컬 fmt / 직접 `toFixed`·템플릿 |
| 13 | 토스트 어미 | 3 | 했습니다 21 / 되었습니다 19 / 됐습니다 5 |

### (b) 통일 시 공용 프리미티브로 줄어드는 묶음 상위 10 (줄 수는 추정 — 근거 명시)

| 순위 | 프리미티브(안) | 대체 대상 | 감량 추정 | 근거 |
|---|---|---|---|---|
| 1 | `ResponsiveDataList`(표 컬럼 정의 하나로 데스크톱 표 + 모바일 카드 렌더) | 이중 마크업 10파일 합 2,222줄 + 카드 3파일 481줄 | 450~650줄 (표+카드 10파일 기준 20~30%) | 파일 줄 수는 `wc -l`. 비율은 한 파일 안에서 카드 쪽 마크업이 표와 같은 필드를 재표기한다는 가정(미검증, 각 파일 중 `lg:hidden` 블록 길이는 일부만 확인) |
| 2 | `ConfirmDialog`(위험/일반, 설명·진행 라벨·선택적 입력 슬롯) | 자체 AlertDialog 9파일 619줄 + 인라인 5곳 | 약 250~300줄 | 공용 `ConfirmDeleteDialog`가 본문 36줄로 같은 일을 하므로 9파일 각 25~35줄 마크업을 5줄 호출로 치환 |
| 3 | 라우트 로딩 프리셋(`RouteSkeleton variant=form/detail/list/admin`) | `loading.tsx` 39파일 438줄, 이 중 손수 pulse 17파일 257줄 | 약 250줄 | 손수 pulse 17파일을 프리셋 호출 3~5줄로 치환(257 → 약 70). `@modal` 쌍 10파일은 `ModalFormSkeleton` 재사용이라 추가 감량 작음 |
| 4 | `FormField`(Label + 입력 슬롯 + 힌트 + 에러 + aria 연결) | 필드 에러 `<p>` 52줄, `<Label>` 104줄, `aria-describedby` 32줄 직접 조립 | 약 150~250줄 | 필드당 라벨·에러·aria 연결 3~5줄 중복(14개 수동 폼 + RHF 5개) |
| 5 | `PendingButton`/`SubmitButton`(스피너+라벨+진행 문구 통일) | `SaveButton`·`FormActions` 내부 스피너, 버튼 `isPending ? '… 중...'` 약 20곳 | 약 60~100줄 | 20곳 × 3~5줄 + 진행 문구("중..." 47 vs "중…")가 한 곳으로 모임 |
| 6 | `ChartCard` 로더(동적 import + fallback + 헤더 토글 셸) | 차트 래퍼 5파일 합 202줄 | 약 60~80줄 | 5파일의 동일한 "차트 불러오는 중…" dynamic fallback/Card 셸 복붙 |
| 7 | `InlineStatus`(로딩/에러/빈 상태 3종을 한 컴포넌트로) — `SectionError`·`EmptyState`·`LoadingRow` 합치고 에러 색 1종으로 | 직접 빈 상태 11곳, 직접 로딩 텍스트 약 14곳, 인라인 에러 약 22곳 | 약 80~120줄 (줄 수보다 일관성 효과 큼) | 각 곳 1~3줄 대체. 에러 색 4종 → 1종 |
| 8 | `Percent`/`fmtPercent`·`fmtNumber`(부호 없는 퍼센트, 소수 자릿수) + 위젯 로컬 fmt 흡수 | 위젯 로컬 `fmt*` 약 20개, `toFixed` 23줄, `${n}%` 24줄 | 약 50~80줄 | `CryptoIndicatorCards.tsx` 한 파일이 로컬 fmt 9개 |
| 9 | 카드 컨테이너 일원화(`Surface` 하나, `Card`와 병합) | `Card` 28파일 / `Surface` 13파일 / 직접 `rounded-[var(--r-lg)] border` 33파일 | 줄 감량 작음(약 30~50줄), 시각 언어 2종 → 1종이 목적 | 클래스 문자열 41줄을 `Surface` 호출로 치환 |
| 10 | 섹션 제목 `SectionTitle`(+ 가계부 폼 형태 통일 기준) | `CardTitle role="heading" aria-level={2} className="text-base lg:text-lg"` 26곳 복붙, 손수 `<h2>` 40줄 | 약 40~60줄 | 26곳 × 1줄 + h2 클래스 조합 12종 정리 |

참고(폼 형태 통일은 줄 수 외 효과가 큼): 거래내역(Dialog)을 자산 기록처럼 페이지+모달로 바꾸거나 반대로 만들면 `TransactionFormDialog`/`AssetForm` 계열 한쪽의 `FormBody`+`@modal`+`loading.tsx` 쌍(`@modal` 페이지 합 149줄, `FormBody` 9파일 294줄, `@modal` loading 10파일)을 줄일 수 있으나, 어느 쪽으로 통일할지는 결정 사항이라 감량치는 적지 않았다.

### (c) 규칙 문서는 있는데 코드가 안 따르는 지점

1. `copy.md` "같은 개념·행위는 한 플로우 안에서 하나의 용어" — 확정 버튼 진행 문구가 "삭제 중..."·"처리 중..."·"변경 중..."·"재설정 중..."·"인출 중..."으로 동사별 제각각이지만 한 플로우 안 불일치 자체는 확인 못 함(규칙 위반이라기보다 규칙 미비).
2. `copy.md` 토스트 레이어 컨벤션 — entities 성공 토스트(`useUserQueries.ts:74,104,116`)는 마침표 있음 vs 같은 파일 `:62`는 없음. `copy.md`가 entities `onError`에 대해서만 "항상 마침표"를 규정하고 `onSuccess`는 규정이 없어 위반이라 단정하기 어렵다 → 규칙 공백에 가까움.
3. `widgets.md` "SegmentedToggle로 통일, 위젯마다 `ModeButton`류를 다시 만들지 않는다" — 대부분 준수(20곳). 예외 후보: `AssetOverviewParts.tsx:125`(카테고리 선택 aria-pressed), `MarketChartCardInner.tsx:259`(RSI 토글) — 의미가 달라 의도적일 수 있음(주석 근거 없음).
4. `shared.md` CTA 위계 "파괴적 동작은 destructive" — 12곳 준수, 인출(`WithdrawCapitalForm.tsx:113`)은 기본색. 파괴적 정의가 문서에 없어 판정 보류.
5. `app.md` "loading.tsx는 새 라우트와 함께" — 5개 라우트에 자체 `loading.tsx` 없음(상위가 덮는지 확인 못 함).
6. `constraints.md` "인라인 style 원칙 금지, 토큰값 예외" — 정적 토큰 색 인라인 style 약 25줄이 "예외"로 허용되나 Tailwind `text-[var(--…)]` 대안이 이미 33줄 쓰여 동일 목적의 이중 표기. 위반이라기보다 예외 범위가 넓음.
7. `shared.md` "SectionError" — 38곳 사용 중이나 인라인 한 줄 텍스트로 실패를 표시하는 곳 약 22곳이 같은 상황(조회 실패)을 다른 컴포넌트·색으로 표시. 규칙은 SectionError 설명만 있고 "조회 실패는 SectionError로"라는 문장은 없다(규칙 공백).
8. `a11y.md` — 필드 에러 `role="alert"` 사용이 일부 폼만(`WithdrawCapitalForm.tsx:98`, `InjectCapitalForm.tsx:95`, `InitialHoldingsSection.tsx:44` 등)이고 `AccountInfoFields.tsx:29`·`BudgetForm.tsx:139` 등은 없음. a11y.md에 에러 알림 규칙이 없어 위반은 아님.

명시 규칙과의 직접 충돌로 확인된 것은 거의 없다(1·5·6은 해석 여지). 대부분이 (d)의 규칙 공백이다.

### (d) 규칙이 아예 없는 영역

1. 로딩 표현 선택 기준(라우트 loading vs 위젯 skeleton vs LoadingRow vs 텍스트 vs Spinner)과 위젯 로딩 문구("불러오는 중…")
2. 빈 상태/에러 상태 표시 컴포넌트 사용 의무와 에러 문구 색(destructive/status-error/warn/muted)
3. 생성·수정 폼 형태 선택 기준(페이지 / 모달 쌍 / Dialog / 인라인) — 가계부 안에서 4갈래
4. 폼 검증 시점, 필드 에러 표시 위치·`role="alert"`, 필수/선택 표시(`*` vs `(선택)`), 제출 중 버튼·진행 문구 말줄임(`...` vs `…`), 성공 후 동작(toast/이동/닫기)
5. 금액·수량·날짜 입력 컴포넌트 선택 기준(5종)
6. 확인 다이얼로그 제목/설명/진행 문구, destructive 제목색
7. 토스트 성공·실패 어미(했습니다/되었습니다/됐습니다, 실패했습니다/하지 못했습니다)
8. 모바일·데스크톱 이중 마크업 방식과 페이지네이션/필터 상태 위치(URL vs 로컬)
9. 포매터 사용 의무·부호 없는 퍼센트·소수 자릿수·날짜 표기 규칙, 위젯 로컬 포매터 허용 범위
10. 페이지 골격(섹션 카드 컨테이너 Card vs Surface, 섹션 제목 크기, 간격 `space-y`/`gap` 단계, 페이지 최대폭)
11. 임의값(`[10px]` 등) 허용 한도와 토큰의 Tailwind theme 승격 기준
12. 내비게이션 목록 단일 출처(데스크톱/모바일/관리자 네비가 항목 배열을 복제)

---

## 확인 못 한 것 / 한계

- 실제 렌더 결과(화면에서 스켈레톤이 보이는 시점, 에러 색의 시각 차이)는 보지 않았다. 정적 grep 결과만이다.
- 이중 마크업 10파일의 카드 쪽 줄 수는 파일 전체 줄 수만 셌다. `lg:hidden` 블록 단위 줄 수는 측정하지 않아 (b)-1의 감량치는 비율 가정이다.
- `loading.tsx`가 없는 5개 라우트가 상위 세그먼트의 `loading.tsx`로 덮이는지는 확인하지 않았다.
- 토스트 "기타 7줄"의 종류(info/warning/message)는 분류하지 않았다.
- 문자열 내 긴 줄표 "—" 사용 여부, 해요체 잔존 여부는 grep이 zsh 글로브 오류로 실행되지 않아 확인 못 했다.
- URL 대 로컬 상태 비율은 화면 단위가 아니라 훅/컴포넌트 단위 대략치다.

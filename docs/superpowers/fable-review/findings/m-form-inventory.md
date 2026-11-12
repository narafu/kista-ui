# M. 폼 전수표 (읽기 전용 조사, 2026-11-12)

지침서 `guides/04-routes-and-forms.md` 결정 1·태스크 1의 산출물. 정적 grep·파일 읽기만 썼다(빌드·dev 서버·브라우저 미사용 → 실제 렌더·동작은 확인 못 함). 검색 범위는 `features/ widgets/ app/ shared/`의 비테스트 `.tsx`.

## 개수 (실제를 센 결과)

- `<form` JSX 태그 19개(`grep -rn "<form" features widgets app shared` 비테스트), `useForm(` 사용 파일 6개 — `findings/g` 4절의 "`<form>` 19개, RHF 5·수동 14"와 `<form>` 수는 일치.
- `<form` 없이 입력을 받는 생성·수정 흐름 9개가 더 있다: 계좌 등록 스테퍼, 일괄 등록, 닉네임, 텔레그램(설정), 텔레그램(/pending), 초대 코드 입력, 초대 코드 발급 Dialog, 전략 추천 목록 편집기, 계좌 삭제 타이핑 확인 Dialog. 반대로 `<form` 19개 중 `DcaRuleEditor`(규칙 하위 뷰)와 `CredentialsCard`(페이지 안 카드)는 독립 흐름이 아니라 다른 폼 안의 구성 요소다.
- 합계 **28행**(아래 표). 지침서의 "31개"는 추정치였고 실제는 28행이다. 3개 차이는 이 조사가 폼으로 보지 않은 것들일 가능성이 높다(즉시 저장 토글 `TradingAlertToggle`·`HideAmountsToggle`·관리자 `ToggleRow`, 조회·실행 폼 `BacktestForm`, 목록 필터 패널). 같은 컴포넌트를 등록·복제·수정 동작별로 나누면 39개 동작이다(StrategyForm 2, DcaStrategyForm 2, AssetForm 3, BudgetForm 3, TransactionFormDialog 3, 카테고리·시스템 카테고리·재무계좌 각 2). 지침서 완료 판정을 "28행"으로 고치길 권한다.
- 제외: `BacktestForm`(`widgets/backtest/BacktestPageContent.tsx:26`, 시뮬레이션 실행 조회 폼이라 생성·수정 아님), 목록 필터(`AdminTradeFilterPanel`·`AssetRecordFilters`·`OrderHistoryFilters` 등), 입력 없는 AlertDialog 확인(`ConfirmDeleteDialog` 포함 다수), 에러 로그 체크박스(`ErrorLogItem`·`ErrorLogsSectionClient`, 선택용).
- 타이핑 확인(입력 있는 확인)은 10번 하나뿐이다(`<Input` 있는 Dialog 파일을 전수 대조).

## 표

현재 형태 표기: 페이지 = 전용 `page.tsx`만, 페이지+@modal = 원본 page와 `@modal` 인터셉트 쌍, Dialog, 인라인, +AlertDialog 확인 = 제출 후 확인 단계 동반. 구현: RHF = react-hook-form+zod, 수동 = useState.

| # | 폼(컴포넌트 file:line) | 엔티티/동작 | 현재 형태 | 진입 경로 | 필드 수 | 하위 뷰·단계 | URL 파라미터 의존 | 구현 | 목표 형태 | 판정 근거 |
|---|---|---|---|---|---:|---|---|---|---|---|
| 1 | `StrategyForm` features/strategy/create-strategy/StrategyForm.tsx:109 (`StrategyFormPage`가 감쌈) | 전략 등록·수정(INFINITE·PRIVACY·VR) | 페이지+@modal | 등록: `NewStrategyButton.tsx:20` router.push, `AddStrategyButton.tsx:35` Link, `AllStrategiesList.tsx:33` Link / 수정: `StrategyDetailContent.tsx:70` Link | 유형별 6~15(유형·분할수·종목·보유·예약시작·VR설정·시드·사이클시드 등 8섹션) | 없음(섹션 8개 한 화면 스크롤) | path `[id]`·`[sid]`만(searchParams 없음: `NewStrategyFormBody.tsx:13`, `EditStrategyFormBody.tsx:16`) | useForm 훅(`useStrategyForm`) | 페이지 | 섹션 다수. 지침서 확정 |
| 2 | `DcaStrategyForm` features/strategy/create-strategy/DcaStrategyForm.tsx:147 (`StrategyForm.tsx:88`에서 DCA 선택 시) | 전략 등록·수정(DCA 주식·크립토) | 페이지+@modal (1과 같은 쌍) | 1과 동일 | 종목·예약시작·시드·보유 + 규칙 목록(규칙당 필드 별도) | 있음: 규칙 편집 하위 뷰(`editing` state `:53`, `useSubviewHistory` `:59`) | path만 | RHF(`useForm` `:48`, `useFieldArray`) | 페이지 | 하위 뷰 있음. 지침서 확정 |
| 3 | `DcaRuleEditor` features/strategy/create-strategy/sections/DcaRuleEditor.tsx:37 | DCA 규칙 편집(2번 안의 하위 뷰 폼) | 하위 뷰(2번 페이지 안) | `DcaStrategyForm.tsx:108` `setEditing` | 설정·조건·사이징 3섹션(약 8~12) | — (2번의 하위 뷰 자체) | 없음 | RHF+zod(`dcaRuleSchema` `:30`) | 현행 유지(2번 안의 하위 뷰) | 폼 페이지 안 하위 뷰. 다이얼로그 후보 아님 |
| 4 | `ReconfigureVrForm` features/strategy/reconfigure-vr/ReconfigureVrForm.tsx:137 | VR 재설정 | 페이지+@modal +AlertDialog 확인(`:161`) | `StrategyDetailContent.tsx:45` Link (`strategy.vr`일 때만) | 15(ParamsSection 2·RampSection 8·Inject 3·Withdraw 2, `ReconfigureVrSections.tsx:55-147`) | 4섹션, 제출 후 확인 단계 | path만 | RHF(`useForm` `:95`) | 페이지 | 섹션 4개. 지침서 확정 |
| 5 | `InjectCapitalForm` features/strategy/inject-capital/InjectCapitalForm.tsx:81 | 투자금 추가 | 페이지+@modal +AlertDialog 확인(`:100`) | `StrategyDetailContent.tsx:54` Link | 1(추가 예수금 `:87`) | 제출 후 확인 단계(다이얼로그 안에서 AlertDialog 중첩 문제) | path만(`InjectCapitalFormBody.tsx`) | RHF(`useForm` `:60`) | 다이얼로그 | 필드 1개. 지침서 확정(확인 단계 처리는 4절 A) |
| 6 | `WithdrawCapitalForm` features/strategy/withdraw-capital/WithdrawCapitalForm.tsx:83 | 투자금 인출 | 페이지+@modal +AlertDialog 확인(`:103`) | `StrategyDetailContent.tsx:61` Link (`canWithdrawCapital`) | 1(`:90`) | 제출 후 확인 단계 | path만 | RHF(`:62`) | 다이얼로그 | 5와 동일(5·6 병합 대상, 지침서 5c) |
| 7 | `CreateAccountStepper` features/account/create-account/CreateAccountStepper.tsx:11 (steps/*) | 브로커 계좌 등록 | 페이지(모달 쌍 없음) | `NewAccountButton.tsx:16` Link `/accounts/new` (사용처: `accounts/page.tsx:40`, `AccountsPageContent.tsx:35`, `AllStrategiesList.tsx:42`, `DashboardEmpty.tsx:38,68`, `DashboardOverview.tsx:20`) | 약 6(브로커·API키·시크릿·만료일·별칭·계좌번호) | 있음: 4단계 스테퍼(Broker→Api→AccountInfo→Confirm) | 없음. 단 로그인 `next=/accounts/new` 복귀 경로가 있음(`auth/callback/route.test.ts:38`, `login/page.test.tsx:41`) | 수동(`<form>` 없음, 단계별 state) | 페이지 | 스테퍼. 지침서 확정 |
| 8 | `EditAccountForm` features/account/edit-account/EditAccountForm.tsx:84 | 브로커 계좌 수정 | 페이지(쌍 없음) | `AccountDetailContent.tsx:48` Link | 3(별칭·계좌번호·만료일) | 없음(아래 9·10 동반) | path `[id]` | 수동(`:40`) | 페이지 | 지침서 확정(자격증명 카드·삭제 구역 동반 페이지) |
| 9 | `CredentialsCard` features/account/edit-account/CredentialsCard.tsx:43 | 계좌 자격증명 교체 | 인라인(8번 페이지 안 카드, 자체 `<form>`) | `EditAccountForm.tsx:123`(비MOCK일 때) | 3(키·시크릿·만료일 `:49-57`) | 없음 | 없음 | 수동(`:21`) | 현행 유지-인라인 | 8번 페이지 구역. 별도 형태 선택 대상 아님 |
| 10 | `EditAccountForm` 삭제 Dialog features/account/edit-account/EditAccountForm.tsx:134 | 브로커 계좌 삭제(별칭 타이핑 확인) | Dialog(입력 있는 확인) | 같은 파일 `:135` DialogTrigger | 1(별칭 입력 `:147`) | 없음 | 없음 | 수동(`:42`) | 현행 유지(타이핑 확인 Dialog) | 입력 있는 확인. 지침서 형태 2종 중 "다이얼로그"에 포함, 별도 표기 |
| 11 | `AssetForm` features/asset/save-asset/AssetForm.tsx:121 (`AssetFormPage`·`AssetFormFields`) | 자산 기록 등록·복제·수정 | 페이지+@modal | 등록: `NewAssetButton.tsx:19` router.push ← `FinanceHeader.tsx:67` / 복제: `AssetRecordRows.tsx:57` / 수정: `AssetRecordRows.tsx:58` | 약 7(기준일·카테고리·시장·자산군·계좌·전략·메모·금액, 조건부) | 없음(카드 1개) | `?duplicateFrom=`(`finance/new/NewAssetFormBody.tsx:15,22`, `AssetRecordRows.tsx:57`), path `[id]` | 수동(`:69-86`) | 페이지(지침서) — 4절 B 참고 | 지침서 확정. 단 기준에 따르면 다이얼로그 후보 |
| 12 | `BulkRegisterForm` widgets/finance-bulk-register/BulkRegisterForm.tsx | 일괄 등록(지난달→이번달 복사) | 페이지(쌍 없음) | `AssetSettingsPanel.tsx:28` Link `/finance/bulk-register` | 월 2 + 선택 행 다수 + 공유 스위치 | 없음(선택 표) | 없음(`defaultSourceMonth`는 서버 prop) | 수동(`<form>` 없음, `:69`) | 페이지 | 표 선택형 대화면. 지침서 확정 |
| 13 | `BudgetForm` features/finance/manage-budgets/BudgetForm.tsx:96 | 예산 등록·복제·수정 | 페이지+@modal (목록도 @modal) | 등록: `BudgetManager.tsx:179` Link, `FinanceBudgetProgress.tsx:175` Link / 복제: `BudgetManager.tsx:220` / 수정: `BudgetManager.tsx:219` | 5(카테고리·시작일·종료일·월 예산·그룹 공유) | 없음 | `?duplicateFrom=`·`?categoryId=`(`NewBudgetFormBody.tsx:19,28,31,41`, `budgetRoutes.ts:23-28`), path `[type]`·`[id]` | 수동(`:57-64`) | 다이얼로그 | 필드 5·하위 뷰 없음. URL 초기값은 prop으로 바꿔야 함(3절) |
| 14 | `TransactionFormDialog` features/finance/save-transaction/TransactionFormDialog.tsx:99 | 거래내역 등록·복제·수정 | Dialog | 등록: `NewTransactionButton.tsx:24` ← `FinanceHeader.tsx:76` / 수정·복제: `FinanceRecordList.tsx:227,228,273,274`(`:303,313`) | 5(날짜·카테고리·금액·메모·그룹 공유) | 없음 | 없음(복제 값은 prop `duplicateFrom` `:35`) | 수동(`:51-61`) | 현행 유지(다이얼로그) | 이미 목표 형태 |
| 15 | `CategoryFormDialog` features/finance/manage-categories/CategoryFormDialog.tsx:76 | 가계부 카테고리 생성·수정 | Dialog | `CategoryManager.tsx:76` 버튼 / 행 수정(같은 파일 `:108`) | 3(이름·정렬·공유) + 부모 선택(`CategoryParentField`) | 없음 | 없음 | 수동(`:36-46`) | 현행 유지 | 이미 목표 형태(생성·수정 쌍 병합은 지침서 5a) |
| 16 | `SystemCategoryFormDialog` features/finance/manage-categories/SystemCategoryFormDialog.tsx:73 | 시스템 카테고리 생성·수정(관리자) | Dialog | `SystemCategoryManager.tsx:55` 버튼(`:83`) | 2(이름·정렬) | 없음 | 없음 | 수동(`:36`) | 현행 유지 | 이미 목표 형태 |
| 17 | `AccountFormDialog` features/finance/manage-accounts/AccountFormDialog.tsx:81 | 재무 계좌 생성·수정 | Dialog | `AccountManager.tsx:99` 버튼(`:178`) | 7(유형·이름·기관·번호·소유자·메모·공유) | 없음 | 없음 | 수동(`:35-47`) | 현행 유지 | 이미 목표 형태(필드 7은 다이얼로그 상한 근처, 4절 C) |
| 18 | `AddPrivacyOrderDialog` widgets/admin-privacy-trade-list/AddPrivacyOrderDialog.tsx:54 | P 매매표 주문 추가(관리자) | Dialog | `AdminPrivacyBaseTable.tsx:197,230`→`:265` | 4(방향·유형·가격·수량) | 없음 | 없음 | 수동(`:26`) | 현행 유지 | 이미 목표 형태 |
| 19 | `CreatePrivacyBaseDialog` widgets/admin-privacy-trade-list/CreatePrivacyBaseDialog.tsx:84 | P 매매표 기준 등록(관리자) | Dialog(`max-h-[85vh] overflow-y-auto`) | `AdminPrivacyBaseTable.tsx:165`→`:244` | 6 + 주문 행 N×4 | 반복 행(동적 목록), 하위 뷰는 없음 | 없음 | 수동(`:38-43`) | 현행 유지 | 지침서 확정. 단 한 화면을 넘는 스크롤 Dialog(4절 D) |
| 20 | `EditPrivacyBaseDialog` widgets/admin-privacy-trade-list/EditPrivacyBaseDialog.tsx:48 | P 매매표 기준 수정(관리자) | Dialog | `AdminPrivacyBaseTable.tsx:195,228`→`:248` | 4 | 없음 | 없음 | 수동(`:20-23`) | 현행 유지 | 이미 목표 형태(18~21 4개 쌍 병합은 지침서 5b) |
| 21 | `EditPrivacyOrderDialog` widgets/admin-privacy-trade-list/EditPrivacyOrderDialog.tsx:50 | P 매매표 주문 수정(관리자) | Dialog | `AdminPrivacyBaseTable.tsx:196,229`→`:256` | 2(가격·수량) | 없음 | 없음 | 수동(`:24-25`) | 현행 유지 | 이미 목표 형태 |
| 22 | `AdminSettingsForm` features/admin/settings/ui/AdminSettingsForm.tsx:176 | 운영 설정(관리자) | 페이지(인라인 전체 폼) | `app/(admin)/admin/settings/page.tsx:24` | 다수(브로커 토글·전략별 `FieldEditor`·`ValueListEditor`·`RecurringModeEditor`) | 전략별 펼침 패널(`:59` aria-expanded) | 없음 | 수동(`:92`) | 페이지 | 섹션 다수. 지침서 확정 |
| 23 | `NicknameEditor` features/settings/edit-nickname/NicknameEditor.tsx:16 | 닉네임 수정 | 인라인(연필 아이콘→입력) | `SettingsPageContent.tsx:39` | 1 | 없음 | 없음 | 수동(`:16-18`) | 현행 유지-인라인 | 지침서는 "다이얼로그"로 분류했으나 실제는 인라인. 4절 E |
| 24 | `TelegramSection` features/settings/telegram-connect/TelegramSection.tsx:112 | 텔레그램 연결 | 인라인(+연결 해제는 `ConfirmDeleteDialog` `:66`) | `SettingsPageContent.tsx:46` | 2(Bot Token·Chat ID `:83,98`) | 없음 | 없음 | 수동(`useTelegramConnectForm`) | 현행 유지-인라인 | 설정 카드 안 폼 |
| 25 | `PendingTelegramConnect` features/settings/telegram-connect/PendingTelegramConnect.tsx:99 | 텔레그램 연결(승인 대기 화면) | 인라인(버튼→펼침 `:18,99`) | `app/pending/page.tsx:61` | 2(`:56,71`) | 없음 | 없음 | 수동 | 현행 유지-인라인 | 24와 같은 폼 훅 재사용 |
| 26 | `AcceptInvitationForm` features/finance/manage-group/AcceptInvitationForm.tsx:9 | 그룹 초대 코드 입력·참여 | 인라인(`<form>` 없음, 버튼 onClick `:36`) | `GroupManager.tsx:119` | 1(코드) | 없음 | 없음 | 수동(`:11`) | 현행 유지-인라인 | 입력 1개 |
| 27 | `InviteDialog` features/finance/manage-group/InviteDialog.tsx:72 | 그룹 초대 코드 발급 | Dialog(입력→결과 코드 표시 2상태) | `GroupManager.tsx:61,110` | 1(만료 시간 Select `:95`) | 같은 다이얼로그 안 결과 전환 | 없음 | 수동(`:38`) | 현행 유지(다이얼로그) | 이미 목표 형태 |
| 28 | `SuggestionListEditor` shared/ui/SuggestionListEditor.tsx:58 (`StrategySuggestionManager.tsx:29`) | 전략 추천 종목·값 목록 편집(가계부 설정) | 인라인(+삭제 `ConfirmDeleteDialog` `:98`) | `AssetSettingsPanel.tsx:48` `StrategySuggestionManager` | 1(추가 입력 `:58`) | 없음 | 없음 | 수동 | 현행 유지-인라인 | 목록 편집기 |

### 집계 (28행)

| 현재 형태 | 행 | 개수 |
|---|---|---:|
| 페이지(쌍 없음) | 7, 8, 12, 22 | 4 |
| 페이지+@modal 쌍 | 1, 2, 4, 5, 6, 11, 13 | 7 |
| Dialog | 10, 14~21, 27 | 10 |
| 인라인 | 9, 23, 24, 25, 26, 28 | 6 |
| 페이지 안 하위 뷰 | 3 | 1 |

| 목표 형태 | 행 | 개수 |
|---|---|---:|
| 다이얼로그로 전환(원본 page 삭제) | 5, 6, 13 | 3 |
| 페이지(`@modal` 쌍이면 인터셉트만 삭제) | 1, 2, 4, 7, 8, 11, 12, 22 | 8 |
| 현행 유지 다이얼로그 | 10, 14~21, 27 | 10 |
| 현행 유지 인라인·하위 뷰 | 3, 9, 23, 24, 25, 26, 28 | 7 |

폼 컴포넌트 기준으로 지침서가 정한 목표와 다르게 판정한 행은 없다. 다만 지침서 분류가 사실과 다른 곳이 한 곳 있다(닉네임 = 다이얼로그가 아니라 인라인, 4절 E).

---

## 1. @modal 인터셉트 라우트 10개 → 처리

`app/(main)/@modal/` 아래 `page.tsx` 10개(+ 각 `loading.tsx`, `default.tsx`, `[...catchAll]/page.tsx`). 폼 9개 + 목록 1개.

| # | @modal 라우트 (`app/(main)/@modal/...`) | 대응 원본 page | FormBody 파일 | 목표 |
|---|---|---|---|---|
| 1 | `(.)accounts/[id]/strategies/new` | `app/(main)/accounts/[id]/strategies/new/page.tsx` | `.../new/NewStrategyFormBody.tsx` | 인터셉트만 삭제, 페이지 유지(폼 1·2) |
| 2 | `(.)accounts/[id]/strategies/[sid]/edit` | `.../[sid]/edit/page.tsx` | `.../edit/EditStrategyFormBody.tsx`(+`.test.tsx`) | 인터셉트만 삭제, 페이지 유지(폼 1·2) |
| 3 | `(.)accounts/[id]/strategies/[sid]/reconfigure-vr` | `.../[sid]/reconfigure-vr/page.tsx` | `.../reconfigure-vr/ReconfigureVrFormBody.tsx` | 인터셉트만 삭제, 페이지 유지(폼 4) |
| 4 | `(.)accounts/[id]/strategies/[sid]/inject-capital` | `.../[sid]/inject-capital/page.tsx` | `.../inject-capital/InjectCapitalFormBody.tsx` | 다이얼로그로 전환, 원본 page·FormBody·loading·인터셉트 모두 삭제(폼 5) |
| 5 | `(.)accounts/[id]/strategies/[sid]/withdraw-capital` | `.../[sid]/withdraw-capital/page.tsx` | `.../withdraw-capital/WithdrawCapitalFormBody.tsx` | 다이얼로그로 전환, 모두 삭제(폼 6) |
| 6 | `(.)finance/new` | `app/(main)/finance/new/page.tsx` | `finance/new/NewAssetFormBody.tsx` | 인터셉트만 삭제, 페이지 유지(폼 11, `?duplicateFrom=` 깊은 링크 필요) |
| 7 | `(.)finance/[id]/edit` | `finance/[id]/edit/page.tsx` | `finance/[id]/edit/EditAssetFormBody.tsx` | 인터셉트만 삭제, 페이지 유지(폼 11) |
| 8 | `(.)finance/budgets/[type]/new` | `finance/budgets/[type]/new/page.tsx` | `finance/budgets/[type]/new/NewBudgetFormBody.tsx` | 다이얼로그로 전환, 원본 page·FormBody·인터셉트 삭제(폼 13) |
| 9 | `(.)finance/budgets/[type]/[id]/edit` | `finance/budgets/[type]/[id]/edit/page.tsx` | `finance/budgets/[type]/[id]/edit/EditBudgetFormBody.tsx` | 다이얼로그로 전환, 모두 삭제(폼 13) |
| 10 | `(.)finance/budgets/[type]` (목록) | `finance/budgets/[type]/page.tsx` | `finance/budgets/[type]/BudgetListBody.tsx` | 라우트 삭제, 목록은 가계부 설정 일반 구역으로 이동(아래) |

결과: 인터셉트만 삭제 5개(1·2·3·6·7, 원본 page 5개 유지) / 인터셉트와 원본 삭제 5개(4·5·8·9·10). `app/(main)/finance/budgets/` 디렉토리 전체와 `accounts/[id]/strategies/[sid]/{inject,withdraw}-capital/` 디렉토리가 사라진다. 그러면 `@modal`에는 `default.tsx`·`[...catchAll]`만 남으므로 지침서 태스크 3 판정(`ls "app/(main)/@modal"` 없음)대로 폴더째 삭제하고, `app/(main)/layout.tsx`의 `modal` 슬롯 prop(`:22,25,85`)도 같이 제거한다.

### 예산 목록(`/finance/budgets/[type]`) 처리 방향

- 현재 링크: `FinanceHeader.tsx:72` "예산 관리" Link(`budgetListHref(flowType)`, 수입·소비·저축 탭 헤더 액션). 그 외 목록으로 돌아가는 곳: `BudgetForm.tsx:48`(`router.push(budgetListHref(type))`), `NewBudgetFormBody.tsx:37`·`EditBudgetFormBody.tsx:32` `eyebrowHref`. 설정 화면에서는 링크하지 않는다(`AssetSettingsPanel.tsx:18` 주석이 "탭 상단 링크로 이관"을 기록).
- 제안: `AssetSettingsPanel`(`widgets/asset-settings/AssetSettingsPanel.tsx:39-48`, 카테고리 `:43`·재무계좌 `:46` 옆)에 "예산" `Surface` 구역을 추가한다. `BudgetManager`가 `type`(수입·소비·저축) prop을 하나씩 받으므로(`BudgetManager.tsx:64` 주석) 구역 안에서 `SegmentedToggle`로 유형을 고르거나 유형별 3개 구역으로 둔다. 등록·수정은 `BudgetForm` 다이얼로그를 구역 안에서 연다. `FinanceHeader.tsx:72`의 "예산 관리" 링크는 설정 탭(`/finance/settings`)으로 보내거나 삭제한다.
- 같이 정리할 것: `BudgetManager.tsx:76-85`의 `useSearchParams`+`window.history.replaceState` 필터·페이지(`status`·`category`·`page`·`size`)는 라우트 모달이 unmount되는 문제 때문에 생긴 것이므로 설정 구역에서는 로컬 state로 단순화할 수 있다(테스트 `BudgetManager.test.tsx:87,249,266,282,296`이 URL 동작을 고정하고 있어 같이 고쳐야 함). `FinanceHeader.tsx:42-43`의 `@modal` 경로 되돌리기 정규식과 `FinanceHeader.test.tsx:61` 케이스도 불필요해진다.
- 설정 화면에서 열 때 필요한 데이터: `BudgetListBody.tsx:19-25`가 서버에서 카테고리·예산 목록을 prefetch한다. 설정 페이지(`finance/(dashboard)/settings/page.tsx`)는 `meQueryOptions`만 prefetch하므로 클라이언트 쿼리로 로드하거나 prefetch를 추가한다.

---

## 2. 다이얼로그로 옮길 폼으로 가는 링크·router.push·redirect 전부

대상 폼: 5(투자금 추가), 6(투자금 인출), 13(예산 등록·복제·수정) + 예산 목록. 페이지 URL이 사라지면 깨질 곳이다.

### 코드(비테스트)

| 대상 URL | 위치 | 내용 |
|---|---|---|
| `/accounts/{id}/strategies/{sid}/inject-capital` | `widgets/strategy-detail/StrategyDetailContent.tsx:54` | `<Link href>` 투자금 추가 버튼(다이얼로그 트리거로 교체) |
| `.../withdraw-capital` | `widgets/strategy-detail/StrategyDetailContent.tsx:61` | `<Link href>` 투자금 인출 버튼 |
| 위 두 URL 복귀 | `features/strategy/inject-capital/InjectCapitalForm.tsx:45-46`, `features/strategy/withdraw-capital/WithdrawCapitalForm.tsx:45-46` | `backHref`(`/accounts/{id}/strategies/{sid}`)로 `router.push`/`router.back`(`dismiss` 분기) |
| 상세 페이지 서버 로드 | `.../inject-capital/InjectCapitalFormBody.tsx`, `.../withdraw-capital/WithdrawCapitalFormBody.tsx` | 서버에서 `strategy`·`account` 조회 후 폼에 전달 — 다이얼로그가 되면 `StrategyDetailContent`가 가진 데이터로 대체해야 함(통화는 `brokerCurrency(account.broker)`) |
| `/finance/budgets/{slug}`(목록) | `app/(main)/finance/(dashboard)/FinanceHeader.tsx:72` | "예산 관리" `<Link>` |
| 같은 목록 | `features/finance/manage-budgets/BudgetForm.tsx:48` | 완료 시 `router.push(budgetListHref(type))` / `router.back()` |
| 같은 목록 | `app/(main)/finance/budgets/[type]/new/NewBudgetFormBody.tsx:37`, `.../[id]/edit/EditBudgetFormBody.tsx:32`, `.../[type]/BudgetListBody.tsx:23`(`/finance/${slug}` 상위 탭 링크) | `PageHeader eyebrowHref` — 원본 page와 함께 삭제됨 |
| `/finance/budgets/{slug}/new` | `features/finance/manage-budgets/BudgetManager.tsx:179` | `<Link href={newBudgetHref(type)}>` 예산 추가 |
| `.../new?duplicateFrom=` | `BudgetManager.tsx:220` | `duplicateHref={newBudgetHref(type, { duplicateFrom })}` |
| `.../{id}/edit` | `BudgetManager.tsx:219` | `editHref={editBudgetHref(type, id)}` |
| `.../new?categoryId=` | `widgets/finance-budget-progress/FinanceBudgetProgress.tsx:175` | 실적만 있는 카테고리 "예산 추가" `<Link>` |
| 헬퍼 전체 | `entities/finance/lib/budgetRoutes.ts:19-32`, `entities/finance/index.ts:111`(재수출) | `budgetListHref`·`newBudgetHref`·`editBudgetHref` — 다이얼로그 전환 시 헬퍼째 삭제 |
| `@modal` 경로 되돌리기 | `FinanceHeader.tsx:42-43` | `/finance/budgets/{slug}…` → `/finance/{slug}` 정규식 |
| 주석 | `widgets/asset-settings/AssetSettingsPanel.tsx:18` | 예산이 탭 상단 링크로 이관됐다는 주석 |

`redirect(`·`proxy.ts`: 위 URL을 가리키는 `redirect()` 호출은 없다. `proxy.ts`에는 `budgets`·`inject`·`withdraw` 문자열이 없다(`PROTECTED_PREFIXES`가 `/accounts`·`/finance` 접두만 가짐 → URL이 삭제돼도 비인증 처리는 그대로, 인증 사용자는 404).

### 테스트·e2e·스크립트

| 위치 | 내용 |
|---|---|
| `e2e/strategy.spec.ts:36-37` | `getByRole('link', { name: '투자금 추가' }).click()` 후 `heading` 단언 — 다이얼로그 버튼으로 바뀌면 link 역할 단언이 깨짐 |
| `e2e/strategy.spec.ts:55-56` | 같은 구조의 투자금 인출 |
| `e2e/strategy.spec.ts:73-74` | VR 전략에서 두 링크가 없음을 `toHaveCount(0)`로 단언(역할 이름이 `link`) |
| `widgets/strategy-detail/StrategyDetailContent.test.tsx:116,141` | `href` 단언(`.../inject-capital`, `.../withdraw-capital`) |
| `features/finance/manage-budgets/BudgetManager.test.tsx:87,249,266,282,296` | `window.history.replaceState(.., '/finance/budgets/expense...')`로 URL 필터 구동 |
| `BudgetManager.test.tsx:310-312` | 추가·복제·수정 링크 `href` 단언 |
| `features/finance/manage-budgets/BudgetForm.test.tsx:122` | `pushMock` 호출 `'/finance/budgets/expense'` |
| `BudgetForm.test.tsx:42,51,81,97` | `duplicateFrom` prop(prop이라 유지 가능) |
| `entities/finance/lib/budgetRoutes.test.ts:19-23` | 헬퍼 전체 테스트 |
| `app/(main)/finance/(dashboard)/FinanceHeader.test.tsx:34,61,66` | "예산 관리" 링크 href, `@modal` 경로 되돌리기 케이스 |
| `widgets/finance-budget-progress/FinanceBudgetProgress.test.tsx:138` | `'식비 예산 추가'` 링크 href `?categoryId=food` |
| `scripts/a11y-check/run.mjs:40-46` | `ROUTE_MODALS` — 투자금·예산 항목은 없음. 전략 등록·VR 재설정·전략 수정·자산 수정·복제 5건이 "라우트 모달" 점검이므로 인터셉트 삭제(페이지 유지)로 점검 대상이 바뀜(`README.md:10`도) |
| `scripts/visual-diff/scenarios.mjs` | 투자금·예산 시나리오 없음(영향 없음). `reconfigure-vr`(`:69`)·`finance-new`(`:77`)는 페이지가 남아 영향 없음 |

### 문서

`docs/agents/app.md:38,40-43`(`@modal` loading·인터셉트 4문단, 지침서 태스크 7에서 삭제), `docs/agents/strategy.md:23,26,27`(전략 등록 "다이얼로그 없이 전용 라우트", 투자금 추가·인출 진입 설명), `features/finance/manage-budgets/CLAUDE.md:5`("Dialog가 아니라 인터셉팅 라우트다 — 목록 …"), `docs/agents/finance-widgets.md:7`·`finance.md:15`(탭 구조·예산 위치 서술, 예산 링크 서술이 있으면 갱신), `scripts/a11y-check/README.md:8-10`(라우트 모달 점검 설명). `docs/agents/finance-group-share.md:3`은 예산 공유 전환 API 설명이라 URL 의존 없음.

깨질 링크 집계: 코드 호출부 11곳(투자금 진입 2 + 예산 목록 1 + 예산 추가·복제·수정 3 + 진행률 카드 1 + 폼 복귀 `router.push` 3[BudgetForm·Inject·Withdraw] + `@modal` 정규식 1). 삭제되는 `eyebrowHref` 3곳은 원본 page와 함께 사라지므로 제외. 테스트·e2e 단언 23줄/7파일(e2e 3, StrategyDetailContent 2, BudgetManager 8, BudgetForm 1, budgetRoutes 5, FinanceHeader 3, FinanceBudgetProgress 1).

---

## 3. 다이얼로그로 가는 폼에 URL로 초기값을 넘기는 흐름

지침서 위험 항목("깊은 링크가 필요한 폼이면 그것은 폼 페이지다", "`?dialog=` 파라미터 금지") 대조 결과, **다이얼로그 전환 대상(5·6·13) 중 URL 초기값 의존은 예산(13)뿐**이다.

| 폼 | URL 초기값 | 근거 | 대체 방법(권고) |
|---|---|---|---|
| 13 예산 등록 | `?categoryId=`(카테고리 프리필) | `FinanceBudgetProgress.tsx:175`(링크 생성), `budgetRoutes.ts:23-28`, `NewBudgetFormBody.tsx:19,41`(`inType(categoryId) ? categoryId : undefined` 검증 후 `defaultCategoryId`) | 링크를 버튼으로 바꾸고 `BudgetForm`의 기존 `defaultCategoryId` prop(`BudgetForm.tsx:46`)에 직접 전달 |
| 13 예산 복제 | `?duplicateFrom={budgetId}`(원본 예산 조회 후 값 복사) | `BudgetManager.tsx:220`, `NewBudgetFormBody.tsx:19,28,31`(서버에서 `budgetListQueryOptions` fetch → `budgets.find`), `BudgetForm.tsx:33,52` | 예산 목록이 이미 클라이언트 캐시에 있으므로 `BudgetForm`의 기존 `duplicateFrom` prop(값 객체, `BudgetForm.tsx:33`)에 행 데이터를 직접 전달(거래내역 `FinanceRecordList.tsx:313-317`이 같은 방식) |
| 13 예산 수정 | path `[type]`·`[id]`(식별자) | `EditBudgetFormBody.tsx:16` | 행 객체를 prop으로 |
| 5·6 투자금 | 없음 | path `[id]`·`[sid]`만 | 필요한 것은 `strategy`·`currency` — URL이 아니라 데이터 전달 문제 |

페이지로 남는 폼의 URL 초기값(영향 없음, 참고): 자산 기록 복제 `?duplicateFrom=`(11번, `NewAssetFormBody.tsx:15,22`·`AssetRecordRows.tsx:57`). 이미 다이얼로그인 폼 중 URL 초기값 의존은 없다(거래내역 복제는 prop `TransactionFormDialog.tsx:35`).

예산 목록의 searchParams(`status`·`category`·`page`·`size`, `BudgetManager.tsx:76-85`)는 폼 초기값이 아니라 목록 필터 상태다(1절).

---

## 4. 지침서 기준과 다르게 판정해야 할 것 같은 폼(애매한 것)

A. 투자금 추가·인출(5·6) — 지침서 확정이지만 "제출 후 AlertDialog 확인"이 붙어 있다(`InjectCapitalForm.tsx:100`, `WithdrawCapitalForm.tsx:103`, `e2e/strategy.spec.ts:46,63`이 이 확인 단계를 단언). 다이얼로그 안에 AlertDialog를 중첩하면 포커스 트랩·ESC 처리가 겹친다. 선택지: (1) 같은 다이얼로그의 두 번째 화면으로 바꾼다(지침서의 "하위 뷰 없음" 기준과 충돌), (2) 확인 단계를 없앤다(입력 1개 폼에 확인이 하나 더 있는 불일치는 `findings/g` 2절 4번이 이미 지적), (3) 중첩 유지. 추천: (2). 입력이 1개라 기준에 가장 단순하게 맞는다. 단 인출은 파괴적 성격이라 사용자 승인이 필요하다.

B. 자산 기록 등록·수정(11) — 지침서는 페이지 확정. 필드 약 7개·하위 뷰 없음이라 "한 화면에 들어오고 하위 뷰가 없는 폼" 기준만 보면 다이얼로그 후보다(거래내역 14와 구성이 거의 같음, `findings/g` 2절 사례 1). 지침서가 페이지로 둔 근거는 `?duplicateFrom=` 깊은 링크로 보이는데(`AssetRecordRows.tsx:57`), 이 근거를 지침서에 명시하지 않으면 기준이 "필드 수"인지 "깊은 링크"인지 모호하다. 복제를 URL이 아닌 prop(거래내역 방식)으로 바꾸고 다이얼로그로 통일할지 결정이 필요하다. 지침서대로면 페이지 유지.

C. 재무 계좌(17) — 필드 7개로 다이얼로그 중 가장 크다(`AccountFormDialog.tsx:89-166`). 다이얼로그 유지가 맞으나 모바일 뷰포트에서 스크롤이 생긴다. 실기기 확인 목록(지침서 선행 테스트 3)에 포함할 것.

D. P 매매표 기준 등록(19) — 6개 필드 + 동적 주문 행(행당 4필드)이라 `max-h-[85vh] overflow-y-auto`로 한 화면에 넣은 다이얼로그다(`CreatePrivacyBaseDialog.tsx:83`). 하위 뷰는 없어 기준상 다이얼로그지만 "한 화면에 들어옴"은 성립하지 않는다. 관리자 전용·저빈도라 현행 유지가 합리적이며, 기준 문구를 "스크롤 없이"가 아니라 "단일 단계"로 읽는다고 지침서에 적는 편이 낫다.

E. 닉네임 — 지침서는 다이얼로그 목록에 포함했으나 실제는 인라인 편집이다(`NicknameEditor.tsx:16,60-85`, 아이콘 → 입력 → 저장·취소). 인라인 6개(9·23·24·25·26·28)는 전부 "현행 유지-인라인"이다. 지침서 표기를 "닉네임 = 현행 유지 인라인"으로 고치길 권한다.

F. 계좌 삭제 타이핑 확인(10) — 입력 있는 확인 Dialog라 분류상 "다이얼로그"에 들어가지만 폼이 아니라 확인이며 8번(페이지) 안에 있다. 현행 유지.

G. 계좌 등록 스테퍼(7) — `<form>`이 없고 단계별 state다. 지침서 "단계가 있으면 페이지"에 해당해 판정은 문제 없으나 `useAppForm` 도입 시 단계 간 값 유지 방식은 별도 설계가 필요하다(이 전수표 범위 밖).

H. 초대 코드 발급(27) — 입력 1개(만료 시간 Select)에 결과 화면(발급된 코드)이 같은 Dialog 안에서 전환되는 2상태 구조다(`InviteDialog.tsx:38-40,72-111`). "하위 뷰 없음"에 엄밀히는 어긋나나 현행 유지.

I. 일괄 등록(12) — 지침서는 페이지. `<form>` 없이 표 선택 + 제출 버튼 2개(`BulkRegisterForm.tsx:314,353`)라 폼 구현 통일(지침서 태스크 4~5) 범위에 넣을지 불명확하다.

J. 지침서 불일치: 태스크 3 완료 판정의 `grep -rn "dismiss"` 0건에는 `shared/lib/dismiss.ts`(`DismissMode` 타입)와 이를 import하는 파일 15곳이 걸린다. 인터셉트가 남지 않으면 `dismiss` prop이 필요 없어지므로 이 파일도 삭제 대상이다(페이지로 남는 폼 1·2·4·11도 `dismiss` 분기를 걷는다).

---

## 5. 사용자 확정 (2026-11-12, 묶음 B 착수 전)

- 예산 목록 `/finance/budgets/[type]`은 일반 페이지로 남긴다. 인터셉트만 지우고 등록·수정·복제는 그 페이지 안에서 다이얼로그로 연다. 설정 화면 이동은 03에서 다시 판단한다.
- `FormDialog`는 처음부터 이력 한 칸을 쌓는다. 기존 `useSubviewHistory`를 재사용하므로 `subviewHistory`는 지우지 않는다. 지침서 태스크 3 완료 판정에서 `subviewHistory`는 뺀다.
- 투자금 추가·인출의 AlertDialog 확인 단계는 다이얼로그 안에 중첩한 채로 유지한다.
- `docs/agents/app.md`의 인터셉트 문단과 `manage-budgets/CLAUDE.md`는 04-3 커밋에서 같이 정리한다.
- 자산 기록(4절 B)은 지침서대로 페이지로 둔다.

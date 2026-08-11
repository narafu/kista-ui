# features/ — 사용자 시나리오

사용자의 단일 액션을 구현하는 레이어. `entities/`와 `shared/`만 import 가능.

## 의존성 규칙

```text
features/{domain}/{slice}  ->  entities/  ->  shared/
```

feature 슬라이스끼리 cross-import 금지. 두 feature를 조합해야 하면 `widgets/`에서 처리.

## 슬라이스 목록

| 도메인 | 슬라이스 | 주요 컴포넌트 |
|---|---|---|
| `auth` | `logout` | `LogoutButton` |
| `auth` | `reapply` | `ReapplyButton`, `RejectedReapplyButton` |
| `account` | `create-account` | `CreateAccountStepper` + steps |
| `account` | `edit-account` | `EditAccountForm` |
| `strategy` | `create-strategy` | `StrategyFormPage`, `StrategyForm`, `NewStrategyButton` |
| `settings` | `telegram-connect` | `TelegramSection`, `PendingTelegramConnect` |
| `settings` | `notification-channel` | `NotificationSettings` |
| `settings` | `notification-prefs` | `TradingAlertToggle` |
| `settings` | `balance-check-setting` | `BalanceCheckSetting` |
| `settings` | `edit-nickname` | `NicknameEditor` |
| `settings` | `delete-user-account` | `DeleteAccountButton` |
| `settings` | `theme-select` | `ThemeCards` |
| `admin` | `approve-reject` | `ApproveRejectButtons` |
| `admin` | `change-role` | `ChangeRoleButton` |
| `admin` | `withdraw-user` | `WithdrawUserButton` |
| `admin` | `logs` | `LogsFilterChips` |
| `admin` | `error-logs` | `ErrorLogsSectionClient`, `ErrorLogItem` |
| `admin` | `settings` | `AdminSettingsForm` |
| `asset` | `save-asset` | `AssetForm`, `AssetFormPage`, `NewAssetButton` |
| `asset` | `delete-asset` | `DeleteAssetDialog` |
| `asset` | `toggle-monthly-check` | `ToggleMonthlyCheckButton` |

## 슬라이스 내부 구조

```text
features/{domain}/{slice}/
  {SliceName}.tsx
  index.ts
```

필요 시 `model/use{SliceName}.ts`를 추가한다.

## 컴포넌트 설계 원칙

- 서버 상태는 `entities/` React Query 훅으로만 조회/변경한다
- `useXxxMutation` 훅이 있으면 반드시 사용한다
- UI 상태만 `useState`로 관리한다
- 이벤트 핸들러가 있는 feature 컴포넌트는 항상 `'use client'`

## 주요 슬라이스 quirk

- **`create-account`**: KIS/TOSS는 4-step 플로우 `BrokerStep` → `ApiStep` → `AccountInfoStep` → `ConfirmStep`. MOCK(모의계좌) 선택 시 `CreateAccountStepper`가 3-step으로 축약(`BrokerStep` → `AccountInfoStep`(별칭 전용) → `ConfirmStep`) — API 키·계좌번호 스텝을 건너뜀
- **`create-account/steps/BrokerStep`**: KIS / TOSS / MOCK 선택. `BrokerCode`는 `@shared/lib/api-schema`. `BROKER_UI`에 없는 코드는 카드가 렌더되지 않으므로(`return null`) 신규 브로커 추가 시 반드시 항목 추가 필요
- **`create-account/steps/ApiStep`**: KIS는 `useTestKisConnectionMutation`, TOSS는 UI만 구현. MOCK은 이 스텝 자체를 거치지 않음
- **`create-account/steps/AccountInfoStep`**: KIS와 TOSS의 계좌번호 형식이 다름. MOCK은 계좌번호 입력 없이 별칭만 입력(early-return 분기)
- **`create-account/steps/ConfirmStep`**: `useCreateAccountMutation` 사용. 생성 성공 후 entity 캐시 동기화가 끝난 뒤 `mutate(..., { onSuccess })`에서 `/accounts/{id}`로 이동한다. MOCK은 요청 바디에서 accountNo/appKey/secretKey를 생략(`{ nickname, broker }`)하고 요약 화면에서도 해당 행을 숨김
- **`edit-account`**: `EditAccountForm`이 수정/삭제 성공 toast와 라우팅을 담당한다. 삭제 성공 후 전략·통계·주문·거래 캐시를 무효화한 다음 `/accounts`로 이동한다
- **`auth/reapply`**: `/api/auth/reapply-done` Route Handler 경유
- **`strategy/create-strategy`**: 다이얼로그/드로어 없이 전용 라우트로 등록·수정한다 — `app/(main)/accounts/[id]/strategies/new`(등록), `.../strategies/[sid]/edit`(수정). `StrategyFormPage`가 `initial` prop 유무로 create/edit을 분기한다. 폼 내부는 반응형 분기 없이 모바일·PC 동일한 1열 레이아웃을 사용한다(`VrSettingsSection` 등). PC에서는 `app/(main)/@modal` 인터셉팅 라우트로 같은 페이지를 모달처럼 띄운다 — `docs/agents/app.md`의 인터셉팅 라우트 quirk 참고. `StrategyFormPage`의 `dismiss` prop(`'push'`|`'back'`)으로 일반 페이지(`router.push`)/모달(`router.back`) 종료 방식을 구분한다
- **`strategy/create-strategy`**: 수정 모드는 기본적으로 시작금액(`initialUsdDeposit`) 읽기 전용이며, `currentHoldings === 0`일 때만 등록과 같은 시드 입력 UI를 사용하고 저장 payload에 포함할 수 있음
- **`strategy/create-strategy` 중간부터 시작**: 이미 종목을 보유 중인 사용자가 기존 평단가·수량을 입력해 그 지점부터 전략을 시작하는 기능. 세 전략(INFINITE·PRIVACY·VR) 공통이며 등록 전용(수정 불가). `InitialHoldingsSection`이 공통 입력(평단가·수량)을 렌더하고, `useStrategyForm`의 `vrFields.avgPrice`/`quantity`를 그대로 `initialHoldings`(정수)·`initialAvgPrice`(소수)로 전송한다 — 곱하지 않는다(서버가 등록 시점 전일종가×보유수량으로 V값을 직접 계산). 수량>0이면 평단가>0 필수, 평단가>0이면 수량>0 필수(양방향 — 서버는 quantity<=0이면 avgPrice를 payload에서 생략해 조용히 버리므로 UI가 선제 안내), 둘 다 음수·수량 소수 입력은 차단. 둘 다 미입력/0이면 두 필드 모두 생략(빈 포지션에서 시작)
- **`strategy/create-strategy` 시작예정일**: 등록 시 미래 날짜를 지정하면 그 이후 첫 거래일부터 매매가 시작되는 기능(exclusive 경계 — 지정일 자신도 skip될 수 있음). 세 전략 공통·등록 전용(수정·롤오버는 항상 오늘/기존 사이클 기준). `ScheduledStartSection`이 `<input type="date" min={todayKst()}>`를 렌더하고 안내 문구는 "선택한 날짜 이후 첫 거래일부터 시작됩니다"(절대 "그날부터"라고 쓰지 않는다). `useStrategyForm`의 `scheduledStartDate`가 설정돼 있으면 create payload에 그대로 전송하고, 비어 있으면 생략(서버가 오늘로 처리). 과거 날짜는 서버 400과 별개로 클라이언트에서도 `submitDisabledReason`으로 선제 차단(오늘 자신은 허용)
- **`strategy/create-strategy` VR 전략**: VR 등록은 기존 seed 입력을 초기 pool(`initialUsdDeposit`)로 사용하고, `VrSettingsSection`에서 `intervalWeeks`, `bandWidth`, `recurringAmount`를 입력한다(평단가·수량은 위 공통 섹션에서 입력). 적립식(`recurringAmount > 0`)은 초기 pool 0을 허용하고, 거치/인출식은 초기 자산(추정 V값 + 초기 pool) 0을 차단한다. 인출식은 `(avgPrice × quantity) + initialUsdDeposit >= abs(recurringAmount) * 100 * (4 / intervalWeeks)` 조건을 UI에서 먼저 검증한다(서버 V값은 시장가 기준이라 이 추정치와 다를 수 있음 — 최종 검증은 서버가 수행). 정수 전용 필드의 소수 입력은 보존한 뒤 검증에서 차단한다. VR은 백엔드가 `cycleSeedType=NONE`, `ticker=TQQQ`로 강제하므로 사이클 연속 UI를 숨긴다. 수정 모드는 평단가·수량을 저장값에서 역산할 수 없어 기존 V값을 읽기전용으로만 표시한다
- **`strategy/create-strategy` VR 램프 비활성화**: 고급 설정의 `gStepWeeks=0`은 gradient 램프 비활성화로 `gMax`·`gGraceWeeks`를 0으로 강제하고 입력을 잠근다. `pStepWeeks=0`도 같은 방식으로 poolLimitRate 램프를 비활성화해 `poolLimitFloor`·`pGraceWeeks`를 0으로 강제하고 잠근다. 단계주기를 다시 0이 아닌 값으로 바꾸면 종속 필드를 비워 재입력받는다
- **`strategy/create-strategy` 폼 검증·모바일 스크롤**: `submitDisabledReason`은 사전 submit guard뿐 아니라 resolver가 제출을 거부한 경우에도 표시한다. `UnitInput`의 disabled `<input>`은 `pointer-events-none`으로 터치 제스처를 상위 모바일 스크롤 컨테이너에 전달한다
- **`strategy/create-strategy/sections/DivisionCountSection`**: `usesDivisionCount`와 `typeMeta.divisionCounts` 기반 렌더
- **`strategy/create-strategy` MOCK 계좌**: `useStrategyForm`이 `broker === 'MOCK'`이면 `balanceCheckEnabled`를 강제로 `false`로 만든다 — 사용자가 설정에서 잔고검증을 끈 것과 완전히 동일한 코드 경로(`UsageRatioSection`의 예수금 직접 입력 UI, margin 쿼리 skip)를 강제로 태우는 것뿐이다. 배지 라벨만 `offBadgeLabel`로 "모의계좌"로 오버라이드
- **`settings/telegram-connect`**: pending/settings 페이지에서 컴포넌트 공유
- **`asset/save-asset`**: `AssetForm`이 `mode: 'create' | 'edit' | 'duplicate'` 하나로 3형태를 처리한다(네이티브 `useState` + `<form onSubmit>`, RHF+zod 아님 — strategy 도메인 전용 패턴). 카테고리 `Select`는 `onValueChange`에서 `value !== category`를 직접 확인한다 — Base UI Select는 이미 선택된 값을 다시 클릭해도 `onValueChange`가 발화하므로, 가드가 없으면 재선택만으로 `subcategory`/`assetClass`가 조용히 리셋된다. 카테고리를 바꾸면 `subcategory`는 항상 비우고 `assetClass`는 INVESTMENT면 `''`·그 외엔 `'원화'`로 리셋하지만, `strategy`(운용전략 자유 메모)는 건드리지 않는다 — 비INVESTMENT 카테고리에서는 필드 자체를 숨기고 제출 payload에서도 생략하므로, INVESTMENT로 되돌아왔을 때 이전에 입력했던 값이 그대로 남아있는 편이 UX상 자연스럽다는 판단. `subcategory`/`institution`/`assetClass`/`strategy` 4개 필드 모두 자유 입력 `Input` + 추천 `Select`를 한 필드로 묶은 로컬 `ComboField` 컴포넌트를 공유하고, 추천 목록은 `@entities/runtime-config`의 `assetFormOptions`(관리자 수정 가능)에서 가져온다 — `@entities/asset`는 다른 entity를 import할 수 없어(entities 간 cross-import 금지) 두 entity를 조합하는 지점이 이 feature다. `strategy`는 VR/INFINITE/PRIVACY 같은 실제 자동매매 전략 코드와 이름이 겹치지만 자유 입력에 영문 제한을 두지 않는다 — 한때 영문을 자동 제거하는 필터가 있었으나(오탈자로 코드와 미묘하게 다른 값이 저장되는 걸 막으려는 의도) 다른 콤보 필드(`subcategory`/`institution`/`assetClass`)와 다르게 취급할 이유가 없다는 판단으로 제거했다(2026-08)
- **`admin/settings`**: 전체 런타임 설정 초안을 편집한다. 전략 필드와 ETF 벤치마크의 빈 허용값, 기본값 포함 여부, 고정 필드 단일값과 VR 고정 `HOLD` 정책을 저장 전에 검증하며 변경 취소는 마지막 서버 상태로 복원한다. 저장 후 runtime config와, 승인 비활성화 시 admin users/stats refetch를 entity mutation의 hook-level success effect로 주입한다. 모든 effect를 await하므로 완료 전까지 pending을 유지하고, refetch 오류는 mutation error lifecycle로 전달한다. per-call `mutate(..., { onSuccess })`에는 async 필수 효과를 두지 않는다. "자산 등록 폼 추천 목록"(`assetFormOptions`) 섹션은 `ValueListEditor`(허용값+기본값 라디오)가 아니라 `SuggestionListEditor`(추가/삭제 chip만, 기본값 없음)를 쓴다 — 대응 필드가 여전히 자유 입력이라 값을 강제할 defaultValue 개념이 없기 때문. `AdminSettingsRequest.assetFormOptions`는 (`benchmarks`와 달리) 생략 시 기존 값 유지가 아니라 매 저장마다 필수 — kista-api·kista-ui는 별도 배포 파이프라인이라 "같은 커밋"이 곧 안전을 보장하진 않지만, `AdminSettingsForm`의 `draft`가 GET 응답 전체를 `structuredClone`으로 그대로 왕복시키는 구조(자신이 모르는 필드도 그대로 들고 있다가 PUT에 실어 보낸다)라 실제로는 문제가 없다. 이 보장은 폼이 payload를 손수 조립하는 방식으로 바뀌는 순간 깨진다 — 그렇게 바뀌면 이 필드를 다시 `benchmarks`처럼 생략 허용으로 되돌리거나 폼이 명시적으로 채워야 한다
- **`strategy/create-strategy/sections`**: CSS 토큰 기반 인라인 style 다수 사용
- **선택형 카드**: 전략 등록·수정 섹션, 알림 수단, 테마 선택은 `@shared/ui/selection-card`의 `SelectionCard`를 사용한다. 전략 유형·시드 모드·알림 수단·테마처럼 큰 카드는 `showIndicator`, 수치·종목 등 작은 옵션은 외곽선만 사용한다

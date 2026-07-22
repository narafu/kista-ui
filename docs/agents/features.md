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
| `strategy` | `create-strategy` | `StrategyFormDialog`, `StrategyForm` |
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

- **`create-account`**: 4-step 플로우는 `BrokerStep` → `ApiStep` → `AccountInfoStep` → `ConfirmStep`
- **`create-account/steps/BrokerStep`**: KIS / TOSS 선택. `BrokerCode`는 `@shared/lib/api-schema`
- **`create-account/steps/ApiStep`**: KIS는 `useTestKisConnectionMutation`, TOSS는 UI만 구현
- **`create-account/steps/AccountInfoStep`**: KIS와 TOSS의 계좌번호 형식이 다름
- **`create-account/steps/ConfirmStep`**: `useCreateAccountMutation` 사용
- **`auth/reapply`**: `/api/auth/reapply-done` Route Handler 경유
- **`strategy/create-strategy/StrategyFormDialog`**: `initial` prop 유무로 create/edit 분기
- **`strategy/create-strategy`**: 수정 모드는 기본적으로 시작금액(`initialUsdDeposit`) 읽기 전용이며, `currentHoldings === 0`일 때만 등록과 같은 시드 입력 UI를 사용하고 저장 payload에 포함할 수 있음
- **`strategy/create-strategy` VR 전략**: VR 등록은 기존 seed 입력을 초기 pool(`initialUsdDeposit`)로 사용하고, `VrSettingsSection`에서 `initialValue`, `intervalWeeks`, `bandWidth`, `recurringAmount`를 입력한다. 적립식(`recurringAmount > 0`)은 초기 V/초기 pool 0을 허용하고, 거치/인출식은 초기 자산 0을 차단한다. 인출식은 `initialValue + initialUsdDeposit >= abs(recurringAmount) * 100 * (4 / intervalWeeks)` 조건을 UI에서 먼저 검증한다. 정수 전용 필드의 소수 입력은 보존한 뒤 검증에서 차단한다. VR은 백엔드가 `cycleSeedType=NONE`, `ticker=TQQQ`로 강제하므로 사이클 연속 UI를 숨긴다
- **`strategy/create-strategy/sections/DivisionCountSection`**: `usesDivisionCount`와 `typeMeta.divisionCounts` 기반 렌더
- **`settings/telegram-connect`**: pending/settings 페이지에서 컴포넌트 공유
- **`admin/settings`**: 전체 런타임 설정 초안을 편집한다. 전략 필드와 ETF 벤치마크의 빈 허용값, 기본값 포함 여부, 고정 필드 단일값과 VR 고정 `HOLD` 정책을 저장 전에 검증하며 변경 취소는 마지막 서버 상태로 복원한다
- **`strategy/create-strategy/sections`**: CSS 토큰 기반 인라인 style 다수 사용
- **선택형 카드**: 전략 등록·수정 섹션, 알림 수단, 테마 선택은 `@shared/ui/selection-card`의 `SelectionCard`를 사용한다. 전략 유형·시드 모드·알림 수단·테마처럼 큰 카드는 `showIndicator`, 수치·종목 등 작은 옵션은 외곽선만 사용한다

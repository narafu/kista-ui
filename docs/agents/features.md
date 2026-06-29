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
| `settings` | `delete-user-account` | `DeleteAccountButton` |
| `settings` | `theme-select` | `ThemeCards` |
| `admin` | `approve-reject` | `ApproveRejectButtons` |
| `admin` | `change-role` | `ChangeRoleButton` |

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
- **`strategy/create-strategy/sections/DivisionCountSection`**: `usesDivisionCount`와 `typeMeta.divisionCounts` 기반 렌더
- **`settings/telegram-connect`**: pending/settings 페이지에서 컴포넌트 공유
- **`strategy/create-strategy/sections`**: CSS 토큰 기반 인라인 style 다수 사용

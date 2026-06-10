# features/ — 사용자 시나리오

사용자의 단일 액션(등록, 수정, 삭제, 연결 등)을 구현하는 레이어. `entities/`와 `shared/`만 import 가능.

## 의존성 규칙

```
features/{domain}/{slice}  →  entities/  →  shared/
```

feature 슬라이스끼리 cross-import 금지. 두 feature를 조합해야 하면 `widgets/`에서 처리.

## 슬라이스 목록

| 도메인 | 슬라이스 | 주요 컴포넌트 |
|---|---|---|
| `auth` | `logout` | `LogoutButton` |
| `auth` | `reapply` | `ReapplyButton`, `RejectedReapplyButton` (1시간/24시간 쿨다운 localStorage) |
| `account` | `create-account` | `CreateAccountStepper` + steps |
| `account` | `edit-account` | `EditAccountForm` |
| `account` | `delete-account` | `DeleteAccountDialog`, `AccountEditDeleteButton` |
| `strategy` | `create-strategy` | `StrategyFormDialog`, `StrategyForm`, sections (create·edit 공용) |
| `settings` | `telegram-connect` | `TelegramSection`, `PendingTelegramConnect` |
| `settings` | `notification-channel` | `NotificationSettings` |
| `settings` | `delete-user-account` | `DeleteAccountButton` |
| `settings` | `theme-select` | `ThemeCards` |
| `admin` | `approve-reject` | `ApproveRejectButtons` |
| `admin` | `change-role` | `ChangeRoleButton` |


## 슬라이스 내부 구조

```
features/{domain}/{slice}/
  {SliceName}.tsx   # 진입 컴포넌트 ('use client')
  index.ts          # public re-export
```

필요 시 `model/use{SliceName}.ts` (UI 상태 훅) 추가.

## 컴포넌트 설계 원칙

- **서버 상태**: `entities/` React Query 훅으로만 조회/변경. 직접 `clientFetch` 호출 금지.
- **뮤테이션 훅 우회 금지**: `useXxxMutation` 훅이 있으면 반드시 사용. `createStrategy()`/`updateTelegram()` 등 API 함수 직접 호출 시 `invalidateQueries`가 실행되지 않아 UI 미갱신. `const [loading, setLoading]` 수동 상태도 이 징조.
- **UI 상태만 `useState`**: 폼 값, 모달 open 여부 등 클라이언트 전용 상태만 관리.
- **`'use client'`**: feature 컴포넌트는 이벤트 핸들러 포함이므로 항상 필요.

## 주요 슬라이스 quirk

- **`create-account/steps/ApiStep`**: `useTestKisConnectionMutation` 사용 — KIS 토큰 1분 제한 주의 (`app/CLAUDE.md` 참고)
- **`create-account/steps/ConfirmStep`**: `useCreateAccountMutation` 사용
- **`auth/reapply`**: `ReapplyButton`(pending, 1시간) / `RejectedReapplyButton`(rejected, 24시간) — localStorage 쿨다운 키: pending → `reapply_last_requested_at`, rejected → `reapply_rejected_last_at`
- **`strategy/create-strategy/StrategyFormDialog`**: `initial?: Strategy` prop 유무로 create/edit 분기. create → `useCreateStrategyMutation`, edit → `useUpdateStrategyMutation`
- **`settings/telegram-connect`**: pending 페이지와 settings 페이지 양쪽에서 동일 컴포넌트 공유 (`TelegramSection` / `PendingTelegramConnect`)
- **`strategy/create-strategy/sections`**: CSS 토큰 기반 인라인 style 다수 — `globals.css` 커스텀 토큰(`--rose-500`, `--warn` 등) 사용

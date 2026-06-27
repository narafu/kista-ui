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
| `account` | `create-account` | `CreateAccountStepper` + steps (4단계: Broker → API → AccountInfo → Confirm) |
| `account` | `edit-account` | `EditAccountForm` (계좌 삭제 인라인 포함) |
| `strategy` | `create-strategy` | `StrategyFormDialog`, `StrategyForm`, sections: `StrategyTypeSection`, `StrategyTickerSection`, `DivisionCountSection`(INFINITE 전용), `CycleSeedSection`, `UsageRatioSection` |
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

- **`create-account` 4-step 플로우**: `BrokerStep` → `ApiStep` → `AccountInfoStep` → `ConfirmStep`. `StepData`가 각 단계 payload를 축적하며 `CreateAccountStepper`가 상태 관리
- **`create-account/steps/BrokerStep`**: KIS(`'KIS'`) / TOSS(`'TOSS'`) 중 선택. `BrokerCode`는 `@shared/lib/api-schema`에서 파생
- **`create-account/steps/ApiStep`**: broker 분기 — KIS: `useTestKisConnectionMutation` (토큰 1분 제한 주의, `app/CLAUDE.md` 참고) / TOSS: clientId·clientSecret 입력 (UI만 구현, 실매매 미지원)
- **`create-account/steps/AccountInfoStep`**: broker 분기 — KIS: `74420614-01`(8자리 + `-01` 고정), TOSS: `131-01-001931`(XXX-XX-XXXXXX, 11자리 자유형) 형식 다름
- **`create-account/steps/ConfirmStep`**: `useCreateAccountMutation` 사용. `AccountRequest`에 `broker` 필드 포함
- **`auth/reapply`**: `ReapplyButton`(pending, 1시간) / `RejectedReapplyButton`(rejected, 24시간) — localStorage 쿨다운 키: pending → `reapply_last_requested_at`, rejected → `reapply_rejected_last_at`. `/api/auth/reapply-done` Route Handler 경유 (직접 kista-api 호출 금지)
- **`strategy/create-strategy/StrategyFormDialog`**: `initial?: Strategy` prop 유무로 create/edit 분기. create → `useCreateStrategyMutation`, edit → `useUpdateStrategyMutation`
- **`strategy/create-strategy/sections/DivisionCountSection`**: `visible={usesDivisionCount}` + `options={typeMeta.divisionCounts}` prop 기반 렌더 — `visible=false` 또는 `options=[]`이면 `return null`. 옵션 목록은 백엔드 메타 `divisionCounts`에서 동적 결정 (하드코딩 금지). edit 시 기존값 유지
- **`settings/telegram-connect`**: pending 페이지와 settings 페이지 양쪽에서 동일 컴포넌트 공유 (`TelegramSection` / `PendingTelegramConnect`). `updateTelegram`/`deleteTelegram` → `/api/settings/telegram` Route Handler 경유
- **`strategy/create-strategy/sections`**: CSS 토큰 기반 인라인 style 다수 — `globals.css` 커스텀 토큰(`--rose-500`, `--warn` 등) 사용

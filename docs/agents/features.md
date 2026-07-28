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
- **`create-account/steps/ConfirmStep`**: `useCreateAccountMutation` 사용. MOCK은 요청 바디에서 accountNo/appKey/secretKey를 생략(`{ nickname, broker }`)하고 요약 화면에서도 해당 행을 숨김
- **`auth/reapply`**: `/api/auth/reapply-done` Route Handler 경유
- **`strategy/create-strategy`**: 다이얼로그/드로어 없이 전용 라우트로 등록·수정한다 — `app/(main)/accounts/[id]/strategies/new`(등록), `.../strategies/[sid]/edit`(수정). `StrategyFormPage`가 `initial` prop 유무로 create/edit을 분기한다. 폼 내부는 반응형 분기 없이 모바일·PC 동일한 1열 레이아웃을 사용한다(`VrSettingsSection` 등). PC에서는 `app/(main)/@modal` 인터셉팅 라우트로 같은 페이지를 모달처럼 띄운다 — `docs/agents/app.md`의 인터셉팅 라우트 quirk 참고. `StrategyFormPage`의 `dismiss` prop(`'push'`|`'back'`)으로 일반 페이지(`router.push`)/모달(`router.back`) 종료 방식을 구분한다
- **`strategy/create-strategy`**: 수정 모드는 기본적으로 시작금액(`initialUsdDeposit`) 읽기 전용이며, `currentHoldings === 0`일 때만 등록과 같은 시드 입력 UI를 사용하고 저장 payload에 포함할 수 있음
- **`strategy/create-strategy` 중간부터 시작**: 이미 종목을 보유 중인 사용자가 기존 평단가·수량을 입력해 그 지점부터 전략을 시작하는 기능. 세 전략(INFINITE·PRIVACY·VR) 공통이며 등록 전용(수정 불가). `InitialHoldingsSection`이 공통 입력(평단가·수량)을 렌더하고, `useStrategyForm`의 `vrFields.avgPrice`/`quantity`를 그대로 `initialHoldings`(정수)·`initialAvgPrice`(소수)로 전송한다 — 곱하지 않는다(서버가 등록 시점 전일종가×보유수량으로 V값을 직접 계산). 수량>0이면 평단가>0 필수, 평단가>0이면 수량>0 필수(양방향 — 서버는 quantity<=0이면 avgPrice를 payload에서 생략해 조용히 버리므로 UI가 선제 안내), 둘 다 음수·수량 소수 입력은 차단. 둘 다 미입력/0이면 두 필드 모두 생략(빈 포지션에서 시작)
- **`strategy/create-strategy` 시작예정일**: 등록 시 미래 날짜를 지정하면 그 이후 첫 거래일부터 매매가 시작되는 기능(exclusive 경계 — 지정일 자신도 skip될 수 있음). 세 전략 공통·등록 전용(수정·롤오버는 항상 오늘/기존 사이클 기준). `ScheduledStartSection`이 `<input type="date" min={todayKst()}>`를 렌더하고 안내 문구는 "선택한 날짜 이후 첫 거래일부터 시작됩니다"(절대 "그날부터"라고 쓰지 않는다). `useStrategyForm`의 `scheduledStartDate`가 설정돼 있으면 create payload에 그대로 전송하고, 비어 있으면 생략(서버가 오늘로 처리). 과거 날짜는 서버 400과 별개로 클라이언트에서도 `submitDisabledReason`으로 선제 차단(오늘 자신은 허용)
- **`strategy/create-strategy` VR 전략**: VR 등록은 기존 seed 입력을 초기 pool(`initialUsdDeposit`)로 사용하고, `VrSettingsSection`에서 `intervalWeeks`, `bandWidth`, `recurringAmount`를 입력한다(평단가·수량은 위 공통 섹션에서 입력). 적립식(`recurringAmount > 0`)은 초기 pool 0을 허용하고, 거치/인출식은 초기 자산(추정 V값 + 초기 pool) 0을 차단한다. 인출식은 `(avgPrice × quantity) + initialUsdDeposit >= abs(recurringAmount) * 100 * (4 / intervalWeeks)` 조건을 UI에서 먼저 검증한다(서버 V값은 시장가 기준이라 이 추정치와 다를 수 있음 — 최종 검증은 서버가 수행). 정수 전용 필드의 소수 입력은 보존한 뒤 검증에서 차단한다. VR은 백엔드가 `cycleSeedType=NONE`, `ticker=TQQQ`로 강제하므로 사이클 연속 UI를 숨긴다. 수정 모드는 평단가·수량을 저장값에서 역산할 수 없어 기존 V값을 읽기전용으로만 표시한다
- **`strategy/create-strategy` VR 램프 비활성화**: 고급 설정의 `gStepWeeks=0`은 gradient 램프 비활성화로 `gMax`·`gGraceWeeks`를 0으로 강제하고 입력을 잠근다. `pStepWeeks=0`도 같은 방식으로 poolLimitRate 램프를 비활성화해 `poolLimitFloor`·`pGraceWeeks`를 0으로 강제하고 잠근다. 단계주기를 다시 0이 아닌 값으로 바꾸면 종속 필드를 비워 재입력받는다
- **`strategy/create-strategy/sections/DivisionCountSection`**: `usesDivisionCount`와 `typeMeta.divisionCounts` 기반 렌더
- **`strategy/create-strategy` MOCK 계좌**: `useStrategyForm`이 `broker === 'MOCK'`이면 `balanceCheckEnabled`를 강제로 `false`로 만든다 — 사용자가 설정에서 잔고검증을 끈 것과 완전히 동일한 코드 경로(`UsageRatioSection`의 예수금 직접 입력 UI, margin 쿼리 skip)를 강제로 태우는 것뿐이다. 배지 라벨만 `offBadgeLabel`로 "모의계좌"로 오버라이드
- **`settings/telegram-connect`**: pending/settings 페이지에서 컴포넌트 공유
- **`admin/settings`**: 전체 런타임 설정 초안을 편집한다. 전략 필드와 ETF 벤치마크의 빈 허용값, 기본값 포함 여부, 고정 필드 단일값과 VR 고정 `HOLD` 정책을 저장 전에 검증하며 변경 취소는 마지막 서버 상태로 복원한다
- **`strategy/create-strategy/sections`**: CSS 토큰 기반 인라인 style 다수 사용
- **선택형 카드**: 전략 등록·수정 섹션, 알림 수단, 테마 선택은 `@shared/ui/selection-card`의 `SelectionCard`를 사용한다. 전략 유형·시드 모드·알림 수단·테마처럼 큰 카드는 `showIndicator`, 수치·종목 등 작은 옵션은 외곽선만 사용한다

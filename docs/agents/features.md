# features/ — 사용자 시나리오

사용자의 단일 액션을 구현하는 레이어. `entities/`와 `shared/`만 import 가능.

- **가계부(finance) 작업 시 docs/agents/finance.md 필수 Read** — 관련: `features/finance/*`, `features/asset/save-asset`, `AssetForm`, `TransactionFormDialog`, `CategoryManager`, `AccountManager`, `manage-group`, `manage-budgets`, `useShareFinanceTransactionMutation`
- **전략·DCA·크립토·브로커 분기 작업 시 docs/agents/strategy.md 필수 Read** — 관련: `strategy/create-strategy`, `StrategyFormPage`, `DcaStrategyForm`, `VrSettingsSection`, `InitialHoldingsSection`, `BrokerStep`, `BROKER_UI`, `ApiStep`, `isKeyOnlyBroker`, `backtest/run-backtest`

## 의존성 규칙

```text
features/{domain}/{slice}  ->  entities/  ->  shared/
```

feature 슬라이스끼리 cross-import 금지. 두 feature를 조합해야 하면 `widgets/`에서 처리. 슬라이스 목록은 `find features -maxdepth 2 -type d`로 확인한다.

## 슬라이스 내부 구조

```text
features/{domain}/{slice}/
  {SliceName}.tsx
  index.ts
```

필요 시 `model/use{SliceName}.ts`를 추가한다.

## 주요 슬라이스 quirk

- **`create-account`**: KIS/TOSS/UPBIT/MERITZ는 4-step 플로우 `BrokerStep` → `ApiStep` → `AccountInfoStep` → `ConfirmStep`. MOCK(모의계좌) 선택 시 `CreateAccountStepper`가 3-step으로 축약(`BrokerStep` → `AccountInfoStep`(별칭 전용) → `ConfirmStep`) — API 키·계좌번호 스텝을 건너뜀
- **`create-account/steps/ConfirmStep`**: `useCreateAccountMutation` 사용. 생성 성공 후 entity 캐시 동기화가 끝난 뒤 `mutate(..., { onSuccess })`에서 `/accounts/{id}`로 이동한다. MOCK은 요청 바디에서 accountNo/appKey/secretKey를 생략(`{ nickname, broker }`)하고 요약 화면에서도 해당 행을 숨김
- **`edit-account`**: `EditAccountForm`이 수정/삭제 성공 toast와 라우팅을 담당한다. 삭제 성공 후 전략·통계·주문·거래 캐시를 무효화한 다음 `/accounts`로 이동한다. MOCK 외 broker는 API 키 재등록 섹션(`PUT /api/accounts/{id}/credentials`, `useUpdateCredentialsMutation`)을 갖고, 계좌번호가 없는 UPBIT·MERITZ는 계좌번호 행을 숨긴다
- **`auth/reapply`**: `/api/auth/reapply-done` Route Handler 경유
- **`settings/telegram-connect`**: pending/settings 페이지에서 컴포넌트 공유
- **`admin/settings`**: 전체 런타임 설정 초안을 편집한다. 전략 필드와 ETF 벤치마크의 빈 허용값, 기본값 포함 여부, 고정 필드 단일값과 VR 고정 `HOLD` 정책을 저장 전에 검증하며 변경 취소는 마지막 서버 상태로 복원한다. 증권사 토글은 모의계좌를 맨 뒤에 둔다. 전략별 필드는 "전략 생성"의 각 전략 토글 아래(`StrategyBlock`)에 둔다 — 꺼진 전략은 값 요약 한 줄로 접되 켜기 전에 미리 맞출 수 있게 펼칠 수 있고, 토글하면 수동 펼침을 되돌리며, 저장 시도 후 그 전략에 오류가 있으면 강제로 펼친다(보이지 않는 오류로 저장만 막히지 않게). 끈 전략의 값은 그대로 저장된다. 저장 후 runtime config와, 승인 비활성화 시 admin users/stats refetch를 entity mutation의 hook-level success effect로 주입한다. 모든 effect를 await하므로 완료 전까지 pending을 유지하고, refetch 오류는 mutation error lifecycle로 전달한다. per-call `mutate(..., { onSuccess })`에는 async 필수 효과를 두지 않는다. 자산 등록 폼 추천 목록은 이 폼이 아니라 유저별 설정이다(`finance/manage-strategy-suggestions` 참고).

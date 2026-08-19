# features/ — 사용자 시나리오

사용자의 단일 액션을 구현하는 레이어. `entities/`와 `shared/`만 import 가능.

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
- **`asset/save-asset`**: `AssetForm`이 `mode: 'create' | 'edit' | 'duplicate'` 하나로 3형태를 처리한다(네이티브 `useState` + `<form onSubmit>`, RHF+zod 아님 — strategy 도메인 전용 패턴). kista-api finance 스키마 재설계(2026-08)로 카테고리(`categoryId`)·계좌(`accountId`)·자산군(`assetClass`)·시장(`market`)이 전부 실 데이터 또는 서버 enum이 되면서 각각 독립 `Select`가 됐다 — 구 카테고리 변경 시 `subcategory`/`assetClass` 연쇄 리셋 로직은 성립하지 않아 삭제됐고, `assetClass`/`market` 기본값은 각각 `'CASH'`/`'DOMESTIC'`으로 고정해 사용자가 직접 고르게 한다. 로컬 `ComboField`(자유 입력 `Input` + 추천 `Select`)는 이제 `strategy`(운용전략 자유 메모) 한 곳에만 쓰이고, 추천 목록은 `@entities/runtime-config`의 `assetFormOptions.strategySuggestions`(관리자 수정 가능)에서 가져온다 — `@entities/finance`는 다른 entity를 import할 수 없어(entities 간 cross-import 금지) 두 entity를 조합하는 지점이 이 feature다. 카테고리 Select는 기존 카테고리만 선택 가능하고(새 세부카테고리 생성은 `/finance` 설정 탭의 `finance/manage-categories`에서 한다) `@entities/finance`의 `getCascadeLevels`/`getCategoryPath` 기반 계단식 Select다 — depth 무관하게 동작하도록 설계돼 트리가 2단을 넘어 깊어져도 이 컴포넌트는 수정할 필요가 없다. `selectedPath: string[]` 상태 하나로 각 단의 선택값을 담고, edit/duplicate 모드는 `getCategoryPath`로 기존 `categoryId`에서 경로를 역산해 복원한다. 계좌는 선택(nullable), asset class/market 라벨은 `@entities/meta`의 `useMeta().meta.assetClasses`/`markets`에서 가져온다. 운용전략 필드는 L1이 '투자'(`isInvestmentCategoryId`)일 때만 화면에 노출된다 — 단 payload의 `strategy`는 항상 현재 상태값을 그대로 전송한다(카테고리 무관 자유 필드라는 구 설계 그대로, 비노출이 곧 서버 제출값 삭제를 의미하지 않는다). 값이 지워지는 시점은 사용자가 L1 Select를 '투자'가 아닌 값으로 능동적으로 바꿀 때뿐 — edit 모드 진입 시 레거시 기록(비-투자 카테고리에 저장된 기존 strategy 값)을 복원하는 경로는 건드리지 않아 데이터가 조용히 유실되지 않는다
- **`admin/settings`**: 전체 런타임 설정 초안을 편집한다. 전략 필드와 ETF 벤치마크의 빈 허용값, 기본값 포함 여부, 고정 필드 단일값과 VR 고정 `HOLD` 정책을 저장 전에 검증하며 변경 취소는 마지막 서버 상태로 복원한다. 저장 후 runtime config와, 승인 비활성화 시 admin users/stats refetch를 entity mutation의 hook-level success effect로 주입한다. 모든 effect를 await하므로 완료 전까지 pending을 유지하고, refetch 오류는 mutation error lifecycle로 전달한다. per-call `mutate(..., { onSuccess })`에는 async 필수 효과를 두지 않는다. "자산 등록 폼 추천 목록"(`assetFormOptions`) 섹션은 `/finance` 설정 탭(`finance/manage-strategy-suggestions`)으로 이관됐다 — 이 폼은 더 이상 편집하지 않지만 `clone()`이 여전히 GET 응답의 `assetFormOptions`를 기본값으로 보충해 매 PUT payload에 그대로 왕복시킨다(`AdminSettingsRequest.assetFormOptions`가 `benchmarks`와 달리 생략 불가 필수 필드라서 — 두 폼 중 어느 쪽이 저장하든 이 필드가 빠지면 안 된다)
- **`finance/manage-strategy-suggestions`**: 구 `admin/settings`의 "자산 등록 폼 추천 목록" 섹션 이관 — `/finance` 설정 탭(계좌관리 아래)에 배치하되 그룹 무관 전역 런타임 설정(`entities/admin-settings`)이라 `useMeQuery().data?.role !== 'ADMIN'`이면 컴포넌트 스스로 `null`을 반환한다(일반 사용자도 방문하는 탭이므로 컴포넌트 레벨 게이팅 필수). 변경은 `SuggestionListEditor`(`shared/ui`, 값 추가/삭제 즉시 반영) 조작마다 곧바로 `useUpdateAdminSettingsMutation`으로 전체 설정을 PUT한다(부분 갱신 미지원이라 조회된 나머지 필드를 그대로 왕복) — `admin/settings`처럼 draft+저장 버튼 단계를 두지 않고 다른 Manager(AccountManager 등)와 동일한 즉시-반영 UX를 따른다
- **`finance/manage-categories`**: `/finance` 설정 탭의 카테고리 CRUD. `CategoryManager`가 4타입(ASSET/INCOME/EXPENSE/SAVING) 세그먼트(`FinanceDashboard`의 `TabButton` 패턴을 그대로 복제)를 소유하고 `useFinanceCategoriesQuery(type)` 트리를 L1+`children` 들여쓰기로 렌더한다. 생성/수정은 `CategoryFormDialog`(Base UI `Dialog`) 하나가 겸용 — 수정 모드는 PUT이 `parentId`/`type`을 무시하는 서버 제약 때문에 이름·정렬순서만 노출한다. 트리 행(`CategoryRow`, 재귀)은 별도 파일로 추출돼 있고 `lockSystemCategories?: boolean`(기본 `true`)를 받는다 — 시스템 카테고리(`system:true`)는 기본적으로 수정·삭제 버튼에 `opacity-40 pointer-events-none`(Base UI `AlertDialogTrigger`가 `disabled` prop 미지원이라 이 프로젝트의 표준 비활성 표현). 삭제 확인(`DeleteCategoryDialog`)은 `collectSubtreeIds`로 하위 개수를 세어 "하위 N개 카테고리가 함께 삭제됩니다" 문구를 만든다
  - **관리자용 시스템 카테고리**: `/admin/settings` 페이지에 배치된 `SystemCategoryManager`/`SystemCategoryFormDialog`(같은 슬라이스, `SystemCategoryManager`만 export)는 `/api/admin/finance/categories`(`app/api/admin/[[...path]]` catch-all 프록시, ADMIN role은 kista-api가 검증)를 소비해 `groupId=null`·`system:true`로 고정되는 공통 카테고리를 관리한다. 그룹 스코프 카테고리와 시나리오·권한·데이터소스가 달라 훅을 조건 분기하지 않고 완전히 별도 컴포넌트로 분리했다(`useSystemFinanceCategoriesQuery`/`useCreateSystemFinanceCategoryMutation` 등, 캐시 루트도 `financeKeys.systemCategoriesRoot()`로 분리). `CategoryRow`에 `lockSystemCategories={false}`를 넘겨 시스템 카테고리도 수정·삭제 가능하게 한다(이 화면 자체가 시스템 카테고리 관리 화면이므로 기본 잠금을 반전)
- **`finance/manage-accounts`**: `/finance` 설정 탭의 재무 계좌(은행/증권사/보험/거래소) CRUD — `entities/account`(한국투자증권 브로커 계좌)와는 다른 도메인이라 디렉토리·import를 절대 섞지 않는다. `AccountManager`가 목록에서 `accountNo`를 `maskAccountNo`(뒷 4자리만 노출)로 마스킹해 렌더하고, 수정 다이얼로그에서만 전체 값을 편집한다
- **`finance/manage-group`**: `/finance` 설정 탭의 그룹 전환·멤버·초대. `GroupManager`가 `useFinanceGroupsQuery()`·`useActiveGroupId()`·`useSetActiveGroupId()`를 한 번만 구독해 `GroupSwitcher`(`groups`/`value` props)와 `GroupSection`(`activeGroupId`/`setActiveGroupId` props)에 그대로 물려준다 — 자식이 같은 쿼리를 다시 구독하지 않는다. `GroupSwitcher` 라벨은 `group.personal`이면 서버 name을 무시하고 고정 문구 "내 개인 그룹"을 쓴다 — kista-api가 개인 그룹 name을 고정 문자열 `"개인"`으로 주고 그룹 이름 변경 API가 없어서, 초대 수락으로 `personal:false` 전환된 공유 그룹도 원래 owner의 개인 그룹이 갖던 `"개인"`이라는 이름을 그대로 물려받는다(name만으로는 개인/공유 구분 불가). `GroupMemberList`는 OWNER에게만 추방 버튼을 보여주고(`isOwner && !isPersonal`), `LeaveGroupDialog`는 트리거 버튼이 `!isPersonal`로 게이팅될 뿐 아니라 컴포넌트 자신도 `isPersonal` prop이 true면 `null`을 반환하는 이중 방어를 가진다(개인 그룹 탈퇴는 서버가 409) — OWNER가 나가면 서버가 남은 멤버 중 가장 먼저 가입한 사람을 자동 승계한다. `InviteDialog`는 개인 그룹에서도 노출된다(`isOwner`만 게이팅) — 그룹 생성 API가 없어 "개인 그룹에서 초대 발급 → 수락"이 공유 그룹을 만드는 유일한 경로라, `isPersonal`로 초대까지 막으면 그룹을 만들 방법이 없어진다. `isOwner` 게이팅은 `GroupManager`가 멤버 목록에서 내 role을 찾아 판정하고, 발급된 코드는 재조회가 안 되므로 다이얼로그가 열려 있는 동안만 표시하고 복사 버튼+경고 문구를 둔다. `AcceptInvitationForm`은 코드 입력 후 수락만 처리한다(거절 버튼 제거 — 초대 코드는 본인이 직접 입력하는 흐름이라 거절할 대상이 없음). 로그아웃(`app/api/auth/logout/route.ts`)은 `ACTIVE_GROUP_COOKIE`도 함께 지운다 — 안 지우면 공유 기기에서 다음 로그인 사용자가 이전 사용자의 그룹 UUID를 물려받아 403을 겪는다
- **`strategy/create-strategy/sections`**: CSS 토큰 기반 인라인 style 다수 사용
- **선택형 카드**: 전략 등록·수정 섹션, 알림 수단, 테마 선택은 `@shared/ui/selection-card`의 `SelectionCard`를 사용한다. 전략 유형·시드 모드·알림 수단·테마처럼 큰 카드는 `showIndicator`, 수치·종목 등 작은 옵션은 외곽선만 사용한다

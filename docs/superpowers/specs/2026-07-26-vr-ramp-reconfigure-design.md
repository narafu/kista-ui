# VR 램프 + 운영 중 재설정 UI 설계

## 배경

kista-api `worktree-vr-ramp-reconfigure`(commit `0b69882d`, 현재 main에 반영됨)에서 두 기능이 추가됐다(`HANDOFF_VR_RAMP_RECONFIGURE.md` 참고).

1. **VR 램프**: VR 전략의 gradient(G)·poolLimitRate가 전략 최초 시작일부터 경과한 주수에 따라 점진 변화한다. 초기값·유예기간·단계주기·상하한 8개 파라미터는 등록 시 사용자 입력(전부 optional — 생략 시 기존과 동일하게 고정값 동작).
2. **VR 운영 중 재설정**: `PUT /api/trading-cycles/{id}/vr-config`로 밴드폭·주기·적립금·램프 파라미터 수정 + 자본(주식·예수금) 주입이 가능해졌다. 내부적으로 "새 버전 발급 + 강제 롤오버(현재 사이클 종료 → 새 사이클 즉시 생성)"로 처리되며, **파라미터 하나만 바꿔도 진행 중 사이클이 끝나고 새로 시작되며 미체결 주문이 전부 취소된다.**

이 문서는 위 API 변경을 kista-ui에 반영하는 설계다.

## 범위

- `entities/strategy`: 타입·정규화·API 함수·뮤테이션 훅 추가 (다른 모든 작업의 전제)
- 전략 상세 화면에 VR 재설정 진입점 + 전용 폼(신규 feature 슬라이스) 추가
- 전략 등록 폼(`VrSettingsSection`)에 램프 8필드 고급설정 접이식 섹션 추가
- 기존 "VR 상세 설정은 등록 후 변경할 수 없습니다" 안내 문구 수정 (사실과 어긋남)

범위 밖: kista-api 자체 변경, 램프 공식(`gradientAt`/`poolLimitRateAt`)의 프론트 재구현(미리보기 없음 — 아래 "열린 질문 결정" 참고).

## 열린 질문 결정 (사용자 확인 완료)

1. 등록 폼 램프 노출: **한다** — 접이식 "고급 설정" 섹션으로 8필드 노출.
2. 재설정 UI 형태: **인터셉팅 라우트 모달** (`RouteModal` + `@modal` 패턴, 기존 `strategies/[sid]/edit`와 동일 메커니즘).
3. 램프 미리보기(N주 후 값): **안 함** — 서버 계산값만 재설정/롤오버 후 사후에 표시.
4. 확인 경고 문구: 아래 "확인 다이얼로그" 절 참고.

## A. 타입·정규화 (`entities/strategy`)

### `model/types.ts`

```ts
export interface StrategyVrSummary {
  value: number
  bandWidth: number
  intervalWeeks: number
  recurringAmount: number
  poolLimit: number
  gradient: number
  // 신규 8필드 — "램프 0주차 시작값" (아래 "gradient/poolLimit vs initial* 구분" 참고)
  initialGradient: number
  gGraceWeeks: number
  gStepWeeks: number
  gMax: number
  initialPoolLimitRate: number
  pGraceWeeks: number
  pStepWeeks: number
  poolLimitFloor: number
}

export interface StrategyRequest {
  // ...기존 필드 유지
  initialGradient?: number
  gGraceWeeks?: number
  gStepWeeks?: number
  gMax?: number
  initialPoolLimitRate?: number
  pGraceWeeks?: number
  pStepWeeks?: number
  poolLimitFloor?: number
}

// 신규 — PUT /api/trading-cycles/{id}/vr-config 요청 바디, 14필드 전부 optional
export interface ReconfigureVrRequest {
  bandWidth?: number
  intervalWeeks?: number
  recurringAmount?: number
  initialGradient?: number
  gGraceWeeks?: number
  gStepWeeks?: number
  gMax?: number
  initialPoolLimitRate?: number
  pGraceWeeks?: number
  pStepWeeks?: number
  poolLimitFloor?: number
  injectShares?: number
  injectSharePrice?: number
  injectDeposit?: number
}
```

**`gradient`/`poolLimit` vs `initialGradient`/`initialPoolLimitRate` 구분**: 기존 `gradient`/`poolLimit`은 "현재 사이클의 스냅샷 값"(경과주수 기준 이미 계산된 현재 G값·현재 pool 상한 달러)이고, 신규 `initialGradient`/`initialPoolLimitRate`는 "램프 0주차 시작값"이다. 재설정 폼의 초깃값은 반드시 `initial*` 필드에서 채운다 — `gradient`/`poolLimit`을 쓰면 램프가 진행된 전략에서 초깃값이 틀어진다.

### `api/index.ts`

- `normalizeVrSummary()`: 8필드 추가 매핑. `initialPoolLimitRate`/`poolLimitFloor`는 `poolLimit`처럼 `toNum()`(BigDecimal 문자열), 나머지(`initialGradient`/`gGraceWeeks`/`gStepWeeks`/`gMax`/`pGraceWeeks`/`pStepWeeks`)는 `gradient`/`intervalWeeks`처럼 `Number()`.
- 신규 함수:
  ```ts
  export async function reconfigureVr(id: string, data: ReconfigureVrRequest, token?: string): Promise<Strategy> {
    const raw = await fetchEither<unknown>(`/api/trading-cycles/${id}/vr-config`, jsonBody('PUT', data), token)
    return normalizeStrategy(raw)
  }
  ```
  `updateStrategy`와 완전히 동일한 패턴, 경로만 다르다.

### `hooks/useStrategyQueries.ts`

```ts
export function useReconfigureVrMutation(strategyId: string, onSuccess?: () => void) {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ReconfigureVrRequest) => reconfigureVr(strategyId, data),
    onSuccess: () => {
      toast.success('VR 전략이 재설정되었습니다')
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
      queryClient.invalidateQueries({ queryKey: ['order-preview'] }) // 사이클이 통째로 바뀌므로 주문 미리보기도 무효화 필수
      router.refresh()
      onSuccess?.()
    },
    onError: (err) => toast.error(apiMsg(err, '재설정에 실패했습니다')),
  })
}
```

`useUpdateStrategyMutation`(`entities/strategy/hooks/useStrategyQueries.ts:69`)과 완전히 동일한 뼈대.

### `entities/strategy/index.ts`

신규 타입(`ReconfigureVrRequest`)·함수(`reconfigureVr`)·훅(`useReconfigureVrMutation`) export 추가.

## B. 상세 화면 진입점 + 재설정 폼 (핵심 신규 UI)

### 진입점

`app/(main)/accounts/[id]/strategies/[sid]/page.tsx`의 `PageHeader actions`에 기존 "수정" 링크 옆에 VR 전략(`strategy.vr` 존재)에만 조건부로 "VR 재설정" 링크를 추가한다. "수정"과 동급의 페이지 이동형 액션이라 같은 위치·같은 스타일(`buttonVariants({ variant: 'ghost', size: 'sm' })`)을 사용한다.

```tsx
{strategy.vr && (
  <Link href={`/accounts/${id}/strategies/${sid}/reconfigure-vr`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
    VR 재설정
  </Link>
)}
```

### 라우트 구조 (기존 `edit`와 동일 패턴)

- 실제 페이지(모바일 풀페이지 + 새로고침/직접 진입): `app/(main)/accounts/[id]/strategies/[sid]/reconfigure-vr/page.tsx` + `loading.tsx`
- PC 인터셉팅 모달: `app/(main)/@modal/(.)accounts/[id]/strategies/[sid]/reconfigure-vr/page.tsx` + `loading.tsx`, `RouteModal` 래핑
- 두 page.tsx 모두 Server Component에서 `getAuthToken()` + `listAccounts`/`listStrategies`로 `account`/`strategy` 로드 후 동일한 `ReconfigureVrForm accountId strategy dismiss="push"|"back"` 렌더. `edit`의 `loadAccountAndStrategyForEdit`(`features/strategy/create-strategy/model/loadStrategyFormContext.ts`)와 로직이 동일하지만 **FSD 규칙상 feature 슬라이스끼리 cross-import 금지**이므로 재사용하지 않는다 — `features/strategy/reconfigure-vr/model/loadStrategyForReconfigure.ts`에 동일 패턴(약 10줄)으로 신규 작성한다.
- 비VR 전략으로 이 라우트에 직접 진입하면 `notFound()` 처리.

### 신규 feature 슬라이스 `features/strategy/reconfigure-vr/`

```text
features/strategy/reconfigure-vr/
  ReconfigureVrForm.tsx        # 폼 전체 (경고 배너 + 3그룹 필드 + 확인 다이얼로그)
  model/reconfigureVrFormSchema.ts
  model/useReconfigureVrForm.ts
  index.ts
```

**경고 배너** (폼 상단 상시 노출, 고정 텍스트 — `widgets.md`의 "현재 상태 경고는 고정 텍스트로" 원칙):

> ⚠️ 설정을 하나라도 변경하면 진행 중인 사이클이 즉시 종료되고 새 사이클이 시작되며, 오늘 접수된 미체결 주문이 모두 취소됩니다.

`--warn`/`--warn-bg` 토큰 사용.

**필드 3그룹**:

1. **파라미터**: `bandWidth`, `intervalWeeks`, `recurringAmount`(+ recurringMode 선택 UI, `VrSettingsSection`의 `ChoiceButton` 패턴 재사용). 초기값은 현재 `strategy.vr.bandWidth`/`intervalWeeks`/`recurringAmount`.
2. **램프 설정** (8필드, 등록 폼 고급설정과 동일 필드 구성). 초기값은 `strategy.vr.initialGradient` 등 — `gradient`/`poolLimit` 아님(위 "구분" 절 참고).
3. **자본 주입** (별도 섹션, 시각적으로 명확히 구분 — "설정만 바꾸기"와 "실제 자본 투입"은 성격이 다른 행위): `injectShares`, `injectSharePrice`(shares>0일 때만 노출/필수), `injectDeposit`. 전부 미입력 시 자본 주입 없음(현재 보유·예수금 그대로 이월).

모든 필드는 optional — 빈 값으로 제출하면 현재 값 유지(서버 상속). 폼 초기값은 채워두되, 사용자가 지우면 payload에서 생략(`undefined`)한다.

**검증** (`reconfigureVrFormSchema.ts`, zod): 핸드오프 문서 검증 규칙 그대로.

```ts
bandWidth?: number > 0
intervalWeeks?: number, 정수, >= 1
recurringAmount?: number, 정수
initialGradient?: number > 0
gStepWeeks?: number > 0
gGraceWeeks?: number >= 0
gMax?: number >= initialGradient
pStepWeeks?: number > 0
pGraceWeeks?: number >= 0
poolLimitFloor: 0 < poolLimitFloor <= initialPoolLimitRate <= 1
injectShares?: number >= 0
injectShares > 0 이면 injectSharePrice > 0 필수
injectDeposit?: number >= 0
```

교차 필드 검증(`gMax >= initialGradient`, `poolLimitFloor <= initialPoolLimitRate` 등)은 `superRefine`으로 처리.

**확인 다이얼로그** (제출 시, 기존 삭제 `AlertDialog` 패턴 재사용 — `widgets/strategy-detail/StrategyDetail.tsx:418-434` 참고):

```
제목: VR 전략을 재설정하시겠습니까?
본문: 진행 중인 사이클이 즉시 종료되고 새 사이클이 시작됩니다.
      오늘 접수된 미체결 주문은 모두 취소됩니다. 이 작업은 되돌릴 수 없습니다.
취소 / 재설정 버튼(destructive 톤)
```

폼 submit → `e.preventDefault()` + zod 검증 통과 시 `AlertDialog` open → 사용자가 "재설정" 확정 시 `useReconfigureVrMutation(strategy.id, () => router 이동/back)` 호출.

## C. 등록 폼 고급설정 (`features/strategy/create-strategy`)

- `strategyFormSchema.ts`: 램프 8필드를 재설정 폼과 동일한 범위 검증으로 추가(`.nullable().optional()`).
- `useStrategyForm.ts`: `VrFields`에 8필드 추가, `setVrField`가 그대로 커버(이미 `keyof VrFields` 제네릭). `handleSubmit`의 create 분기 payload 조립부에 `isVr` 블록 안에서 동일 패턴으로 8필드 추가(값 있을 때만 포함, 없으면 생략 → 서버 기본값).
- `VrSettingsSection.tsx`: 기존 필드 아래 접이식 "고급 설정(램프)" 섹션 추가 — 항목이 많아 기본 화면에 펼치지 않는다. **등록 전용**이라 `isEdit`이면 섹션 자체를 숨긴다(중간부터 시작·시작예정일과 동일한 기존 패턴).

## D. 기존 안내 문구 수정

`VrSettingsSection.tsx`의 `isEdit` 분기:

```diff
- <p ...>VR 상세 설정은 등록 후 변경할 수 없습니다.</p>
+ <p ...>여기서는 변경할 수 없습니다 — 전략 상세 화면의 &quot;VR 재설정&quot;을 이용하세요.</p>
```

## 영향받지 않는 부분

- 기존 "전략 수정"(`/strategies/[sid]/edit`) 페이지의 제출 로직은 변경하지 않는다 — VR 필드는 여전히 읽기전용 표시만 하고 payload에 포함하지 않는다(재설정은 완전히 별도 플로우).
- `StrategyDetail.tsx`의 VR KPI 그리드(`전략타입/운용 방식/밴드 폭/주기/G/V/pool/pool 상한`, 최근 `2026-07-26-vr-strategy-detail-pool-recurring-design.md`에서 정리됨)는 그대로 둔다 — 램프 8필드를 이 그리드에 노출하지 않는다(과밀 방지, 필요 시 별도 후속 작업).
- kista-api 응답 스키마는 변경 대상이 아니다(이미 반영됨).

## 테스트

- `entities/strategy`: `normalizeVrSummary` 8필드 매핑, `reconfigureVr` 함수, `useReconfigureVrMutation` 성공/실패 시나리오(기존 `useUpdateStrategyMutation` 테스트 패턴 참고).
- `features/strategy/reconfigure-vr`: 폼 렌더·초기값(특히 `initialGradient` 소스 확인 — `gradient`가 아님을 검증하는 케이스 포함)·zod 검증(범위·교차 필드)·확인 다이얼로그 노출·제출 시 뮤테이션 payload 형태.
- `features/strategy/create-strategy`: `VrSettingsSection.test.tsx`에 고급설정 접이식 섹션 렌더(등록 모드에서만) + `strategyFormSchema.test.ts`에 8필드 검증 케이스 추가. 기존 `isEdit` 문구 테스트가 있으면 새 문구로 갱신.
- 회귀: 기존 `StrategyDetail.test.tsx`, `useStrategyForm.test.ts`, `strategyFormSchema.test.ts`가 그대로 통과해야 한다.

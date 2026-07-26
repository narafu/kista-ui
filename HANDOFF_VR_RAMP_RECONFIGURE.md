# kista-ui 인수인계: VR 램프 + 운영 중 재설정

kista-api `vr-ramp-reconfigure` 워크트리(브랜치 `worktree-vr-ramp-reconfigure`, commit `0b69882d`)에서 두 기능이 구현·커밋됐다.
이 문서는 그 변경을 kista-ui에 반영하기 위한 인수인계다. **아직 push되지 않았고 main에 머지되지 않았다** — 작업 시작 전 병합 여부를 먼저 확인할 것.

## 배경 (왜)

1. **VR 램프**: VR 전략의 gradient(G)·poolLimitRate가 더 이상 고정값이 아니라 "전략 최초 시작일부터 경과한 주수"에 따라 점진 변화한다. 초기값·유예기간·단계주기·상하한 8개 파라미터는 등록 시 사용자 입력(모두 optional — 생략 시 기존과 동일하게 동작).
2. **VR 운영 중 재설정**: 등록 후에는 VR 설정을 바꿀 방법이 없었다. `PUT /api/trading-cycles/{id}/vr-config`로 밴드폭·주기·적립금·램프 파라미터 수정 + 자본(주식·예수금) 주입이 가능해졌다. 내부적으로는 "새 버전 발급 + 강제 롤오버(현재 사이클 종료 → 새 사이클 즉시 생성)"로 처리된다 — **사소한 파라미터 하나만 바꿔도 진행 중 사이클이 끝나고 새로 시작되며 미체결 주문이 전부 취소된다.** UI에서 이 부작용을 반드시 사용자에게 고지해야 한다.

## API 변경 요약

### 1. 등록 요청 (`StrategyRequest` / `POST /api/accounts/{id}/trading-cycles`)

`recurringAmount` 뒤, `scheduledStartDate` 앞에 8개 필드 추가 — **전부 optional, 생략 시 백엔드가 기존과 동일한 기본값 적용**(하위호환 100%, 프론트 변경 없이도 등록 흐름은 그대로 동작함):

```ts
initialGradient?: number       // 램프 시작(경과 0주) G값. 생략 시 recurringAmount<0 ? 20 : 10
gGraceWeeks?: number           // G 램프 시작 전 유예 주수. 생략 시 52
gStepWeeks?: number            // G가 1단계 오르는 주기(주). 생략 시 26
gMax?: number                  // G 상한. 생략 시 initialGradient(=램프 없음, 기존 동작)
initialPoolLimitRate?: number  // 램프 시작(경과 0주) poolLimitRate(0~1 비율). 생략 시 recurringAmount>0?0.75:==0?0.50:0.25
pGraceWeeks?: number           // poolLimitRate 램프 시작 전 유예 주수. 생략 시 52
pStepWeeks?: number            // poolLimitRate가 5%p 내려가는 주기(주). 생략 시 26
poolLimitFloor?: number        // poolLimitRate 하한(0~1). 생략 시 initialPoolLimitRate(=램프 없음)
```

증감폭(G는 +1, poolLimitRate는 -5%p)은 고정 상수라 입력 필드 아님.

검증 규칙(위반 시 400): `initialGradient>0`, `gStepWeeks>0`, `gGraceWeeks>=0`, `gMax>=initialGradient`, `pStepWeeks>0`, `pGraceWeeks>=0`, `0 < poolLimitFloor <= initialPoolLimitRate <= 1`.

### 2. 응답 (`Strategy.vr` / `StrategyVrSummary`)

기존 6필드(`value, bandWidth, intervalWeeks, recurringAmount, poolLimit, gradient`) 뒤에 8필드 추가(등록 요청과 동일한 이름·의미):

```ts
initialGradient: number
gGraceWeeks: number
gStepWeeks: number
gMax: number
initialPoolLimitRate: number
pGraceWeeks: number
pStepWeeks: number
poolLimitFloor: number
```

**주의**: 기존 `gradient`/`poolLimit`은 "현재 사이클의 스냅샷 값"(경과주수에 따라 이미 계산된 현재 G값·현재 pool 상한 달러)이고, 새로 추가된 `initialGradient`/`initialPoolLimitRate`는 "램프 0주차 시작값"이다. **재설정 폼의 초깃값은 반드시 `initialGradient`/`initialPoolLimitRate` 등에서 채워야 한다 — `gradient`/`poolLimit`(현재 스냅샷)로 채우면 안 된다.** 램프가 이미 진행된 전략이면 두 값이 다르다.

### 3. 신규 엔드포인트: `PUT /api/trading-cycles/{id}/vr-config`

요청 바디(`VrConfigRequest`, 14필드, **전부 optional** — 미지정 시 현재 활성 버전 값 그대로 유지/상속):

```ts
{
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
  injectShares?: number        // 자본 주입: 편입할 주식 수 (0 이상, 없으면 주입 안 함)
  injectSharePrice?: number    // injectShares>0이면 필수 — 그 주식의 매수단가
  injectDeposit?: number       // 자본 주입: 추가 예수금 USD (0 이상, 없으면 주입 안 함)
}
```

- VR 전략에만 호출 가능(비-VR이면 400).
- `recurringAmount`를 인출식(음수)으로 바꾸는 경우, 등록 시점과 동일한 최소자산 규칙(`V+예수금 >= abs(recurringAmount)×100×4/intervalWeeks`)이 재검증된다.
- 성공 시 200, 응답은 등록/조회와 동일한 `TradingCycleResponse`(=`Strategy`) — 새 사이클 반영된 `vr` 요약과 `startDate`가 내려온다.
- 실패(400/403/404 등)는 `GlobalExceptionHandler` 공통 처리, 기존 `apiMsg(err, fallback)` 패턴 그대로 사용 가능.

## 필요한 UI 작업

### A. 타입·정규화 (필수, 다른 모든 작업의 전제)

- `entities/strategy/model/types.ts`
  - `StrategyVrSummary`에 8필드 추가
  - `StrategyRequest`에 8필드 추가(optional number)
  - 신규 `ReconfigureVrRequest` 타입(14필드, 전부 optional) 추가
- `entities/strategy/api/index.ts`
  - `normalizeVrSummary()`에 8필드 매핑 추가(숫자 변환 — `toNum`/`Number` 기존 패턴 그대로, `initialPoolLimitRate`/`poolLimitFloor`는 `poolLimit`처럼 `toNum`, 나머지 정수 필드는 `bandWidth`/`gradient` 패턴 참고)
  - 신규 `reconfigureVr(id: string, data: ReconfigureVrRequest, token?: string): Promise<Strategy>` — `updateStrategy`와 동일 패턴(`fetchEither`+`jsonBody('PUT', data)`+`normalizeStrategy`), 경로만 `` `/api/trading-cycles/${id}/vr-config` ``
  - `docs/agents/entities.md`의 "TradingCycleResponse 필드 추가 시" 규칙 그대로 적용(타입+normalize 항상 같이 수정)
- `entities/strategy/index.ts`: 신규 타입·함수·훅 export 추가
- `entities/strategy/hooks/useStrategyQueries.ts`: 신규 `useReconfigureVrMutation(strategyId, onSuccess?)` — `useUpdateStrategyMutation`을 그대로 본떠서: 성공 시 `toast.success('VR 전략이 재설정되었습니다')` + `invalidateQueries(['strategies'])` + `invalidateQueries(['order-preview'])`(사이클이 통째로 바뀌므로 주문 미리보기도 무효화 필수) + `router.refresh()`, 실패 시 `toast.error(apiMsg(err, '재설정에 실패했습니다'))`

### B. 상세 화면 — VR 재설정 진입점 (핵심 신규 UI)

`widgets/strategy-detail/StrategyDetail.tsx`:
- VR 전략(`strategy.vr` 존재)에만 재설정 버튼 노출 — 기존 하단 액션 카드(중지/삭제 버튼이 있는 `<Card><CardContent className="p-5 flex gap-2">`) 근처가 자연스러운 위치
- **반드시 확인 모달**을 거치게 할 것(기존 삭제 `AlertDialog` 패턴 재사용) — "이 작업은 진행 중인 사이클을 즉시 종료하고 새 사이클을 시작하며, 오늘 접수된 미체결 주문을 모두 취소합니다" 같은 경고 문구 필수. 사소한 밴드폭 조정 하나에도 전체 롤오버가 발생한다는 걸 사용자가 반드시 인지해야 한다.
- 신규 폼/모달 컴포넌트는 별도 feature 슬라이스로 분리 권장(예: `features/strategy/reconfigure-vr/`) — `useReconfigureVrMutation` 사용, 필드:
  - 파라미터 수정군: `bandWidth`, `intervalWeeks`, `recurringAmount`(+ recurringMode 선택 UI는 `VrSettingsSection`의 기존 패턴 재사용 가능) — 초기값은 현재 `strategy.vr.bandWidth`/`intervalWeeks`/`recurringAmount`
  - 램프 파라미터군(8개) — 초기값은 `strategy.vr.initialGradient` 등(위 "주의" 참고, `gradient`/`poolLimit` 아님)
  - 자본 주입군(별도 섹션으로 명확히 구분 권장 — "설정만 바꾸기"와 "실제 자본 투입"은 성격이 다른 행위): `injectShares`, `injectSharePrice`(shares>0일 때만 노출/필수), `injectDeposit`
- 검증(zod 스키마 신규 작성, `strategyFormSchema.ts` 패턴 참고): 위 "검증 규칙" 절 그대로 + `injectShares>=0`, `injectShares>0`이면 `injectSharePrice>0` 필수, `injectDeposit>=0`

### C. 등록 폼 — 램프 필드 노출 여부 (우선순위 낮음, 결정 필요)

백엔드가 8필드 전부 optional + 기존과 동일한 기본값을 적용하므로, **등록 폼(`VrSettingsSection.tsx`/`useStrategyForm.ts`/`strategyFormSchema.ts`)은 아무것도 안 바꿔도 기존 등록 흐름이 그대로 동작한다.** 신규 사용자에게 램프 커스터마이징을 등록 시점에 노출할지는 제품 판단 필요(아래 "열린 질문" 참고). 노출하기로 하면:
- `strategyFormSchema.ts`에 8필드 추가(같은 범위 검증)
- `useStrategyForm.ts`의 `VrFields`/`vrFields`/`setVrField`/submit payload 조립부에 동일 패턴으로 8필드 추가(기존 `intervalWeeks`/`bandWidth` 다루는 코드 그대로 복제)
- `VrSettingsSection.tsx`에 입력 UI 추가 — 항목이 많아 기본 화면에 다 펼치기보다 "고급 설정" 접이식 섹션 권장

### D. 상세 화면 — 기존 안내 문구 수정 (필수, 사실과 어긋남)

`features/strategy/create-strategy/sections/VrSettingsSection.tsx`의 `isEdit` 분기:
```tsx
{isEdit && (
  <p ...>VR 상세 설정은 등록 후 변경할 수 없습니다.</p>
)}
```
이 문구는 **재설정 기능이 생긴 지금은 사실이 아니다.** 삭제하거나 "여기서는 변경 불가 — 전략 상세 화면의 'VR 재설정'을 이용하세요" 식으로 갱신 필요.

## 참고 — 예시 payload

**재설정(파라미터만 조정, 자본 주입 없음)**:
```json
PUT /api/trading-cycles/{id}/vr-config
{ "bandWidth": 20.00 }
```
나머지 13개 필드는 생략 → 전부 현재 값 유지, 자본 주입 없음(V·holdings·usdDeposit 이월).

**재설정(주식 10주 편입)**:
```json
{ "injectShares": 10, "injectSharePrice": 62.50 }
```

**재설정(예수금 $500 추가)**:
```json
{ "injectDeposit": 500.00 }
```

## 열린 질문 (제품/UX 판단 필요 — 임의로 정하지 않음)

1. 등록 폼에 램프 8필드를 처음부터 노출할지, 아니면 이번엔 재설정 UI만 만들고 등록은 그대로 둘지 (백엔드는 둘 다 지원, 노출 안 해도 기능엔 지장 없음)
2. VR 재설정을 페이지 이동 방식으로 할지 모달로 할지
3. 현재 G/poolLimit이 "몇 주 후 얼마로 바뀌는지" 미리보기를 보여줄지 — 보여주려면 램프 공식(`gradientAt`/`poolLimitRateAt`)을 프론트에서 재구현해야 해서 백엔드와 로직이 어긋날 위험이 있음. **권장: 하지 않는다** — 재설정/롤오버 시점에 서버가 계산한 실제 값만 사후에 보여준다.
4. 확인 모달의 정확한 경고 문구(위 "핵심 신규 UI" 참고 — 초안만 제시했음)

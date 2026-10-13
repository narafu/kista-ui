# DCA 전략 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DCA(정기 적립식) 전략을 등록·수정·조회하는 UI를 추가한다. 관리자 런타임 설정에서 DCA를 켜고 끌 수 있게 한다.

**Architecture:** 데이터는 `entities/strategy`가 맡는다. 타입, normalizer, API 함수, 훅, 표시 포매터를 둔다. 등록·수정 폼은 기존 `StrategyForm`의 유형 선택 아래에서 별도 `DcaStrategyForm`(자체 RHF + zod)으로 분기한다(A'안). 카드와 상세는 `strategy.type === 'DCA'`일 때 래퍼 컴포넌트에서 DCA 전용 컴포넌트로 분기한다. 이렇게 하면 미리보기 쿼리(DCA는 409)가 아예 실행되지 않는다.

**Tech Stack:** Next.js 16 App Router, TypeScript, React Query, react-hook-form + zod, shadcn/ui, Vitest + RTL

**Spec:** `docs/superpowers/specs/2026-10-13-dca-strategy-ui-design.md` (백엔드 SSOT: `../kista-api/docs/superpowers/specs/2026-10-13-dca-strategy-design.md` 7장)

## Global Constraints

- **착수 전제:** 백엔드 단계 ① 배포 알림 이후에 시작한다(로컬 kista-api가 해당 커밋으로 기동돼 있어도 된다). Task 1이 `npm run fetch:spec && npm run gen:types`로 시작한다.
- **포맷:** 싱글 쿼트, 세미콜론 없음, import 중괄호 공백 유지. 기존 파일 포맷은 일괄 변경하지 않는다.
- **카피:**
  - 합니다체를 쓰고 해요체는 쓰지 않는다.
  - 캡션·카드 설명은 명사구로 쓰고 마침표를 붙이지 않는다.
  - `entities/*/hooks` onError 토스트는 마침표를 붙인다.
  - `features`·`widgets`의 인라인 토스트는 한 문장이면 마침표를 붙이지 않는다.
- **라벨:** 빈도·지표·연산자·skip 사유·방향의 라벨은 메타(`labelOf`)를 SSOT로 쓰고 UI에 하드코딩하지 않는다. 예외는 요일 한글명(`MONDAY`→`월요일`)이다. java `DayOfWeek`라서 메타에 없다.
- **접근성:** `SelectTrigger`에는 `aria-label`을 단다. 가로 스크롤 표는 `role="region"` + `aria-label` + `tabIndex={0}`로 감싼다. 섹션 제목 heading 레벨을 건너뛰지 않는다.
- **React Query:** 서버 상태를 `useState`에 복사하지 않는다. mutation 훅의 `onError`를 호출부에서 다시 지정하지 않는다.
- **검증:** 태스크마다 관련 테스트 파일만 실행한다. 전체 `npm run test:run`, `typecheck`, `lint`는 Task 7에서 1회만 돌린다.
- **서브에이전트 모델(사용자 전역 규칙: 매번 명시):**
  - Task 1·2·3·7(기계적 작업): `sonnet`
  - Task 4(폼, 가장 큼)·5·6(위젯 분기): 구현은 `sonnet`, 리뷰어는 `opus`
  - fix-round 재검토: 원 태스크보다 한 단계 낮은 모델
- **커밋:**
  - 커밋은 각 태스크의 리뷰어 통과 후에 한다.
  - author는 `narafu <narafu@kakao.com>`이고 메시지는 한글로 쓴다.
  - 괄호가 들어간 경로는 큰따옴표로 감싼다.
  - 서브에이전트에게는 "커밋하지 말 것"을 명시하고, 커밋은 컨트롤러가 한다.

### 백엔드 계약 요약 (원문: 백엔드 spec 7장)

- 등록: `POST /api/accounts/{accountId}/trading-cycles` `{ type:'DCA', ticker, scheduledStartDate?, dca:{ direction, amountUsd, orderType, frequency, dayOfWeek, dayOfMonth, conditions[] } }`
  - `dayOfMonth: null` + `MONTHLY` = 말일
  - `dayOfWeek`는 `MONDAY`~`FRIDAY` 중 하나이고 WEEKLY가 아니면 null
- 수정: `PUT /api/trading-cycles/{id}/dca-config` 본문은 `dca` 객체다. ticker와 direction은 변경할 수 없다(다르면 400).
- 조회: `TradingCycleResponse.dca`(비DCA는 null)에 등록 필드 + `nextExecution{usSessionDate,kstTradeDate}|null` + `lastExecution{kstTradeDate,status,skipReason}|null`이 실린다.
- 이력: `GET /api/trading-cycles/{id}/dca-executions?page&size` 응답 `{content[], page, size, totalElements}`. page는 0부터 센다.
- 메타:
  - `StrategyTypeMeta`에 `orderTypes`, `directions`, `frequencies`, `conditionIndicators`(code 배열)가 붙는다.
  - 최상위 신규 키: `orderTypes`, `orderDirections`, `dcaFrequencies`, `dcaOperators`, `dcaSkipReasons`(EnumMeta[]), `dcaIndicators`(`{code,label,description,smaPeriods:number[]}[]`)
- 런타임 설정: `strategies.DCA`가 필수 키다. 기본값은 enabled=false, `fields.ticker`만 있고 나머지 필드는 null이다.
- 오류:
  - 같은 계좌·종목·방향 중복은 400이고 detail은 "같은 계좌·종목에 같은 방향의 DCA 전략이 이미 있습니다."다.
  - 바로 주문·단건 미리보기는 409 `DCA_MANUAL_EXECUTION_UNSUPPORTED`다.
  - 계좌 단위 미리보기(previewBatch)는 DCA를 결과에서 제외한다.
- 브로커는 전략 응답에 없다. 계좌 `Account.broker`를 쓴다.

## Review Focus

1. **DCA 전략에 대해 단건 미리보기(409)와 바로 주문이 어디에서도 호출되지 않아야 한다.** 2026-10-13 grep 기준으로 호출하는 곳은 `StrategyCard`, `StrategyDetail`, 상세 페이지 prefetch뿐이다. 실행 중 새 소비처가 생기면 같은 가드를 추가한다. `StrategyCard`/`StrategyDetail`의 훅 호출 순서 때문에 분기를 컴포넌트 안에 넣으면 훅이 먼저 실행된다. 반드시 래퍼에서 분기한다(Task 5·6 테스트로 고정).
2. **런타임 설정에 `strategies.DCA`가 없는 구버전 응답이 와도 폼과 관리자 화면이 크래시하지 않아야 한다.** API ① 배포 전후 캐시 혼재 상황이다. 관리자 폼은 `draft.strategies.DCA?.`로 가드한다(Task 1 테스트).
3. **MONTHLY에서 "말일"을 고르면 payload `dayOfMonth`가 null이어야 하고, 29~31 선택은 숫자 그대로 가야 한다.** 주기를 WEEKLY→MONTHLY로 바꿀 때 남아 있던 `dayOfWeek` 값은 payload에서 null이어야 한다(Task 3 테스트).
4. **조건을 SMA로 바꾸면 이전 threshold가 payload에 남지 않아야 하고, RSI·공포탐욕의 0~100 범위를 벗어나면 제출이 막혀야 한다**(Task 3 테스트).
5. **수정 모드에서 direction과 ticker를 바꿀 수 없어야 하고, 수정 저장이 `PUT /dca-config`로 가야 한다**(`updateStrategy`로 가면 안 됨, Task 4 테스트).

---

## File Structure

| 파일 | 책임 |
|---|---|
| `shared/lib/api-types.ts` | gen:types 산출물(수동 편집 금지) |
| `entities/meta/model/types.ts` | MetaBundle·StrategyTypeMeta에 DCA 메타 필드 추가 |
| `features/admin/settings/ui/AdminSettingsForm.tsx` | DCA 토글 행 + DCA 종목 필드 편집기 |
| `entities/strategy/model/types.ts` | `StrategyDcaConfig`, `DcaCondition`, `DcaExecution`, 응답·요청 타입 |
| `entities/strategy/model/dcaFormat.ts` (신규) | `formatDcaSchedule`, `formatDcaCondition`, `WEEKDAY_LABEL` 순수 함수 |
| `entities/strategy/api/index.ts` | `normalizeDca`, `reconfigureDca`, `listDcaExecutions` |
| `entities/strategy/model/queryKeys.ts` | `dcaExecutions` 키 |
| `entities/strategy/hooks/useStrategyQueries.ts` | `useReconfigureDcaMutation`, `useDcaExecutionsQuery` |
| `features/strategy/create-strategy/model/dcaFormSchema.ts` (신규) | DCA 폼 zod 스키마·기본값 |
| `features/strategy/create-strategy/model/buildDcaPayload.ts` (신규) | 폼 값을 요청 DTO로 변환 |
| `features/strategy/create-strategy/sections/DcaSettingsSection.tsx` (신규) | 방향·금액·주문유형·주기 입력 |
| `features/strategy/create-strategy/sections/DcaConditionsSection.tsx` (신규) | 조건 행 편집기 |
| `features/strategy/create-strategy/DcaStrategyForm.tsx` (신규) | DCA 폼 컨테이너(제출·mutation) |
| `features/strategy/create-strategy/StrategyForm.tsx` | DCA 분기 |
| `features/strategy/create-strategy/model/useStrategyForm.ts` | seed preview 쿼리를 DCA에서 끔 |
| `features/strategy/create-strategy/model/useStrategyFormEffects.ts`, `sections/ScheduledStartSection.tsx`, `shared/lib/format/index.ts` | 22:30을 22:00으로 문구·주석 수정 |
| `widgets/strategy-card/StrategyCard.tsx`, `DcaStrategyCard.tsx` (신규) | 카드 분기 |
| `widgets/strategy-detail/StrategyDetailContent.tsx`, `DcaStrategyDetail.tsx` (신규), `DcaExecutionHistory.tsx` (신규) | 상세 분기 + 회차 이력 |
| `app/(main)/accounts/[id]/strategies/[sid]/page.tsx` | DCA면 미리보기 prefetch를 생략 |
| `docs/agents/features.md`, `docs/agents/widgets.md`, `docs/agents/entities.md`, `README.md` | quirk 문서와 전략 목록 동기화 |

---

### Task 1: 타입 재생성 + 메타 타입 + 관리자 설정 DCA 행 + 백테스트 제외

**Files:**
- Modify: `shared/lib/api-types.ts`, `openapi.json` (생성물)
- Modify: `entities/meta/model/types.ts`, `entities/meta/providers/MetaProvider.tsx:24-27`
- Modify: `features/backtest/run-backtest/BacktestForm.tsx:30`
- Modify: `features/admin/settings/ui/AdminSettingsForm.tsx:27-28, 172-230`
- Test: `features/admin/settings/ui/AdminSettingsForm.test.tsx`

**Interfaces:**
- Produces: `StrategyTypeMeta.orderTypes/directions/frequencies/conditionIndicators: string[]`, `DcaIndicatorMeta`, `MetaBundle.orderTypes/orderDirections/dcaFrequencies/dcaOperators/dcaSkipReasons: EnumMeta[]`, `MetaBundle.dcaIndicators: DcaIndicatorMeta[]`
  - Task 4·5·6은 `labelOf('dcaFrequencies', code)` 형태로 라벨을 가져온다.

- [ ] **Step 1: openapi 재생성**

Run: `npm run fetch:spec && npm run gen:types`
Expected: `shared/lib/api-types.ts`의 `StrategyType`에 `"DCA"`가 추가된다. `git diff --stat`에 openapi.json과 api-types.ts가 나온다.

- [ ] **Step 2: 타입 오류 범위 확인**

Run: `npm run typecheck 2>&1 | grep -E "error TS" | head -30`
Expected: `RuntimeStrategyType`(= `StrategyType`)에 DCA가 추가돼 `AdminSettingsForm.tsx`의 `STRATEGY_LABELS: Record<RuntimeStrategyType, string>`에서 오류가 난다. 테스트 픽스처의 `strategies` 객체도 DCA 누락으로 오류가 날 수 있다. 목록을 메모해 두고 이 태스크 안에서 모두 고친다.

- [ ] **Step 3: 메타 타입 확장**

`entities/meta/model/types.ts`:

```ts
export interface StrategyTypeMeta {
  code: string
  description?: string
  availableTickers: string[]
  requiresPrivacyBase: boolean  // basePrice 소스가 기준매매표인지 (true=기준매매표, false=실시간 현재가)
  tickerFixed: boolean          // 티커 선택 불가 (단일 고정)
  supportsReverseMode: boolean  // 리버스모드 배지 표시 가능
  divisionCounts: number[]      // 분할 수 옵션 — 빈 배열이면 분할 개념 없음
  // DCA 전용 선택지(code 배열) — 기존 전략은 빈 배열
  orderTypes: string[]
  directions: string[]
  frequencies: string[]
  conditionIndicators: string[]
}

// DCA 조건 지표 메타 — SMA만 smaPeriods가 채워지고 나머지는 빈 배열
export interface DcaIndicatorMeta extends EnumMeta {
  smaPeriods: number[]
}

export interface MetaBundle {
  strategyTypes: StrategyTypeMeta[]
  tickers: TickerMeta[]
  brokers: EnumMeta[]
  strategyStatuses: EnumMeta[]
  cycleSeedTypes: EnumMeta[]
  assetClasses: EnumMeta[]
  markets: EnumMeta[]
  financeAccountTypes: EnumMeta[]
  financeCategoryTypes: EnumMeta[]
  orderTypes: EnumMeta[]
  orderDirections: EnumMeta[]
  dcaFrequencies: EnumMeta[]
  dcaOperators: EnumMeta[]
  dcaSkipReasons: EnumMeta[]
  dcaIndicators: DcaIndicatorMeta[]
}
```

`entities/meta/index.ts` export에 `DcaIndicatorMeta`를 추가한다:

```ts
export type { EnumMeta, StrategyTypeMeta, TickerMeta, MetaBundle, DcaIndicatorMeta } from './model/types'
```

그다음 `grep -rn "strategyTypes: \[\|MetaBundle = {" --include='*.ts*' . | grep -v node_modules`로 테스트용 메타 픽스처를 찾는다. 타입 오류가 나는 픽스처에는 새 필드를 빈 배열(`orderTypes: [], orderDirections: [], dcaFrequencies: [], dcaOperators: [], dcaSkipReasons: [], dcaIndicators: []`)로 추가한다. `StrategyTypeMeta` 픽스처에는 `orderTypes: [], directions: [], frequencies: [], conditionIndicators: []`를 추가한다.

- [ ] **Step 4: 관리자 폼 실패 테스트 작성**

`features/admin/settings/ui/AdminSettingsForm.test.tsx`의 기본 픽스처 `strategies`에 DCA를 추가한다:

```ts
    DCA: { enabled: false, fields: { ticker: { customizable: true, allowedValues: ['UPRO', 'QLD'], defaultValue: 'UPRO' } } },
```

테스트 추가(파일의 기존 render·저장 헬퍼와 같은 방식을 쓴다. 저장 mutation mock 이름은 파일 상단 정의를 따른다):

```ts
  it('DCA 전략 토글을 켜서 저장하면 strategies.DCA.enabled=true로 전송한다', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('switch', { name: 'DCA' }))
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledWith(expect.objectContaining({
      strategies: expect.objectContaining({ DCA: expect.objectContaining({ enabled: true }) }),
    })))
  })

  it('DCA 종목 필드 편집기를 렌더한다', () => {
    renderForm()
    expect(screen.getByRole('heading', { name: 'DCA 필드' })).toBeInTheDocument()
  })

  it('런타임 설정에 DCA 키가 없어도 크래시하지 않는다', () => {
    const { DCA: _omit, ...legacy } = settings.strategies
    renderForm({ ...settings, strategies: legacy as typeof settings.strategies })
    expect(screen.queryByRole('heading', { name: 'DCA 필드' })).not.toBeInTheDocument()
  })
```

`renderForm`, `settings`, `mutateAsyncMock`이 파일에 다른 이름으로 있으면 그 이름을 쓴다. `ToggleRow`가 `role="switch"`가 아니면 `getByLabelText('DCA')`로 바꾼다. 확인은 `sed -n 1,40p features/admin/settings/ui/ToggleRow.tsx`로 한다.

- [ ] **Step 5: 실패 확인**

Run: `npx vitest run features/admin/settings/ui/AdminSettingsForm.test.tsx`
Expected: FAIL. DCA 토글과 heading이 없다.

- [ ] **Step 6: 관리자 폼 구현**

`AdminSettingsForm.tsx`:

```tsx
const STRATEGY_LABELS: Record<RuntimeStrategyType, string> = {
  INFINITE: 'INFINITE', PRIVACY: 'PRIVACY', VR: 'VR', DCA: 'DCA',
}
```

"전략 생성" 토글 루프는 키가 없는 구버전 응답을 가드한다:

```tsx
          {(Object.keys(STRATEGY_LABELS) as RuntimeStrategyType[])
            .filter((strategy) => draft.strategies[strategy])
            .map((strategy) => (
              <ToggleRow key={strategy} id={`strategy-${strategy}`} label={STRATEGY_LABELS[strategy]}
                checked={draft.strategies[strategy].enabled} onChange={(enabled) => setStrategyEnabled(strategy, enabled)} />
            ))}
```

VR 필드 `<section>` 바로 뒤에 다음을 추가한다(`tickerSuggestions`와 `normalizeSymbol`은 INFINITE 섹션과 같은 것을 재사용):

```tsx
        {draft.strategies.DCA && (
          <section className="border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-base font-bold">DCA 필드</h2>
            <FieldEditor
              id="dca-ticker"
              label="종목"
              field={draft.strategies.DCA.fields.ticker}
              error={attempted ? errors['DCA.ticker'] : undefined}
              suggestions={['UPRO', 'QLD']}
              normalize={normalizeSymbol}
              onChange={(value) => setStrategyField('DCA', 'ticker', value)}
            />
          </section>
        )}
```

`validateAdminSettings`는 `Object.entries(settings.strategies)`를 순회하므로 수정하지 않는다. 허용 티커가 capability를 벗어나면 서버가 400을 반환하고, 기존 저장 실패 토스트로 표시된다.

- [ ] **Step 7: 메타 누락 가드 + 백테스트 DCA 제외**

`MetaProvider.tsx` `labelOf`: `getMetaBundle`은 1시간 동안 캐시된다. 신규 키가 없는 구버전 응답이 캐시에 남아 있어도 `undefined.find`로 크래시하지 않게 가드한다.

```tsx
    labelOf: (category, code) => {
      const items = (meta[category] ?? []) as { code: string; label: string }[]
      return items.find(i => i.code === code)?.label ?? code
    },
```

`BacktestForm.tsx:30`:

```tsx
            {/* 백엔드 백테스트는 DCA 미지원(spec 3.5) — 지원 추가 시 필터 제거 */}
            {form.meta.strategyTypes.filter((t) => t.code !== 'DCA').map((t) => {
```

`features/backtest/run-backtest`에 테스트가 있으면(`ls features/backtest/run-backtest/*.test.tsx`) 메타 픽스처에 DCA 유형을 추가하고 다음 단언을 넣는다:

```tsx
  it('DCA 유형은 백테스트 선택지에 없다', () => {
    renderBacktestForm()
    expect(screen.queryByText('DCA')).not.toBeInTheDocument()
  })
```

(`renderBacktestForm`은 그 파일의 기존 render 헬퍼 이름을 쓴다.)

- [ ] **Step 8: 통과 확인**

Run: `npx vitest run features/admin/settings features/backtest entities/meta`
Expected: PASS

- [ ] **Step 9: 리뷰어 통과 후 커밋**

```bash
git add openapi.json shared/lib/api-types.ts entities/meta features/admin/settings features/backtest
git commit -m "feat(admin): 런타임 설정에 DCA 전략 토글·종목 필드 추가, 메타 타입 확장, 백테스트에서 DCA 제외"
```

(Step 3에서 고친 테스트 픽스처 파일도 함께 add한다.)

---

### Task 2: entities/strategy — DCA 타입·normalizer·API·훅·포매터

**Files:**
- Modify: `entities/strategy/model/types.ts`
- Create: `entities/strategy/model/dcaFormat.ts`, `entities/strategy/model/dcaFormat.test.ts`
- Modify: `entities/strategy/api/index.ts`, `entities/strategy/api/index.test.ts`
- Modify: `entities/strategy/model/queryKeys.ts`
- Modify: `entities/strategy/hooks/useStrategyQueries.ts`
- Modify: `entities/strategy/index.ts`

**Interfaces:**
- Produces (Task 3~6이 사용):

```ts
export type DcaDirection = 'BUY' | 'SELL'
export type DcaOrderType = 'MOO' | 'MOC'
export type DcaFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type DcaWeekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY'
export type DcaIndicator = 'AVG_PRICE' | 'SMA' | 'RSI' | 'FEAR_GREED'
export type DcaOperator = 'LTE' | 'LT' | 'GTE' | 'GT'
export interface DcaCondition { indicator: DcaIndicator; operator: DcaOperator; threshold?: number; smaPeriod?: number }
export interface DcaConfigRequest { direction: DcaDirection; amountUsd: number; orderType: DcaOrderType; frequency: DcaFrequency; dayOfWeek: DcaWeekday | null; dayOfMonth: number | null; conditions: DcaCondition[] }
export interface StrategyDcaSummary extends DcaConfigRequest { nextExecution: { usSessionDate: string; kstTradeDate: string } | null; lastExecution: { kstTradeDate: string; status: string; skipReason: string | null } | null }
export interface DcaExecution { kstTradeDate: string; usSessionDate?: string; status: string; skipReason: string | null; detail: string | null; referencePrice?: number; quantity?: number; order: { id: string; status: string; filledQuantity?: number; filledPrice?: number } | null }
export interface DcaExecutionPage { content: DcaExecution[]; page: number; size: number; totalElements: number }
// Strategy.dca?: StrategyDcaSummary, StrategyRequest.dca?: DcaConfigRequest
reconfigureDca(id: string, data: DcaConfigRequest, token?: string): Promise<Strategy>
listDcaExecutions(id: string, page: number, size: number, token?: string): Promise<DcaExecutionPage>
strategyKeys.dcaExecutions(id: string, page: number, size: number)
useReconfigureDcaMutation(strategyId: string, onSuccess?: () => void | Promise<void>)
useDcaExecutionsQuery(strategyId: string, page: number, size: number)
WEEKDAY_LABEL: Record<DcaWeekday, string>
formatDcaSchedule(dca: Pick<DcaConfigRequest, 'frequency' | 'dayOfWeek' | 'dayOfMonth'>, frequencyLabel: string): string
formatDcaCondition(c: DcaCondition, indicatorLabel: string, operatorLabel: string): string
```

- [ ] **Step 1: 포매터 실패 테스트 작성**

`entities/strategy/model/dcaFormat.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatDcaCondition, formatDcaSchedule } from './dcaFormat'

describe('formatDcaSchedule', () => {
  it('DAILY는 빈도 라벨만', () => {
    expect(formatDcaSchedule({ frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null }, '매일')).toBe('매일')
  })
  it('WEEKLY는 요일 한글명', () => {
    expect(formatDcaSchedule({ frequency: 'WEEKLY', dayOfWeek: 'MONDAY', dayOfMonth: null }, '매주')).toBe('매주 월요일')
  })
  it('MONTHLY + 숫자는 n일', () => {
    expect(formatDcaSchedule({ frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: 31 }, '매월')).toBe('매월 31일')
  })
  it('MONTHLY + null은 말일', () => {
    expect(formatDcaSchedule({ frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null }, '매월')).toBe('매월 말일')
  })
})

describe('formatDcaCondition', () => {
  it('평단가는 부호 있는 %', () => {
    expect(formatDcaCondition({ indicator: 'AVG_PRICE', operator: 'LTE', threshold: -5 }, '평단가', '이하')).toBe('평단가 -5% 이하')
    expect(formatDcaCondition({ indicator: 'AVG_PRICE', operator: 'GTE', threshold: 20 }, '평단가', '이상')).toBe('평단가 +20% 이상')
  })
  it('SMA는 기간만, threshold 없음', () => {
    expect(formatDcaCondition({ indicator: 'SMA', operator: 'LT', smaPeriod: 200 }, '이동평균선', '미만')).toBe('이동평균선(200) 미만')
  })
  it('RSI·공포탐욕은 숫자', () => {
    expect(formatDcaCondition({ indicator: 'RSI', operator: 'LTE', threshold: 35 }, 'RSI(14)', '이하')).toBe('RSI(14) 35 이하')
    expect(formatDcaCondition({ indicator: 'FEAR_GREED', operator: 'LT', threshold: 25 }, '공포탐욕지수(CNN)', '미만')).toBe('공포탐욕지수(CNN) 25 미만')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run entities/strategy/model/dcaFormat.test.ts`
Expected: FAIL with "Failed to resolve import './dcaFormat'"

- [ ] **Step 3: 타입 추가**

`entities/strategy/model/types.ts`에서 `Strategy` 인터페이스 위에 위 Interfaces 블록의 타입 선언(함수 시그니처 제외)을 그대로 추가한다. 블록 위에는 다음 주석을 단다:

```ts
// DCA(정기 적립식) — 코드 값은 kista-api 계약(spec 7장) 그대로. 라벨은 메타(labelOf)가 SSOT
```

`Strategy`에는 다음을 추가한다:

```ts
  dca?: StrategyDcaSummary // DCA 전략 전용 설정·다음 판정일·최근 결과 (타 전략 undefined)
```

`StrategyRequest`에는 다음을 추가한다:

```ts
  dca?: DcaConfigRequest      // DCA 전용: type=DCA일 때 필수 (나머지 시드·분할·VR 필드는 서버가 무시)
```

- [ ] **Step 4: 포매터 구현**

`entities/strategy/model/dcaFormat.ts`:

```ts
import type { DcaCondition, DcaConfigRequest, DcaWeekday } from './types'

// java DayOfWeek 이름이라 메타에 없음 — 요일 한글명만 로컬 상수
export const WEEKDAY_LABEL: Record<DcaWeekday, string> = {
  MONDAY: '월요일',
  TUESDAY: '화요일',
  WEDNESDAY: '수요일',
  THURSDAY: '목요일',
  FRIDAY: '금요일',
}

export function formatDcaSchedule(
  dca: Pick<DcaConfigRequest, 'frequency' | 'dayOfWeek' | 'dayOfMonth'>,
  frequencyLabel: string,
): string {
  if (dca.frequency === 'WEEKLY' && dca.dayOfWeek) return `${frequencyLabel} ${WEEKDAY_LABEL[dca.dayOfWeek]}`
  if (dca.frequency === 'MONTHLY') return `${frequencyLabel} ${dca.dayOfMonth == null ? '말일' : `${dca.dayOfMonth}일`}`
  return frequencyLabel
}

export function formatDcaCondition(c: DcaCondition, indicatorLabel: string, operatorLabel: string): string {
  if (c.indicator === 'SMA') return `${indicatorLabel}(${c.smaPeriod}) ${operatorLabel}`
  if (c.indicator === 'AVG_PRICE') {
    const t = c.threshold ?? 0
    return `${indicatorLabel} ${t > 0 ? '+' : ''}${t}% ${operatorLabel}`
  }
  return `${indicatorLabel} ${c.threshold} ${operatorLabel}`
}
```

- [ ] **Step 5: 포매터 통과 확인**

Run: `npx vitest run entities/strategy/model/dcaFormat.test.ts`
Expected: PASS

- [ ] **Step 6: API normalizer 실패 테스트 작성**

`entities/strategy/api/index.test.ts`에 추가한다. 파일 상단의 기존 fetch mock 방식(`vi.spyOn(globalThis, 'fetch')` 또는 `fetchEither` mock)을 따르고, 응답 JSON은 다음을 쓴다:

```ts
  it('DCA 응답의 dca 객체를 정규화한다 (금액 문자열 → number, 말일 null 유지)', async () => {
    mockResponse([{
      id: 's1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false,
      currentHoldings: 12,
      dca: {
        direction: 'BUY', amountUsd: '300.00', orderType: 'MOC', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null,
        conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: '35' }, { indicator: 'SMA', operator: 'LT', threshold: null, smaPeriod: 200 }],
        nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' },
        lastExecution: null,
      },
    }])
    const [s] = await listStrategies('a1')
    expect(s.dca).toEqual({
      direction: 'BUY', amountUsd: 300, orderType: 'MOC', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null,
      conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 35 }, { indicator: 'SMA', operator: 'LT', smaPeriod: 200 }],
      nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' },
      lastExecution: null,
    })
  })

  it('비DCA 응답은 dca undefined', async () => {
    mockResponse([{ id: 's2', accountId: 'a1', type: 'INFINITE', status: 'ACTIVE', ticker: 'TQQQ', cycleSeedType: 'MAX', isReverseMode: false, dca: null }])
    const [s] = await listStrategies('a1')
    expect(s.dca).toBeUndefined()
  })

  it('reconfigureDca는 PUT /dca-config로 dca 객체만 보낸다', async () => {
    const fetchSpy = mockResponse({ id: 's1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false, dca: null })
    const body = { direction: 'BUY' as const, amountUsd: 100, orderType: 'MOO' as const, frequency: 'DAILY' as const, dayOfWeek: null, dayOfMonth: null, conditions: [] }
    await reconfigureDca('s1', body)
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/trading-cycles/s1/dca-config'), expect.objectContaining({ method: 'PUT', body: JSON.stringify(body) }))
  })

  it('listDcaExecutions는 page·size 쿼리로 조회하고 숫자를 정규화한다', async () => {
    mockResponse({ content: [{ kstTradeDate: '2026-09-30', usSessionDate: '2026-09-29', status: 'ORDERED', skipReason: null, detail: null, referencePrice: '87.12', quantity: 3, order: { id: 'o1', status: 'FILLED', filledQuantity: 3, filledPrice: '87.40' } }], page: 0, size: 20, totalElements: 1 })
    const res = await listDcaExecutions('s1', 0, 20)
    expect(res.content[0]).toMatchObject({ referencePrice: 87.12, quantity: 3, order: { filledPrice: 87.4 } })
    expect(res.totalElements).toBe(1)
  })
```

`mockResponse`는 해당 파일의 기존 mock 헬퍼 이름으로 바꾼다. 헬퍼가 없으면 파일 첫 테스트의 fetch mock 패턴을 이 4개 테스트에 그대로 복제한다.

- [ ] **Step 7: 실패 확인**

Run: `npx vitest run entities/strategy/api/index.test.ts`
Expected: FAIL. `reconfigureDca`와 `listDcaExecutions`가 없고 `s.dca`가 undefined다.

- [ ] **Step 8: API 구현**

`entities/strategy/api/index.ts`: import에 DCA 타입을 추가하고, `normalizeVrSummary` 아래에 다음을 추가한다:

```ts
function normalizeDcaCondition(raw: unknown): DcaCondition {
  const c = raw as Record<string, unknown>
  return {
    indicator: str(c.indicator) as DcaIndicator,
    operator: str(c.operator) as DcaOperator,
    ...(c.threshold != null ? { threshold: dec(c.threshold) } : {}),
    ...(c.smaPeriod != null ? { smaPeriod: num(c.smaPeriod) } : {}),
  }
}

function normalizeDca(raw: unknown): StrategyDcaSummary | undefined {
  if (raw == null) return undefined
  const d = raw as Record<string, unknown>
  const next = d.nextExecution as Record<string, unknown> | null | undefined
  const last = d.lastExecution as Record<string, unknown> | null | undefined
  return {
    direction: str(d.direction) as DcaDirection,
    amountUsd: dec(d.amountUsd),
    orderType: str(d.orderType) as DcaOrderType,
    frequency: str(d.frequency) as DcaFrequency,
    dayOfWeek: (d.dayOfWeek as DcaWeekday | null) ?? null,
    dayOfMonth: d.dayOfMonth != null ? num(d.dayOfMonth) : null,
    conditions: ((d.conditions as unknown[] | undefined) ?? []).map(normalizeDcaCondition),
    nextExecution: next ? { usSessionDate: str(next.usSessionDate), kstTradeDate: str(next.kstTradeDate) } : null,
    lastExecution: last
      ? { kstTradeDate: str(last.kstTradeDate), status: str(last.status), skipReason: optStr(last.skipReason) ?? null }
      : null,
  }
}

function normalizeDcaExecution(raw: unknown): DcaExecution {
  const e = raw as Record<string, unknown>
  const o = e.order as Record<string, unknown> | null | undefined
  return {
    kstTradeDate: str(e.kstTradeDate),
    usSessionDate: optStr(e.usSessionDate),
    status: str(e.status),
    skipReason: optStr(e.skipReason) ?? null,
    detail: optStr(e.detail) ?? null,
    referencePrice: optDec(e.referencePrice),
    quantity: optNum(e.quantity),
    order: o
      ? { id: str(o.id), status: str(o.status), filledQuantity: optNum(o.filledQuantity), filledPrice: optDec(o.filledPrice) }
      : null,
  }
}
```

`normalizeStrategy`의 반환 객체에서 `vr:` 아래에 `dca: normalizeDca(s.dca),`를 추가한다. `reconfigureVr` 아래에는 다음을 추가한다:

```ts
export async function reconfigureDca(id: string, data: DcaConfigRequest, token?: string): Promise<Strategy> {
  const raw = await fetchEither<unknown>(`/api/trading-cycles/${id}/dca-config`, jsonBody('PUT', data), token)
  return normalizeStrategy(raw)
}

export async function listDcaExecutions(id: string, page: number, size: number, token?: string): Promise<DcaExecutionPage> {
  const qs = new URLSearchParams({ page: String(page), size: String(size) }).toString()
  const raw = await fetchEither<Record<string, unknown>>(`/api/trading-cycles/${id}/dca-executions?${qs}`, undefined, token)
  return {
    content: ((raw.content as unknown[] | undefined) ?? []).map(normalizeDcaExecution),
    page: num(raw.page),
    size: num(raw.size),
    totalElements: num(raw.totalElements),
  }
}
```

- [ ] **Step 9: queryKey·훅 추가**

`entities/strategy/model/queryKeys.ts`의 `strategyKeys`에 다음을 추가한다:

```ts
  dcaExecutions: (id: string, page: number, size: number) => [...strategyKeys.all, 'dca-executions', id, page, size] as const,
```

`entities/strategy/hooks/useStrategyQueries.ts`: import에 `reconfigureDca`, `listDcaExecutions`, `DcaConfigRequest`, `DcaExecutionPage`를 추가하고 `useReconfigureVrMutation` 아래에 다음을 추가한다:

```ts
export function useReconfigureDcaMutation(strategyId: string, onSuccess?: () => void | Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: DcaConfigRequest) => reconfigureDca(strategyId, data),
    onSuccess: async (saved) => {
      queryClient.setQueryData(strategyKeys.detail(saved.id), saved)
      await synchronizeStrategyLists(queryClient, saved.accountId, (strategies) => upsertById(strategies, saved))
      return onSuccess?.()
    },
    onError: (err) => toast.error(apiMsg(err, '저장에 실패했습니다.')),
  })
}

export function useDcaExecutionsQuery(strategyId: string, page: number, size: number) {
  return useQuery<DcaExecutionPage>({
    queryKey: strategyKeys.dcaExecutions(strategyId, page, size),
    queryFn: () => listDcaExecutions(strategyId, page, size),
  })
}
```

- [ ] **Step 10: barrel export**

`entities/strategy/index.ts`:
- type export에 `DcaCondition`, `DcaConfigRequest`, `DcaDirection`, `DcaExecution`, `DcaExecutionPage`, `DcaFrequency`, `DcaIndicator`, `DcaOperator`, `DcaOrderType`, `DcaWeekday`, `StrategyDcaSummary`를 추가한다.
- `export { formatDcaCondition, formatDcaSchedule, WEEKDAY_LABEL } from './model/dcaFormat'`를 추가한다.
- api export에 `reconfigureDca`, `listDcaExecutions`를 추가한다.
- hooks export에 `useReconfigureDcaMutation`, `useDcaExecutionsQuery`를 추가한다.

- [ ] **Step 11: 통과 확인**

Run: `npx vitest run entities/strategy`
Expected: PASS

- [ ] **Step 12: 리뷰어 통과 후 커밋**

```bash
git add entities/strategy
git commit -m "feat(strategy): DCA 전략 타입·정규화·dca-config 수정·회차 이력 조회 추가"
```

---

### Task 3: DCA 폼 모델 — zod 스키마·payload 조립

**Files:**
- Create: `features/strategy/create-strategy/model/dcaFormSchema.ts`, `dcaFormSchema.test.ts`
- Create: `features/strategy/create-strategy/model/buildDcaPayload.ts`, `buildDcaPayload.test.ts`

**Interfaces:**
- Consumes: Task 2의 `DcaConfigRequest`, `DcaCondition`, `Strategy`, `StrategyRequest`
- Produces (Task 4가 사용):

```ts
export const LAST_DAY = 'LAST'
export const dcaFormSchema: z.ZodType<DcaFormValues>
export interface DcaFormValues { ticker: string; direction: 'BUY' | 'SELL'; amountUsd: number | null; orderType: 'MOO' | 'MOC'; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'; dayOfWeek: DcaWeekday | null; dayOfMonth: string | null; scheduledStartDate: string | null; conditions: DcaConditionFormValue[] }
export interface DcaConditionFormValue { indicator: DcaIndicator; operator: DcaOperator; threshold: number | null; smaPeriod: number | null }
export function buildDcaFormDefaults(initial: Strategy | undefined, defaultTicker: string): DcaFormValues
export function buildDcaConfig(values: DcaFormValues): DcaConfigRequest
export function buildDcaCreatePayload(values: DcaFormValues): StrategyRequest
```

- [ ] **Step 1: 스키마 실패 테스트 작성**

`dcaFormSchema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { dcaFormSchema, type DcaFormValues } from './dcaFormSchema'

const base: DcaFormValues = {
  ticker: 'UPRO', direction: 'BUY', amountUsd: 300, orderType: 'MOC', frequency: 'DAILY',
  dayOfWeek: null, dayOfMonth: null, scheduledStartDate: null, conditions: [],
}

const ok = (v: Partial<DcaFormValues>) => dcaFormSchema.safeParse({ ...base, ...v }).success

describe('dcaFormSchema', () => {
  it('기본값 통과', () => expect(ok({})).toBe(true))
  it('금액 0·null 거부', () => {
    expect(ok({ amountUsd: 0 })).toBe(false)
    expect(ok({ amountUsd: null })).toBe(false)
  })
  it('WEEKLY는 요일 필수', () => {
    expect(ok({ frequency: 'WEEKLY' })).toBe(false)
    expect(ok({ frequency: 'WEEKLY', dayOfWeek: 'MONDAY' })).toBe(true)
  })
  it('MONTHLY는 날짜 필수 (LAST 또는 1~31)', () => {
    expect(ok({ frequency: 'MONTHLY' })).toBe(false)
    expect(ok({ frequency: 'MONTHLY', dayOfMonth: 'LAST' })).toBe(true)
    expect(ok({ frequency: 'MONTHLY', dayOfMonth: '31' })).toBe(true)
  })
  it('RSI·FEAR_GREED는 0~100', () => {
    expect(ok({ conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 101, smaPeriod: null }] })).toBe(false)
    expect(ok({ conditions: [{ indicator: 'FEAR_GREED', operator: 'LTE', threshold: -1, smaPeriod: null }] })).toBe(false)
    expect(ok({ conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 35, smaPeriod: null }] })).toBe(true)
  })
  it('AVG_PRICE는 숫자 필수, 음수 허용', () => {
    expect(ok({ conditions: [{ indicator: 'AVG_PRICE', operator: 'LTE', threshold: null, smaPeriod: null }] })).toBe(false)
    expect(ok({ conditions: [{ indicator: 'AVG_PRICE', operator: 'LTE', threshold: -5, smaPeriod: null }] })).toBe(true)
  })
  it('SMA는 기간 필수, threshold 무관', () => {
    expect(ok({ conditions: [{ indicator: 'SMA', operator: 'LT', threshold: null, smaPeriod: null }] })).toBe(false)
    expect(ok({ conditions: [{ indicator: 'SMA', operator: 'LT', threshold: 999, smaPeriod: 200 }] })).toBe(true)
  })
})
```

- [ ] **Step 2: payload 실패 테스트 작성**

`buildDcaPayload.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildDcaConfig, buildDcaCreatePayload } from './buildDcaPayload'
import type { DcaFormValues } from './dcaFormSchema'

const base: DcaFormValues = {
  ticker: 'QLD', direction: 'SELL', amountUsd: 150, orderType: 'MOO', frequency: 'MONTHLY',
  dayOfWeek: 'TUESDAY', dayOfMonth: 'LAST', scheduledStartDate: null, conditions: [],
}

describe('buildDcaConfig', () => {
  it('말일(LAST)은 dayOfMonth null, MONTHLY면 남아 있던 dayOfWeek는 null', () => {
    expect(buildDcaConfig(base)).toEqual({
      direction: 'SELL', amountUsd: 150, orderType: 'MOO', frequency: 'MONTHLY',
      dayOfWeek: null, dayOfMonth: null, conditions: [],
    })
  })
  it('29~31은 숫자 그대로', () => {
    expect(buildDcaConfig({ ...base, dayOfMonth: '30' }).dayOfMonth).toBe(30)
  })
  it('WEEKLY면 dayOfMonth null, dayOfWeek 유지', () => {
    const c = buildDcaConfig({ ...base, frequency: 'WEEKLY', dayOfMonth: '15' })
    expect(c.dayOfWeek).toBe('TUESDAY')
    expect(c.dayOfMonth).toBeNull()
  })
  it('DAILY면 둘 다 null', () => {
    const c = buildDcaConfig({ ...base, frequency: 'DAILY' })
    expect(c.dayOfWeek).toBeNull()
    expect(c.dayOfMonth).toBeNull()
  })
  it('SMA 조건은 threshold 제외·smaPeriod만, 그 외는 smaPeriod 제외', () => {
    const c = buildDcaConfig({ ...base, conditions: [
      { indicator: 'SMA', operator: 'LT', threshold: 35, smaPeriod: 200 },
      { indicator: 'RSI', operator: 'LTE', threshold: 35, smaPeriod: 50 },
    ] })
    expect(c.conditions).toEqual([
      { indicator: 'SMA', operator: 'LT', smaPeriod: 200 },
      { indicator: 'RSI', operator: 'LTE', threshold: 35 },
    ])
  })
})

describe('buildDcaCreatePayload', () => {
  it('type=DCA·ticker·dca만, 시작예정일 없으면 생략', () => {
    expect(buildDcaCreatePayload(base)).toEqual({
      type: 'DCA', ticker: 'QLD', cycleSeedType: 'NONE', dca: buildDcaConfig(base),
    })
  })
  it('시작예정일 있으면 포함', () => {
    expect(buildDcaCreatePayload({ ...base, scheduledStartDate: '2026-10-20' }).scheduledStartDate).toBe('2026-10-20')
  })
})
```

`cycleSeedType: 'NONE'`을 넣는 이유: `StrategyRequest.cycleSeedType`이 필수 필드라 타입 충족용으로 넣는다. 서버는 DCA에서 이 값을 무시한다.

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run features/strategy/create-strategy/model/dcaFormSchema.test.ts features/strategy/create-strategy/model/buildDcaPayload.test.ts`
Expected: FAIL. 모듈이 없다.

- [ ] **Step 4: 스키마 구현**

`dcaFormSchema.ts`:

```ts
import { z } from 'zod'
import type { DcaWeekday, Strategy } from '@entities/strategy'

export const LAST_DAY = 'LAST' // 매월 말일 — payload에서 dayOfMonth null로 직렬화

const conditionSchema = z.object({
  indicator: z.enum(['AVG_PRICE', 'SMA', 'RSI', 'FEAR_GREED']),
  operator: z.enum(['LTE', 'LT', 'GTE', 'GT']),
  threshold: z.number().nullable(),
  smaPeriod: z.number().int().nullable(),
}).superRefine((c, ctx) => {
  if (c.indicator === 'SMA') {
    if (c.smaPeriod == null) ctx.addIssue({ code: 'custom', path: ['smaPeriod'], message: '이동평균 기간을 선택하세요.' })
    return
  }
  if (c.threshold == null) {
    ctx.addIssue({ code: 'custom', path: ['threshold'], message: '기준값을 입력하세요.' })
    return
  }
  if ((c.indicator === 'RSI' || c.indicator === 'FEAR_GREED') && (c.threshold < 0 || c.threshold > 100)) {
    ctx.addIssue({ code: 'custom', path: ['threshold'], message: '0~100 사이로 입력하세요.' })
  }
})

export const dcaFormSchema = z.object({
  ticker: z.string().min(1, '종목을 선택하세요'),
  direction: z.enum(['BUY', 'SELL']),
  amountUsd: z.number().positive('금액은 0보다 커야 합니다.').nullable()
    .refine((v) => v != null, '금액을 입력하세요.'),
  orderType: z.enum(['MOO', 'MOC']),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']).nullable(),
  dayOfMonth: z.string().nullable(),
  scheduledStartDate: z.string().nullable(),
  conditions: z.array(conditionSchema),
}).superRefine((v, ctx) => {
  if (v.frequency === 'WEEKLY' && !v.dayOfWeek) {
    ctx.addIssue({ code: 'custom', path: ['dayOfWeek'], message: '요일을 선택하세요.' })
  }
  if (v.frequency === 'MONTHLY' && !v.dayOfMonth) {
    ctx.addIssue({ code: 'custom', path: ['dayOfMonth'], message: '날짜를 선택하세요.' })
  }
})

export type DcaFormValues = z.infer<typeof dcaFormSchema>
export type DcaConditionFormValue = DcaFormValues['conditions'][number]

export function buildDcaFormDefaults(initial: Strategy | undefined, defaultTicker: string): DcaFormValues {
  const d = initial?.dca
  if (!initial || !d) {
    return {
      ticker: defaultTicker, direction: 'BUY', amountUsd: null, orderType: 'MOC', frequency: 'MONTHLY',
      dayOfWeek: null, dayOfMonth: LAST_DAY, scheduledStartDate: null, conditions: [],
    }
  }
  return {
    ticker: initial.ticker,
    direction: d.direction,
    amountUsd: d.amountUsd,
    orderType: d.orderType,
    frequency: d.frequency,
    dayOfWeek: (d.dayOfWeek as DcaWeekday | null) ?? null,
    dayOfMonth: d.frequency === 'MONTHLY' ? (d.dayOfMonth == null ? LAST_DAY : String(d.dayOfMonth)) : null,
    scheduledStartDate: null,
    conditions: d.conditions.map((c) => ({
      indicator: c.indicator, operator: c.operator, threshold: c.threshold ?? null, smaPeriod: c.smaPeriod ?? null,
    })),
  }
}
```

- [ ] **Step 5: payload 구현**

`buildDcaPayload.ts`:

```ts
import type { DcaCondition, DcaConfigRequest, StrategyRequest } from '@entities/strategy'
import { LAST_DAY, type DcaConditionFormValue, type DcaFormValues } from './dcaFormSchema'

function toCondition(c: DcaConditionFormValue): DcaCondition {
  return c.indicator === 'SMA'
    ? { indicator: c.indicator, operator: c.operator, smaPeriod: c.smaPeriod ?? undefined }
    : { indicator: c.indicator, operator: c.operator, threshold: c.threshold ?? undefined }
}

// 주기 전환 후 남은 요일/날짜 값은 해당 주기가 아니면 null로 버린다
export function buildDcaConfig(v: DcaFormValues): DcaConfigRequest {
  return {
    direction: v.direction,
    amountUsd: v.amountUsd ?? 0,
    orderType: v.orderType,
    frequency: v.frequency,
    dayOfWeek: v.frequency === 'WEEKLY' ? v.dayOfWeek : null,
    dayOfMonth: v.frequency === 'MONTHLY' && v.dayOfMonth && v.dayOfMonth !== LAST_DAY ? Number(v.dayOfMonth) : null,
    conditions: v.conditions.map(toCondition),
  }
}

export function buildDcaCreatePayload(v: DcaFormValues): StrategyRequest {
  return {
    type: 'DCA',
    ticker: v.ticker,
    cycleSeedType: 'NONE', // 필수 필드 충족용 — DCA는 서버가 무시
    ...(v.scheduledStartDate ? { scheduledStartDate: v.scheduledStartDate } : {}),
    dca: buildDcaConfig(v),
  }
}
```

- [ ] **Step 6: 통과 확인**

Run: `npx vitest run features/strategy/create-strategy/model/dcaFormSchema.test.ts features/strategy/create-strategy/model/buildDcaPayload.test.ts`
Expected: PASS. `buildDcaCreatePayload` 첫 테스트의 `toEqual`은 `scheduledStartDate` 키가 없어야 통과한다.

- [ ] **Step 7: 리뷰어 통과 후 커밋**

```bash
git add features/strategy/create-strategy/model/dcaFormSchema.ts features/strategy/create-strategy/model/dcaFormSchema.test.ts features/strategy/create-strategy/model/buildDcaPayload.ts features/strategy/create-strategy/model/buildDcaPayload.test.ts
git commit -m "feat(strategy): DCA 등록 폼 스키마·요청 조립 추가"
```

---

### Task 4: DCA 폼 UI — 섹션·DcaStrategyForm·StrategyForm 분기·22:00 문구

**Files:**
- Create: `features/strategy/create-strategy/sections/DcaSettingsSection.tsx`, `DcaSettingsSection.test.tsx`
- Create: `features/strategy/create-strategy/sections/DcaConditionsSection.tsx`, `DcaConditionsSection.test.tsx`
- Create: `features/strategy/create-strategy/DcaStrategyForm.tsx`, `DcaStrategyForm.test.tsx`
- Modify: `features/strategy/create-strategy/StrategyForm.tsx`, `StrategyForm.test.tsx`
- Modify: `features/strategy/create-strategy/model/useStrategyForm.ts:165-169`
- Modify: `features/strategy/create-strategy/model/useStrategyFormEffects.ts:26-29`, `sections/ScheduledStartSection.tsx:12`, `shared/lib/format/index.ts:87`

**Interfaces:**
- Consumes:
  - Task 1: `useMeta().labelOf`, `findStrategyType(code).orderTypes|directions|frequencies|conditionIndicators`, `meta.dcaIndicators[].smaPeriods`, `meta.dcaOperators`
  - Task 2: `useCreateStrategyMutation`, `useReconfigureDcaMutation`, `WEEKDAY_LABEL`
  - Task 3: `dcaFormSchema`, `buildDcaFormDefaults`, `buildDcaConfig`, `buildDcaCreatePayload`, `LAST_DAY`
- Produces:
  - `DcaStrategyForm({ accountId, broker, initial, availableTickers, onSuccess, onCancel })`
  - `DcaSettingsSection({ form, isEdit, broker, orderTypes, directions, frequencies })`
  - `DcaConditionsSection({ form, indicators, direction })`
  - `form`은 `UseFormReturn<DcaFormValues>`다.

UI 원칙:
- 선택형은 기존 섹션처럼 `SelectionCard`(`@shared/ui/selection-card`)를 쓰고 드롭다운은 shadcn `Select`를 쓴다.
- 섹션 래퍼는 `py-[18px] border-b border-border`, 라벨은 `StrategyFieldLabel`로 기존 섹션 스타일을 그대로 따른다.
- 새 문구를 확정하기 전에 `grep -rn "<키워드>" --include="*.tsx" features widgets`로 비슷한 기존 문구가 있으면 재사용한다.

- [ ] **Step 1: DcaSettingsSection 실패 테스트 작성**

공용 테스트 메타 픽스처를 먼저 만든다. Task 4·5·6 테스트가 같이 쓴다. 필수 키는 Task 1 타입을 따르고 나머지는 빈 배열로 둔다.

`features/strategy/create-strategy/sections/__fixtures__/dcaTestMeta.ts`:

```ts
import type { MetaBundle } from '@entities/meta'

export const dcaTestMeta = {
  strategyTypes: [], tickers: [], brokers: [], strategyStatuses: [], cycleSeedTypes: [], assetClasses: [], markets: [],
  financeAccountTypes: [], financeCategoryTypes: [],
  orderTypes: [{ code: 'MOO', label: '장 시작 시장가' }, { code: 'MOC', label: '장 마감 시장가' }],
  orderDirections: [{ code: 'BUY', label: '매수' }, { code: 'SELL', label: '매도' }],
  dcaFrequencies: [{ code: 'DAILY', label: '매일' }, { code: 'WEEKLY', label: '매주' }, { code: 'MONTHLY', label: '매월' }],
  dcaOperators: [{ code: 'LTE', label: '이하' }, { code: 'LT', label: '미만' }, { code: 'GTE', label: '이상' }, { code: 'GT', label: '초과' }],
  dcaSkipReasons: [],
  dcaIndicators: [
    { code: 'AVG_PRICE', label: '평단가', smaPeriods: [] },
    { code: 'SMA', label: '이동평균선', smaPeriods: [20, 50, 120, 200] },
    { code: 'RSI', label: 'RSI(14)', smaPeriods: [] },
    { code: 'FEAR_GREED', label: '공포탐욕지수(CNN)', smaPeriods: [] },
  ],
} satisfies MetaBundle
```

`DcaSettingsSection.test.tsx`. RHF는 아래 Harness 래퍼로 쓴다:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { MetaProvider } from '@entities/meta'
import { DcaSettingsSection } from './DcaSettingsSection'
import { buildDcaFormDefaults, type DcaFormValues } from '../model/dcaFormSchema'
import { dcaTestMeta } from './__fixtures__/dcaTestMeta'

function Harness({ isEdit = false, broker = 'KIS', defaults }: { isEdit?: boolean; broker?: string; defaults?: Partial<DcaFormValues> }) {
  const form = useForm<DcaFormValues>({ defaultValues: { ...buildDcaFormDefaults(undefined, 'UPRO'), ...defaults } })
  return (
    <MetaProvider meta={dcaTestMeta}>
      <DcaSettingsSection form={form} isEdit={isEdit} broker={broker}
        orderTypes={['MOO', 'MOC']} directions={['BUY', 'SELL']} frequencies={['DAILY', 'WEEKLY', 'MONTHLY']} />
    </MetaProvider>
  )
}

describe('DcaSettingsSection', () => {
  it('MONTHLY 기본값이면 날짜 셀렉트, WEEKLY로 바꾸면 요일 셀렉트', () => {
    render(<Harness />)
    expect(screen.getByRole('combobox', { name: '실행 날짜' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '매주' }))
    expect(screen.getByRole('combobox', { name: '실행 요일' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: '실행 날짜' })).not.toBeInTheDocument()
  })
  it('29~31일 선택 시 말일 보정 캡션', () => {
    render(<Harness defaults={{ dayOfMonth: '31' }} />)
    expect(screen.getByText('해당 날짜가 없는 달은 말일에 실행')).toBeInTheDocument()
  })
  it('매수면 +5% 상한 캡션, 매도면 없음', () => {
    const { unmount } = render(<Harness />)
    expect(screen.getByText('매수는 전일 종가 +5% 상한 지정가로 접수되어 급등 시 미체결될 수 있음')).toBeInTheDocument()
    unmount()
    render(<Harness defaults={{ direction: 'SELL' }} />)
    expect(screen.queryByText(/상한 지정가/)).not.toBeInTheDocument()
  })
  it('TOSS + MOO면 개장 직후 지정가 캡션', () => {
    render(<Harness broker="TOSS" defaults={{ orderType: 'MOO' }} />)
    expect(screen.getByText('토스증권은 개장 직후 지정가로 접수되어 시가 체결이 보장되지 않음')).toBeInTheDocument()
  })
  it('수정 모드에서 방향은 읽기 전용', () => {
    render(<Harness isEdit />)
    expect(screen.queryByRole('button', { name: '매도' })).not.toBeInTheDocument()
    expect(screen.getByText('매수')).toBeInTheDocument()
  })
})
```

`SelectionCard`가 `role="button"`이 아니면(예: `radio`) 쿼리 role을 실제 렌더 결과에 맞춘다. 확인은 `sed -n 1,40p shared/ui/selection-card/*.tsx`로 한다.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run features/strategy/create-strategy/sections/DcaSettingsSection.test.tsx`
Expected: FAIL. 모듈이 없다.

- [ ] **Step 3: DcaSettingsSection 구현**

```tsx
'use client'

import { Controller, type UseFormReturn } from 'react-hook-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SelectionCard } from '@shared/ui/selection-card'
import { useMeta } from '@entities/meta'
import { WEEKDAY_LABEL, type DcaWeekday } from '@entities/strategy'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { LAST_DAY, type DcaFormValues } from '../model/dcaFormSchema'

interface Props {
  form: UseFormReturn<DcaFormValues>
  isEdit: boolean
  broker?: string
  orderTypes: string[]
  directions: string[]
  frequencies: string[]
}

const DAY_OPTIONS = [...Array.from({ length: 31 }, (_, i) => String(i + 1)), LAST_DAY]
const LATE_DAYS = new Set(['29', '30', '31'])
const ORDER_TYPE_CAPTION: Record<string, string> = {
  MOO: '장 시작 시 시장가 주문',
  MOC: '장 마감 시 시장가 주문',
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-muted-foreground">{children}</p>
}

export function DcaSettingsSection({ form, isEdit, broker, orderTypes, directions, frequencies }: Props) {
  const { labelOf } = useMeta()
  const { watch, setValue, register, formState: { errors } } = form
  const direction = watch('direction')
  const orderType = watch('orderType')
  const frequency = watch('frequency')
  const dayOfMonth = watch('dayOfMonth')

  return (
    <>
      <div className="py-[18px] border-b border-border">
        <StrategyFieldLabel>방향</StrategyFieldLabel>
        {isEdit ? (
          <div className="px-[14px] py-3 rounded-[var(--r-sm)] border border-border bg-muted text-sm font-[800]">
            {labelOf('orderDirections', direction)}
          </div>
        ) : (
          <div className="flex gap-2">
            {directions.map((code) => (
              <SelectionCard key={code} selected={direction === code} onClick={() => setValue('direction', code as DcaFormValues['direction'])}
                className="flex-1 px-3 py-2 text-center text-sm font-[800]">
                {labelOf('orderDirections', code)}
              </SelectionCard>
            ))}
          </div>
        )}
      </div>

      <div className="py-[18px] border-b border-border">
        <label>
          <StrategyFieldLabel>회차당 금액 (USD)</StrategyFieldLabel>
          <input type="number" inputMode="decimal" min={0} step="0.01"
            {...register('amountUsd', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
            className="h-11 w-full rounded-[var(--r-sm)] border border-border bg-card px-3 text-base" />
        </label>
        {errors.amountUsd && <p className="mt-1 text-sm text-[var(--status-error)]">{errors.amountUsd.message}</p>}
      </div>

      <div className="py-[18px] border-b border-border">
        <StrategyFieldLabel>주문 방식</StrategyFieldLabel>
        <div className="flex gap-2">
          {orderTypes.map((code) => (
            <SelectionCard key={code} selected={orderType === code} onClick={() => setValue('orderType', code as DcaFormValues['orderType'])}
              className="flex-1 px-3 py-2 text-center">
              <div className="text-sm font-[800]">{labelOf('orderTypes', code)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{ORDER_TYPE_CAPTION[code]}</div>
            </SelectionCard>
          ))}
        </div>
        {direction === 'BUY' && <Caption>매수는 전일 종가 +5% 상한 지정가로 접수되어 급등 시 미체결될 수 있음</Caption>}
        {broker === 'TOSS' && orderType === 'MOO' && <Caption>토스증권은 개장 직후 지정가로 접수되어 시가 체결이 보장되지 않음</Caption>}
      </div>

      <div className="py-[18px] border-b border-border">
        <StrategyFieldLabel>주기</StrategyFieldLabel>
        <div className="flex gap-2">
          {frequencies.map((code) => (
            <SelectionCard key={code} selected={frequency === code} onClick={() => setValue('frequency', code as DcaFormValues['frequency'])}
              className="flex-1 px-3 py-2 text-center text-sm font-[800]">
              {labelOf('dcaFrequencies', code)}
            </SelectionCard>
          ))}
        </div>

        {frequency === 'WEEKLY' && (
          <Controller control={form.control} name="dayOfWeek" render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v as DcaWeekday)}>
              <SelectTrigger aria-label="실행 요일" className="mt-3 h-11 w-full"><SelectValue placeholder="요일 선택" /></SelectTrigger>
              <SelectContent>
                {(Object.keys(WEEKDAY_LABEL) as DcaWeekday[]).map((d) => (
                  <SelectItem key={d} value={d}>{WEEKDAY_LABEL[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        )}

        {frequency === 'MONTHLY' && (
          <Controller control={form.control} name="dayOfMonth" render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger aria-label="실행 날짜" className="mt-3 h-11 w-full"><SelectValue placeholder="날짜 선택" /></SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d === LAST_DAY ? '말일' : `${d}일`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        )}

        {(errors.dayOfWeek || errors.dayOfMonth) && (
          <p className="mt-1 text-sm text-[var(--status-error)]">{errors.dayOfWeek?.message ?? errors.dayOfMonth?.message}</p>
        )}
        {frequency === 'MONTHLY' && dayOfMonth && LATE_DAYS.has(dayOfMonth) && <Caption>해당 날짜가 없는 달은 말일에 실행</Caption>}
        <Caption>휴장일이면 같은 주·월 안의 다음 거래일에 실행</Caption>
        <Caption>실행일은 미국 거래일 기준이라 한국 날짜와 하루 차이 날 수 있음</Caption>
      </div>
    </>
  )
}
```

`@/components/ui/select`의 export 이름이 다르면 `grep -n "^export\|^  Select" components/ui/select.tsx`로 확인한 뒤 맞춘다. `StrategyFieldLabel`이 `<label>` 안에 들어가면 안 되는 컴포넌트라면, 금액 입력은 `<label htmlFor>` + `id`로 연결한다.

- [ ] **Step 4: DcaSettingsSection 통과 확인**

Run: `npx vitest run features/strategy/create-strategy/sections/DcaSettingsSection.test.tsx`
Expected: PASS

- [ ] **Step 5: DcaConditionsSection 실패 테스트 작성**

`DcaConditionsSection.test.tsx`(Step 1의 픽스처 사용):

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { MetaProvider } from '@entities/meta'
import { DcaConditionsSection } from './DcaConditionsSection'
import { buildDcaFormDefaults, type DcaFormValues } from '../model/dcaFormSchema'
import { dcaTestMeta } from './__fixtures__/dcaTestMeta'

function Harness({ direction = 'BUY' as const }) {
  const form = useForm<DcaFormValues>({ defaultValues: { ...buildDcaFormDefaults(undefined, 'UPRO'), direction } })
  return (
    <MetaProvider meta={dcaTestMeta}>
      <DcaConditionsSection form={form} direction={direction} indicators={['AVG_PRICE', 'SMA', 'RSI', 'FEAR_GREED']} />
    </MetaProvider>
  )
}

describe('DcaConditionsSection', () => {
  it('조건 0개면 안내 문구', () => {
    render(<Harness />)
    expect(screen.getByText('조건 없이 매 회차 주문')).toBeInTheDocument()
  })
  it('조건 추가 → 행 생성, 삭제 → 제거', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '조건 추가' }))
    expect(screen.getByRole('combobox', { name: '조건 1 지표' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '조건 1 삭제' }))
    expect(screen.queryByRole('combobox', { name: '조건 1 지표' })).not.toBeInTheDocument()
  })
  it('계좌 전체 보유 기준 캡션', () => {
    render(<Harness />)
    expect(screen.getByText('평단가·보유 수량은 계좌 전체 보유 기준')).toBeInTheDocument()
  })
  it('매수만 첫 매수 평단 조건 무시 캡션', () => {
    const { unmount } = render(<Harness />)
    expect(screen.getByText('보유 0주일 때는 평단가 조건 없이 매수')).toBeInTheDocument()
    unmount()
    render(<Harness direction="SELL" />)
    expect(screen.queryByText('보유 0주일 때는 평단가 조건 없이 매수')).not.toBeInTheDocument()
  })
})
```

SMA 기간 셀렉트 노출은 Radix·Base UI Select의 포털 조작이 jsdom에서 불안정해서 이 테스트에서는 다루지 않는다. 대신 Task 3 스키마 테스트와 Task 7 Playwright 확인으로 커버한다.

- [ ] **Step 6: 실패 확인**

Run: `npx vitest run features/strategy/create-strategy/sections/DcaConditionsSection.test.tsx`
Expected: FAIL. 모듈이 없다.

- [ ] **Step 7: DcaConditionsSection 구현**

```tsx
'use client'

import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMeta } from '@entities/meta'
import type { DcaIndicator, DcaOperator } from '@entities/strategy'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import type { DcaFormValues } from '../model/dcaFormSchema'

interface Props {
  form: UseFormReturn<DcaFormValues>
  indicators: string[]
  direction: DcaFormValues['direction']
}

const THRESHOLD_SUFFIX: Partial<Record<DcaIndicator, string>> = { AVG_PRICE: '%' }

export function DcaConditionsSection({ form, indicators, direction }: Props) {
  const { meta, labelOf } = useMeta()
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'conditions' })
  const conditions = form.watch('conditions')

  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel>추가 조건 (모두 충족 시 주문)</StrategyFieldLabel>
      <p className="mb-2 text-sm text-muted-foreground">평단가·보유 수량은 계좌 전체 보유 기준</p>
      {direction === 'BUY' && <p className="mb-2 text-sm text-muted-foreground">보유 0주일 때는 평단가 조건 없이 매수</p>}

      {fields.length === 0 && <p className="py-2 text-sm text-muted-foreground">조건 없이 매 회차 주문</p>}

      <div className="space-y-2">
        {fields.map((f, i) => {
          const indicator = conditions[i]?.indicator
          const smaPeriods = (meta.dcaIndicators ?? []).find((m) => m.code === indicator)?.smaPeriods ?? []
          return (
            <div key={f.id} className="flex items-center gap-2">
              <Controller control={form.control} name={`conditions.${i}.indicator`} render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => {
                  field.onChange(v as DcaIndicator)
                  form.setValue(`conditions.${i}.threshold`, null)
                  form.setValue(`conditions.${i}.smaPeriod`, null)
                }}>
                  <SelectTrigger aria-label={`조건 ${i + 1} 지표`} className="h-11 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {indicators.map((code) => <SelectItem key={code} value={code}>{labelOf('dcaIndicators', code)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />

              {indicator === 'SMA' ? (
                <Controller control={form.control} name={`conditions.${i}.smaPeriod`} render={({ field }) => (
                  <Select value={field.value != null ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger aria-label={`조건 ${i + 1} 이동평균 기간`} className="h-11 w-24"><SelectValue placeholder="기간" /></SelectTrigger>
                    <SelectContent>
                      {smaPeriods.map((p) => <SelectItem key={p} value={String(p)}>{p}일</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              ) : (
                <label className="flex items-center gap-1">
                  <span className="sr-only">{`조건 ${i + 1} 기준값`}</span>
                  <input type="number" step="any"
                    {...form.register(`conditions.${i}.threshold`, { setValueAs: (v) => (v === '' ? null : Number(v)) })}
                    className="h-11 w-20 rounded-[var(--r-sm)] border border-border bg-card px-2 text-base" />
                  {indicator && THRESHOLD_SUFFIX[indicator] && <span className="text-sm">{THRESHOLD_SUFFIX[indicator]}</span>}
                </label>
              )}

              <Controller control={form.control} name={`conditions.${i}.operator`} render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v as DcaOperator)}>
                  <SelectTrigger aria-label={`조건 ${i + 1} 비교`} className="h-11 w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(meta.dcaOperators ?? []).map((o) => <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />

              <Button type="button" variant="ghost" size="icon" aria-label={`조건 ${i + 1} 삭제`} onClick={() => remove(i)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          )
        })}
      </div>

      {form.formState.errors.conditions && (
        <p className="mt-1 text-sm text-[var(--status-error)]">조건 입력값을 확인하세요.</p>
      )}

      <Button type="button" variant="brand-soft" size="sm" className="mt-3"
        onClick={() => append({ indicator: (indicators[0] ?? 'RSI') as DcaIndicator, operator: 'LTE', threshold: null, smaPeriod: null })}>
        조건 추가
      </Button>
    </div>
  )
}
```

아이콘 전용 삭제 버튼이 이 프로젝트의 `IconButton` 규칙을 따라야 하면 `grep -rn "export function IconButton" shared/ui`로 확인하고 교체한다. `Button` `size="icon"`이 없으면 `size="sm"`을 쓴다.

- [ ] **Step 8: DcaConditionsSection 통과 확인**

Run: `npx vitest run features/strategy/create-strategy/sections/DcaConditionsSection.test.tsx`
Expected: PASS

- [ ] **Step 9: DcaStrategyForm 실패 테스트 작성**

`DcaStrategyForm.test.tsx`. entities 훅은 mock한다(`vi.mock('@entities/strategy', async (orig) => ({ ...(await orig()), useCreateStrategyMutation: ..., useReconfigureDcaMutation: ... }))`).

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MetaProvider } from '@entities/meta'
import type { Strategy } from '@entities/strategy'
import { DcaStrategyForm } from './DcaStrategyForm'
import { dcaTestMeta } from './sections/__fixtures__/dcaTestMeta'

const createMutate = vi.fn()
const reconfigureMutate = vi.fn()
vi.mock('@entities/strategy', async (orig) => ({
  ...(await orig<typeof import('@entities/strategy')>()),
  useCreateStrategyMutation: () => ({ mutate: createMutate, isPending: false }),
  useReconfigureDcaMutation: () => ({ mutate: reconfigureMutate, isPending: false }),
}))

const meta = {
  ...dcaTestMeta,
  strategyTypes: [{
    code: 'DCA', availableTickers: ['UPRO', 'QLD'], requiresPrivacyBase: false, tickerFixed: false, supportsReverseMode: false,
    divisionCounts: [], orderTypes: ['MOO', 'MOC'], directions: ['BUY', 'SELL'],
    frequencies: ['DAILY', 'WEEKLY', 'MONTHLY'], conditionIndicators: ['AVG_PRICE', 'SMA', 'RSI', 'FEAR_GREED'],
  }],
}

const existing: Strategy = {
  id: 's1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'QLD', cycleSeedType: 'NONE', isReverseMode: false,
  dca: { direction: 'SELL', amountUsd: 200, orderType: 'MOO', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, conditions: [], nextExecution: null, lastExecution: null },
}

function renderForm(initial?: Strategy) {
  return render(
    <MetaProvider meta={meta}>
      <DcaStrategyForm accountId="a1" broker="KIS" initial={initial} availableTickers={['UPRO', 'QLD']} />
    </MetaProvider>,
  )
}

describe('DcaStrategyForm', () => {
  beforeEach(() => { createMutate.mockClear(); reconfigureMutate.mockClear() })

  it('등록: 금액 입력 후 제출하면 create mutation에 DCA payload', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('회차당 금액 (USD)'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DCA', ticker: 'UPRO', dca: expect.objectContaining({ amountUsd: 300, frequency: 'MONTHLY', dayOfMonth: null }) }),
      expect.anything(),
    ))
    expect(reconfigureMutate).not.toHaveBeenCalled()
  })

  it('수정: PUT dca-config(reconfigure) 경로로 dca 객체만, 종목·방향 변경 UI 없음', async () => {
    renderForm(existing)
    expect(screen.queryByRole('button', { name: 'UPRO' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '매수' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    await waitFor(() => expect(reconfigureMutate).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'SELL', amountUsd: 200, frequency: 'DAILY' }),
      expect.anything(),
    ))
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('금액 미입력이면 제출 안 됨', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(screen.getByText('금액을 입력하세요.')).toBeInTheDocument())
    expect(createMutate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 10: 실패 확인**

Run: `npx vitest run features/strategy/create-strategy/DcaStrategyForm.test.tsx`
Expected: FAIL. 모듈이 없다.

- [ ] **Step 11: DcaStrategyForm 구현**

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { FormActions } from '@shared/ui/FormActions'
import { useMeta } from '@entities/meta'
import { useCreateStrategyMutation, useReconfigureDcaMutation } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { StrategyTickerSection } from './sections/StrategyTickerSection'
import { ScheduledStartSection } from './sections/ScheduledStartSection'
import { DcaSettingsSection } from './sections/DcaSettingsSection'
import { DcaConditionsSection } from './sections/DcaConditionsSection'
import { buildDcaFormDefaults, dcaFormSchema, type DcaFormValues } from './model/dcaFormSchema'
import { buildDcaConfig, buildDcaCreatePayload } from './model/buildDcaPayload'

interface Props {
  accountId: string
  broker?: string
  initial?: Strategy
  availableTickers: string[] // 런타임 설정 허용 티커 (StrategyForm이 계산해 전달)
  onSuccess?: () => void
  onCancel?: () => void
}

// DCA 등록·수정 — 시드·분할·VR이 엮인 useStrategyForm과 분리된 자체 폼(spec A'안)
export function DcaStrategyForm({ accountId, broker, initial, availableTickers, onSuccess, onCancel }: Props) {
  const { findStrategyType } = useMeta()
  const typeMeta = findStrategyType('DCA')
  const form = useForm<DcaFormValues>({
    resolver: zodResolver(dcaFormSchema),
    defaultValues: buildDcaFormDefaults(initial, availableTickers[0] ?? ''),
  })
  const done = () => {
    toast.success(initial ? '전략이 수정되었습니다' : '전략이 등록되었습니다')
    onSuccess?.()
  }
  const create = useCreateStrategyMutation(accountId)
  const reconfigure = useReconfigureDcaMutation(initial?.id ?? '')
  const pending = create.isPending || reconfigure.isPending
  const ticker = form.watch('ticker')
  const direction = form.watch('direction')

  const submit = form.handleSubmit((values) => {
    if (initial) reconfigure.mutate(buildDcaConfig(values), { onSuccess: done })
    else create.mutate(buildDcaCreatePayload(values), { onSuccess: done })
  })

  return (
    <form onSubmit={submit}>
      <StrategyTickerSection
        initial={initial}
        ticker={ticker}
        availableTickers={availableTickers}
        prices={null}
        basePrice={null}
        loading={pending}
        onTickerChange={(code) => form.setValue('ticker', code)}
        customizable={availableTickers.length > 1}
      />
      {!initial && (
        <ScheduledStartSection
          value={form.watch('scheduledStartDate')}
          onChange={(d) => form.setValue('scheduledStartDate', d)}
          loading={pending}
        />
      )}
      <DcaSettingsSection
        form={form}
        isEdit={!!initial}
        broker={broker}
        orderTypes={typeMeta?.orderTypes ?? []}
        directions={typeMeta?.directions ?? []}
        frequencies={typeMeta?.frequencies ?? []}
      />
      <DcaConditionsSection form={form} indicators={typeMeta?.conditionIndicators ?? []} direction={direction} />
      <FormActions onCancel={onCancel} isPending={pending} canSubmit={!pending} label={initial ? '수정' : '등록'} className="py-6" />
    </form>
  )
}
```

토스트 문구 "전략이 등록되었습니다"/"전략이 수정되었습니다"는 기존 `useStrategyMutations`와 같다. 서버 400(중복 등록 등)은 entity 훅 `onError`가 `apiMsg`로 detail을 토스트하므로 호출부에서 onError를 지정하지 않는다. 기존 `handleMutationSuccess`가 하던 `orderKeys`/`statsKeys`/`tradeKeys` 무효화는 DCA 등록 직후 해당 캐시에 영향이 없으므로 넣지 않는다.

- [ ] **Step 12: StrategyForm 분기 + seed preview 끄기**

`useStrategyForm.ts`의 seed preview 쿼리:

```ts
    { enabled: !!type && !!ticker && !isVr && type !== 'DCA' },
```

`StrategyForm.tsx`에서 `return (` 직전, 즉 `RuntimeConfigError` 분기 뒤에 다음을 추가한다:

```tsx
  // DCA는 시드·분할·VR과 무관한 별도 폼 — 유형 선택(등록)만 공유하고 나머지는 DcaStrategyForm이 렌더
  if ((initial?.type ?? form.type) === 'DCA') {
    return (
      <>
        {!initial && (
          <StrategyTypeSection initial={initial} type={form.type} setType={form.setType} loading={form.loading} strategyTypes={strategyTypes} />
        )}
        <DcaStrategyForm
          key={initial?.id ?? 'new'}
          accountId={accountId}
          broker={broker}
          initial={initial}
          availableTickers={form.availableTickers}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </>
    )
  }
```

import에 `import { DcaStrategyForm } from './DcaStrategyForm'`를 추가한다.

`form.availableTickers`는 `deriveRuntimeFields`가 런타임 설정의 `strategies.DCA.fields.ticker.allowedValues`를 주는지 확인한 값이다. 확인 명령은 `sed -n '/export function deriveRuntimeFields/,/^}/p' features/strategy/create-strategy/model/strategyFormHelpers.ts`다. 수정 모드처럼 빈 배열을 주는 경우에는 `initial ? [initial.ticker] : form.availableTickers`로 넘긴다.

- [ ] **Step 13: StrategyForm 분기 테스트 추가**

`StrategyForm.test.tsx`의 기존 `useStrategyFormMock` 패턴에 다음 테스트를 추가한다:

```tsx
  it('type=DCA면 DcaStrategyForm을 렌더하고 시드 섹션은 렌더하지 않는다', () => {
    useStrategyFormMock.mockReturnValue({ ...baseFormState, type: 'DCA', availableTickers: ['UPRO', 'QLD'] })
    renderStrategyForm()
    expect(screen.getByText('회차당 금액 (USD)')).toBeInTheDocument()
    expect(screen.queryByText(/사용 비율|시드/)).not.toBeInTheDocument()
  })
```

`renderStrategyForm`은 파일의 기존 render 헬퍼 이름을 쓴다. `MetaProvider` 메타에 DCA 필드가 없으면 Step 9의 `meta`를 쓴다. `/사용 비율|시드/`는 `UsageRatioSection` 고유 라벨로 바꾼다(`grep -n "StrategyFieldLabel" features/strategy/create-strategy/sections/UsageRatioSection.tsx`).

- [ ] **Step 14: 22:00 문구 동기화**

- `useStrategyFormEffects.ts:26,28`: `22:30`을 `22:00`으로 바꾼다(주석과 토스트 문자열 모두).
- `sections/ScheduledStartSection.tsx:12` 주석: `그날 22:30 개장 배치`를 `그날 22:00 개장 배치`로, `세 전략 공통`을 `네 전략 공통`으로 바꾼다.
- `shared/lib/format/index.ts:87` 주석: `22:30`을 `22:00`으로 바꾼다.
- 바뀐 토스트 문자열을 단언하는 테스트가 있으면 함께 고친다. 찾는 명령은 `grep -rn "22:30" --include='*.test.*' .`이다.

- [ ] **Step 15: 폼 관련 테스트 통과 확인**

Run: `npx vitest run features/strategy/create-strategy`
Expected: PASS

- [ ] **Step 16: 리뷰어 통과 후 커밋**

```bash
git add features/strategy/create-strategy shared/lib/format/index.ts
git commit -m "feat(strategy): DCA 등록·수정 폼 추가 및 개장 배치 시각 22:00 반영"
```

---

### Task 5: 전략 카드 DCA 분기

**Files:**
- Create: `widgets/strategy-card/DcaStrategyCard.tsx`
- Modify: `widgets/strategy-card/StrategyCard.tsx:168-210`
- Test: `widgets/strategy-card/StrategyCard.test.tsx`

**Interfaces:**
- Consumes: Task 2의 `Strategy.dca`, `formatDcaSchedule`, Task 1의 `labelOf('dcaFrequencies'|'orderDirections'|'orderTypes'|'dcaSkipReasons', code)`
- Produces: `StrategyCard`는 public props를 바꾸지 않는다. 기존 본문은 내부 `CycleStrategyCard`로 이름을 바꾼다.

- [ ] **Step 1: 실패 테스트 작성**

`StrategyCard.test.tsx`에 추가한다. 파일에 이미 있는 `useStrategyOrderPreviewQuery` mock 이름을 재사용한다. `MetaProvider` 메타에는 Task 4의 `dcaTestMeta` 필드를 병합한다.

```tsx
  const dcaStrategy = {
    id: 'd1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false,
    dca: {
      direction: 'BUY', amountUsd: 300, orderType: 'MOC', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null, conditions: [],
      nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' },
      lastExecution: { kstTradeDate: '2026-09-30', status: 'SKIPPED', skipReason: 'CONDITION_NOT_MET' },
    },
  } as const

  it('DCA 카드는 단건 미리보기를 호출하지 않는다', () => {
    renderCard({ strategy: dcaStrategy })
    expect(useStrategyOrderPreviewQueryMock).not.toHaveBeenCalled()
  })

  it('DCA 카드는 방향·주기 요약·다음 판정일·최근 결과를 보여준다', () => {
    renderCard({ strategy: dcaStrategy })
    expect(screen.getAllByText('매수').length).toBeGreaterThan(0)
    expect(screen.getAllByText('매월 말일 · $300.00 · MOC').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/2026-10-31/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/조건 미충족/).length).toBeGreaterThan(0)
  })
```

`dcaSkipReasons` 테스트 메타에 `{ code: 'CONDITION_NOT_MET', label: '조건 미충족' }`을 추가한다. `fmtUsd(300)`의 실제 출력이 `300.00`이 아니면 기대 문자열을 실제 포맷에 맞춘다(`grep -n "export function fmtUsd" -A5 shared/lib/format/index.ts`). 카드는 모바일과 PC 레이아웃을 모두 렌더하므로 `getAllBy`를 쓴다.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run widgets/strategy-card/StrategyCard.test.tsx`
Expected: FAIL. 미리보기 mock이 호출되고, 요약 텍스트가 없다.

- [ ] **Step 3: DcaStrategyCard 구현**

```tsx
'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { fmtUsd } from '@shared/lib/format'
import { Badge } from '@shared/ui/Badge'
import { useMeta } from '@entities/meta'
import { formatDcaSchedule, strategyStatusAccent, isScheduledStart, scheduledStartBadgeLabel } from '@entities/strategy'
import type { Strategy, StrategyDcaSummary } from '@entities/strategy'

interface Props {
  accountId: string
  strategy: Strategy & { dca: StrategyDcaSummary }
  accountLabel?: string | ReactNode
}

// DCA 카드 — 미리보기(readiness·시드) 없이 설정 요약·다음 판정일·최근 결과만 표시
export function DcaStrategyCard({ accountId, strategy, accountLabel }: Props) {
  const { labelOf } = useMeta()
  const { dca } = strategy
  const summary = `${formatDcaSchedule(dca, labelOf('dcaFrequencies', dca.frequency))} · $${fmtUsd(dca.amountUsd)} · ${dca.orderType}`
  const last = dca.lastExecution
  const lastLabel = last
    ? last.status === 'ORDERED' ? '주문됨' : `건너뜀 · ${last.skipReason ? labelOf('dcaSkipReasons', last.skipReason) : ''}`
    : null
  const scheduledStart = isScheduledStart(strategy)

  return (
    <Link
      href={`/accounts/${accountId}/strategies/${strategy.id}`}
      className="group relative block rounded-[var(--r-lg)] border border-border bg-card shadow-[var(--sh-card)] hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-[border-color,box-shadow] overflow-hidden"
    >
      <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: strategyStatusAccent(strategy.status) }} />
      <div className="flex items-center gap-3 pl-5 pr-4 py-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="brand" size="sm">DCA</Badge>
            <Badge tone={dca.direction === 'BUY' ? 'ok' : 'warn'} size="sm">{labelOf('orderDirections', dca.direction)}</Badge>
            {scheduledStart && <Badge tone="neutral" size="sm">{scheduledStartBadgeLabel(strategy)}</Badge>}
            <span className="text-sm font-[800]">{strategy.ticker}</span>
            {accountLabel && <span className="text-xs text-muted-foreground truncate">{accountLabel}</span>}
          </div>
          <p className="text-sm">{summary}</p>
          <p className="text-xs text-muted-foreground">
            다음 판정일 {dca.nextExecution?.kstTradeDate ?? '예정일 미정'}
            {lastLabel && ` · 최근 ${lastLabel}`}
          </p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground group-hover:text-[var(--brand-fg-soft)] transition-colors shrink-0" />
      </div>
    </Link>
  )
}
```

`isScheduledStart`와 `scheduledStartBadgeLabel`의 시그니처는 `entities/strategy/model/scheduled-start.ts`에서 확인하고 맞춘다. 상태 액센트의 인라인 style은 기존 카드와 같은 CSS 토큰 예외다. 배지 tone 조합은 a11y 대비 규칙에 따라 Task 7 `a11y-check`로 확인한다.

- [ ] **Step 4: StrategyCard 래퍼 분기**

`StrategyCard.tsx`의 기존 `export function StrategyCard(...)`를 `function CycleStrategyCard(...)`로 이름만 바꾸고(본문은 그대로), 파일 끝에 다음을 추가한다:

```tsx
// DCA는 단건 미리보기를 지원하지 않아(409) 미리보기 훅이 실행되기 전에 래퍼에서 분기한다
export function StrategyCard(props: Props) {
  const { strategy } = props
  if (strategy.type === 'DCA' && strategy.dca) {
    return <DcaStrategyCard accountId={props.accountId} strategy={{ ...strategy, dca: strategy.dca }} accountLabel={props.accountLabel} />
  }
  return <CycleStrategyCard {...props} />
}
```

import에 `import { DcaStrategyCard } from './DcaStrategyCard'`를 추가한다.

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run widgets/strategy-card`
Expected: PASS

- [ ] **Step 6: 리뷰어 통과 후 커밋**

```bash
git add widgets/strategy-card
git commit -m "feat(strategy): DCA 전략 카드 추가 — 미리보기 없이 주기 요약·다음 판정일 표시"
```

---

### Task 6: 전략 상세 DCA 분기 + 회차 이력

**Files:**
- Create: `widgets/strategy-detail/DcaStrategyDetail.tsx`, `DcaStrategyDetail.test.tsx`
- Create: `widgets/strategy-detail/DcaExecutionHistory.tsx`
- Modify: `widgets/strategy-detail/StrategyDetailContent.tsx:56`
- Modify: `app/(main)/accounts/[id]/strategies/[sid]/page.tsx:38`

**Interfaces:**
- Consumes:
  - Task 2: `useDcaExecutionsQuery(id, page, size)`, `formatDcaSchedule`, `formatDcaCondition`, `Strategy.dca`
  - 기존 `useManageStrategyMutations({ onDeleted, strategyId })`의 `pause`, `resume`, `remove`, `isPausing`, `isResuming`, `isDeleting`
  - 기존 `DeleteStrategyDialog`, `PaginationBar`
- Produces: `DcaStrategyDetail({ accountId, strategy })`

- [ ] **Step 1: 실패 테스트 작성**

`DcaStrategyDetail.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MetaProvider } from '@entities/meta'
import { DcaStrategyDetail } from './DcaStrategyDetail'
import { dcaTestMeta } from '@features/strategy/create-strategy/sections/__fixtures__/dcaTestMeta'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@features/strategy/manage-strategy', () => ({
  useManageStrategyMutations: () => ({ pause: vi.fn(), resume: vi.fn(), remove: vi.fn(), execute: vi.fn(), isPausing: false, isResuming: false, isDeleting: false, isExecuting: false }),
}))
vi.mock('@entities/strategy', async (orig) => ({
  ...(await orig<typeof import('@entities/strategy')>()),
  useDcaExecutionsQuery: () => ({
    data: { content: [
      { kstTradeDate: '2026-09-30', status: 'ORDERED', skipReason: null, detail: null, referencePrice: 87.12, quantity: 3, order: { id: 'o1', status: 'FILLED', filledQuantity: 3, filledPrice: 87.4 } },
      { kstTradeDate: '2026-08-29', status: 'SKIPPED', skipReason: 'CONDITION_NOT_MET', detail: 'RSI(14) 48.20 > 35', order: null },
    ], page: 0, size: 20, totalElements: 2 },
    isLoading: false, isError: false,
  }),
}))

const strategy = {
  id: 'd1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false, currentHoldings: 12,
  dca: {
    direction: 'BUY', amountUsd: 300, orderType: 'MOC', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null,
    conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 35 }],
    nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' }, lastExecution: null,
  },
} as const

function renderDetail() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MetaProvider meta={{ ...dcaTestMeta, dcaSkipReasons: [{ code: 'CONDITION_NOT_MET', label: '조건 미충족' }] }}>
        <DcaStrategyDetail accountId="a1" strategy={strategy} />
      </MetaProvider>
    </QueryClientProvider>,
  )
}

describe('DcaStrategyDetail', () => {
  it('바로 주문 버튼이 없다', () => {
    renderDetail()
    expect(screen.queryByRole('button', { name: /바로 주문/ })).not.toBeInTheDocument()
  })
  it('설정 요약·조건·다음 판정일·보유 수량', () => {
    renderDetail()
    expect(screen.getByText('매월 말일')).toBeInTheDocument()
    expect(screen.getByText('RSI(14) 35 이하')).toBeInTheDocument()
    expect(screen.getByText('2026-10-31')).toBeInTheDocument()
    expect(screen.getByText('12주')).toBeInTheDocument()
    expect(screen.getByText('계좌 전체 보유 기준')).toBeInTheDocument()
  })
  it('회차 이력: 주문됨/건너뜀 + 사유·detail', () => {
    renderDetail()
    expect(screen.getByText('주문됨')).toBeInTheDocument()
    expect(screen.getByText('조건 미충족')).toBeInTheDocument()
    expect(screen.getByText('RSI(14) 48.20 > 35')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '회차별 실행 이력' })).toHaveAttribute('tabindex', '0')
  })
})
```

`widgets` 테스트가 `features` 픽스처를 import하는 것은 테스트 전용이라 FSD 런타임 의존이 아니다. 그래도 `fsd-boundary-checker`가 테스트 파일까지 검사하면 픽스처를 `shared/test/dcaTestMeta.ts`로 옮기고 Task 4의 import도 그 경로로 바꾼다.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run widgets/strategy-detail/DcaStrategyDetail.test.tsx`
Expected: FAIL. 모듈이 없다.

- [ ] **Step 3: DcaExecutionHistory 구현**

```tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMeta } from '@entities/meta'
import { useDcaExecutionsQuery } from '@entities/strategy'
import { ORDER_STATUS_LABEL } from '@entities/order'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { Badge } from '@shared/ui/Badge'
import { fmtUsd } from '@shared/lib/format'

const PAGE_SIZE = 20

export function DcaExecutionHistory({ strategyId }: { strategyId: string }) {
  const { labelOf } = useMeta()
  const [page, setPage] = useState(1) // PaginationBar는 1-base, API는 0-base
  const { data, isLoading, isError } = useDcaExecutionsQuery(strategyId, page - 1, PAGE_SIZE)
  const rows = data?.content ?? []
  const totalPages = Math.ceil((data?.totalElements ?? 0) / PAGE_SIZE)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base lg:text-lg">
          <h2>회차별 실행 이력</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <LoadingRow />
        ) : isError ? (
          <EmptyState variant="text" message="실행 이력을 불러오지 못했습니다." />
        ) : rows.length === 0 ? (
          <EmptyState variant="text" message="아직 실행된 회차가 없습니다." />
        ) : (
          <div role="region" aria-label="회차별 실행 이력" tabIndex={0} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">거래일</th>
                  <th className="px-4 py-2 font-medium">결과</th>
                  <th className="px-4 py-2 font-medium">사유</th>
                  <th className="px-4 py-2 font-medium text-right">기준가</th>
                  <th className="px-4 py-2 font-medium text-right">수량</th>
                  <th className="px-4 py-2 font-medium">체결</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.kstTradeDate} className="border-t border-border">
                    <td className="px-4 py-2 tabular-nums">{r.kstTradeDate}</td>
                    <td className="px-4 py-2">
                      <Badge tone={r.status === 'ORDERED' ? 'ok' : 'neutral'} size="sm">{r.status === 'ORDERED' ? '주문됨' : '건너뜀'}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      {r.skipReason && <div>{labelOf('dcaSkipReasons', r.skipReason)}</div>}
                      {r.detail && <div className="text-xs text-muted-foreground">{r.detail}</div>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.referencePrice != null ? `$${fmtUsd(r.referencePrice)}` : '-'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.quantity ?? '-'}</td>
                    <td className="px-4 py-2">
                      {r.order
                        ? `${ORDER_STATUS_LABEL[r.order.status] ?? r.order.status}${r.order.filledPrice != null ? ` · $${fmtUsd(r.order.filledPrice)}` : ''}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />}
      </CardContent>
    </Card>
  )
}
```

다음 항목은 import하기 전에 각 파일의 export를 확인한다:
- `ORDER_STATUS_LABEL`
- `EmptyState`의 `variant`/`message` props
- `LoadingRow`의 props
- `CardTitle` 안 `h2` 관례(다른 위젯이 `CardTitle render={<h2/>}` 같은 다른 방식을 쓰면 그 방식)

기존 `StrategyOrderHistory`가 같은 컴포넌트를 쓰므로 그 파일의 사용법을 그대로 따른다. heading 레벨은 페이지 `h1`(PageHeader) 바로 아래라 `h2`다.

- [ ] **Step 4: DcaStrategyDetail 구현**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useManageStrategyMutations } from '@features/strategy/manage-strategy'
import { useMeta } from '@entities/meta'
import { formatDcaCondition, formatDcaSchedule } from '@entities/strategy'
import type { Strategy, StrategyDcaSummary } from '@entities/strategy'
import { fmtUsd } from '@shared/lib/format'
import { DeleteStrategyDialog } from './DeleteStrategyDialog'
import { DcaExecutionHistory } from './DcaExecutionHistory'

interface Props {
  accountId: string
  strategy: Strategy & { dca: StrategyDcaSummary }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{children}</span>
    </div>
  )
}

// DCA 상세 — 바로 주문·미리보기 미지원(409)이라 NextOrderCard 대신 설정·다음 판정일·회차 이력을 표시
export function DcaStrategyDetail({ accountId, strategy }: Props) {
  const { push } = useRouter()
  const { labelOf } = useMeta()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { dca } = strategy
  const { pause, resume, remove, isPausing, isResuming, isDeleting } = useManageStrategyMutations({
    onDeleted: () => push(`/accounts/${accountId}`),
    strategyId: strategy.id,
  })
  const toggleLoading = isPausing || isResuming
  const loading = toggleLoading || isDeleting
  const toggleLabel = toggleLoading ? '처리 중...' : strategy.status === 'ACTIVE' ? '중지' : '재개'

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <Row label="방향">{labelOf('orderDirections', dca.direction)}</Row>
          <Row label="주기">{formatDcaSchedule(dca, labelOf('dcaFrequencies', dca.frequency))}</Row>
          <Row label="회차당 금액">${fmtUsd(dca.amountUsd)}</Row>
          <Row label="주문 방식">{labelOf('orderTypes', dca.orderType)}</Row>
          <Row label="다음 판정일">{dca.nextExecution?.kstTradeDate ?? '예정일 미정'}</Row>
          <p className="text-xs text-muted-foreground">조건 충족 여부는 실행일에 판정</p>
          <Row label="보유 수량">{strategy.currentHoldings != null ? `${strategy.currentHoldings}주` : '-'}</Row>
          <p className="text-xs text-muted-foreground">계좌 전체 보유 기준</p>
          <div className="pt-3">
            <div className="text-sm text-muted-foreground">추가 조건</div>
            {dca.conditions.length === 0 ? (
              <p className="text-sm">조건 없이 매 회차 주문</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm font-semibold">
                {dca.conditions.map((c, i) => (
                  <li key={i}>{formatDcaCondition(c, labelOf('dcaIndicators', c.indicator), labelOf('dcaOperators', c.operator))}</li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <DcaExecutionHistory strategyId={strategy.id} />

      <Card>
        <CardContent className="p-5 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" disabled={loading}
            onClick={() => (strategy.status === 'ACTIVE' ? pause(strategy) : resume(strategy))}>
            {toggleLabel}
          </Button>
          <DeleteStrategyDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            ticker={strategy.ticker}
            onConfirm={() => remove(strategy)}
            disabled={loading}
            isDeleting={isDeleting}
          />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: StrategyDetailContent 분기 + 페이지 prefetch 생략**

`StrategyDetailContent.tsx`에서 `<StrategyDetail accountId={accountId} strategy={strategy} />`를 다음으로 바꾼다:

```tsx
      {strategy.type === 'DCA' && strategy.dca
        ? <DcaStrategyDetail accountId={accountId} strategy={{ ...strategy, dca: strategy.dca }} />
        : <StrategyDetail accountId={accountId} strategy={strategy} />}
```

import에 `import { DcaStrategyDetail } from './DcaStrategyDetail'`를 추가한다. 이 파일의 PageHeader "수정" 링크는 DCA에서도 `/edit`로 가고, `StrategyForm`이 `initial.type === 'DCA'`로 분기하므로 그대로 둔다.

`app/(main)/accounts/[id]/strategies/[sid]/page.tsx:38`:

```tsx
  // "다음 주문" 배너·데이터가 하이드레이션 이후 재요청 없이 첫 페인트부터 보이도록 서버에서 미리 조회
  // DCA는 단건 미리보기를 지원하지 않는다(409) — 호출 자체를 생략
  if (strategy.type !== 'DCA') {
    await queryClient.prefetchQuery(orderPreviewQueryOptions(strategy.id, token)).catch(() => undefined)
  }
```

- [ ] **Step 6: 통과 확인**

Run: `npx vitest run widgets/strategy-detail`
Expected: PASS(기존 테스트 포함)

- [ ] **Step 7: 리뷰어 통과 후 커밋**

```bash
git add widgets/strategy-detail "app/(main)/accounts/[id]/strategies/[sid]/page.tsx"
git commit -m "feat(strategy): DCA 전략 상세 — 설정 요약·다음 판정일·회차 실행 이력 추가"
```

---

### Task 7: 최종 검증 + 문서 동기화

**Files:**
- Modify: `docs/agents/features.md`(create-strategy DCA 분기 quirk), `docs/agents/widgets.md`(카드·상세 DCA 분기 이유: 미리보기 409), `docs/agents/entities.md`(DCA 타입·라벨은 메타 SSOT, 요일만 로컬 상수)
- Modify: `README.md`(전략 목록·개장 배치 시각 언급이 있으면)

- [ ] **Step 1: 문서 갱신**

각 문서의 해당 슬라이스 항목에 1~3줄을 추가한다. 이 계획의 "Architecture"와 Review Focus 1·2를 요약한 내용이다. `README.md`는 `grep -n "INFINITE\|VR\|22:30\|무한매수" README.md`로 찾아 전략 목록에 DCA를 추가하고 시각을 22:00으로 고친다.

- [ ] **Step 2: 전체 검증 1회**

Run: `npm run typecheck && npm run lint 2>&1 | grep -E "error|✖" ; npm run test:run 2>&1 | grep -E "Test Files|Tests|FAIL"`
Expected: typecheck 0 errors, lint 0 errors, 테스트 전부 PASS

- [ ] **Step 3: 화면 확인 (Playwright)**

로컬 kista-api(DCA ① 포함)가 떠 있어야 한다. 떠 있지 않으면 사용자에게 기동을 요청하고 임의로 기동하지 않는다. dev-token 엔드포인트로 인증한다(메모리 `verify_local_api_constraint`). 로컬 DB는 실데이터라 **등록 제출은 하지 않는다**. 렌더링만 확인한다.
- 관리자 설정에서 DCA 토글과 DCA 필드 섹션이 렌더되는지 확인(저장하지 않음)
- `/accounts/{id}/strategies/new`에서 유형이 DCA일 때 폼, 주기 전환, 조건 추가와 SMA 기간 셀렉트를 확인. 로컬 런타임 설정에서 DCA가 꺼져 있으면 이 항목은 확인 불가로 보고한다.
- 기존 INFINITE 전략 카드와 상세가 회귀 없이 그대로인지 확인

```bash
npx playwright screenshot --browser chromium --viewport-size "1440,900" http://localhost:3000/accounts/<id>/strategies/new /tmp/dca-form.png
npm run a11y-check -- --url http://localhost:3000/accounts/<id>/strategies/new
```

- [ ] **Step 4: 최종 리뷰 정책**

태스크별 리뷰를 모두 통과했다면 전체 브랜치 최종 리뷰는 기본으로 생략한다(사용자 전역 규칙). 생략해도 되는지 사용자에게 짧게 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add docs/agents README.md
git commit -m "docs: DCA 전략 UI quirk·README 전략 목록 동기화"
```

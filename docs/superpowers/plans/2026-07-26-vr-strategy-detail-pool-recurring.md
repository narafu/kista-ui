# VR 전략 상세 페이지 Pool·정기 입출금 표시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** VR 전략 상세 페이지에서 "전략타입"과 중복 표시되던 "운용 방식" 카드를 정기 입출금(적립식/거치식/인출식) 정보로 교체하고, 지금까지 화면에 없던 `주기`(intervalWeeks)와 `pool`(현재 시작금액) 카드를 추가한다.

**Architecture:** `widgets/strategy-detail/StrategyDetail.tsx` 한 파일 내 VR 분기(`strategy.vr != null`)만 재구성한다. 필요한 모든 값(`intervalWeeks`, `recurringAmount`, `initialUsdDeposit`, `poolLimit`, `gradient`, `value`, `bandWidth`)은 이미 `Strategy`/`StrategyVrSummary` 타입에 존재하므로 API·타입 변경은 없다. 비VR(INFINITE·PRIVACY) 분기는 손대지 않는다.

**Tech Stack:** Next.js(React), TypeScript, Tailwind CSS, Vitest + Testing Library

## Global Constraints

- 싱글 쿼트, 세미콜론 없음, import 중괄호 공백 유지 — 기존 파일 포맷 그대로 따른다.
- `any` 금지.
- `fmtUsd(n)`은 `$` 기호를 포함하지 않는다 — 기존 코드처럼 `` `$${fmtUsd(n)}` `` 형태로 직접 붙인다.
- 비VR 전략(`strategy.vr == null`)의 레이아웃·텍스트는 절대 변경하지 않는다 — 기존 회귀 테스트가 그대로 통과해야 한다.
- 커밋 메시지는 한글, author는 `narafu <narafu@kakao.com>`이어야 한다. `git push`는 하지 않는다.

---

## 참고 자료 (구현 전 확인)

- 설계 문서: `docs/superpowers/specs/2026-07-26-vr-strategy-detail-pool-recurring-design.md`
- `entities/strategy/model/types.ts`의 `StrategyVrSummary`: `{ value, bandWidth, intervalWeeks, recurringAmount, poolLimit, gradient }` (모두 number)
- `shared/lib/format/index.ts`의 `fmtUsd(n: number, digits = 2): string` — `$` 없이 `"1,234.00"` 형태만 반환
- `widgets/kpi-card/KpiCard.tsx`의 `Props`: `{ label: string, value?: ReactNode, className?: string, valueClassName?: string, ... }`

## Task 1: 전략타입/운용방식 중복 제거 + 주기·pool 카드 추가

**Files:**
- Modify: `widgets/strategy-detail/StrategyDetail.tsx:97-244` (helper 함수 추가 + meta-grid·summary-grid·vr-grid 블록 재작성)
- Test: `widgets/strategy-detail/StrategyDetail.test.tsx:201-228` (기존 VR 테스트 재작성 + 케이스 2개 추가)

**Interfaces:**
- Consumes: `Strategy.vr?: StrategyVrSummary`(이미 정의됨, `entities/strategy` re-export), `strategy.initialUsdDeposit?: number`, `fmtUsd` (`@shared/lib/format`)
- Produces: 이 태스크 하나로 완결 — 다른 태스크가 이 결과물을 소비하지 않는다.

### Step 1: 실패하는 테스트로 교체하기

`widgets/strategy-detail/StrategyDetail.test.tsx`에서 201~228행의 `it('shows VR summary instead of privacy operating mode copy', ...)` 블록 전체를 아래 세 개의 테스트로 교체한다.

```tsx
  it('shows recurring withdrawal mode in the operating-mode card without duplicating the strategy type', () => {
    render(<StrategyDetail
      accountId="account-1"
      strategy={{
        ...baseStrategy,
        type: 'VR',
        ticker: 'TQQQ',
        divisionCount: undefined,
        initialUsdDeposit: 2000,
        vr: {
          value: 3000,
          bandWidth: 15,
          intervalWeeks: 4,
          recurringAmount: -100,
          poolLimit: 500,
          gradient: 20,
        },
      }}
    />)

    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('전략타입')
    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('VR')
    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('운용 방식')
    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('인출식($100.00)')
    expect(screen.getByTestId('strategy-meta-grid')).not.toHaveTextContent('다음 사이클')
    expect(screen.queryByTestId('strategy-summary-grid')).not.toBeInTheDocument()

    const vrGrid = screen.getByTestId('strategy-vr-grid')
    expect(vrGrid).toHaveTextContent('밴드 폭')
    expect(vrGrid).toHaveTextContent('15%')
    expect(vrGrid).toHaveTextContent('주기')
    expect(vrGrid).toHaveTextContent('4주')
    expect(vrGrid).toHaveTextContent('G')
    expect(vrGrid).toHaveTextContent('V')
    expect(vrGrid).toHaveTextContent('$3,000.00')
    expect(vrGrid).not.toHaveTextContent('V값')
    expect(vrGrid).toHaveTextContent('pool')
    expect(vrGrid).toHaveTextContent('$2,000.00')
    expect(vrGrid).toHaveTextContent('pool 상한')
    expect(vrGrid).toHaveTextContent('$500.00')
    expect(screen.queryByText('매매표')).not.toBeInTheDocument()
  })

  it('shows the saving mode amount when recurringAmount is positive', () => {
    render(<StrategyDetail
      accountId="account-1"
      strategy={{
        ...baseStrategy,
        type: 'VR',
        ticker: 'TQQQ',
        divisionCount: undefined,
        initialUsdDeposit: 2000,
        vr: {
          value: 3000,
          bandWidth: 15,
          intervalWeeks: 4,
          recurringAmount: 200,
          poolLimit: 1500,
          gradient: 10,
        },
      }}
    />)

    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('적립식($200.00)')
  })

  it('shows the hold mode label when recurringAmount is zero', () => {
    render(<StrategyDetail
      accountId="account-1"
      strategy={{
        ...baseStrategy,
        type: 'VR',
        ticker: 'TQQQ',
        divisionCount: undefined,
        initialUsdDeposit: 2000,
        vr: {
          value: 3000,
          bandWidth: 15,
          intervalWeeks: 4,
          recurringAmount: 0,
          poolLimit: 1000,
          gradient: 10,
        },
      }}
    />)

    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('거치식')
  })
```

### Step 2: 테스트 실행해서 실패 확인

Run: `npm run test:run -- StrategyDetail.test.tsx`

Expected: 새로 추가한 3개 테스트 모두 FAIL. (`strategy-meta-grid`에 `운용 방식`/`인출식($100.00)`이 아직 없음, `strategy-vr-grid`에 `주기`/`pool` 라벨이 아직 없음, `strategy-summary-grid`가 여전히 렌더되어 `queryByTestId(...).not.toBeInTheDocument()` 단언 실패)

### Step 3: `StrategyDetail.tsx`에 helper 함수 추가

`widgets/strategy-detail/StrategyDetail.tsx`에서 `previewErrorMsg` 함수(97~103행) 바로 다음, `interface Props`(105행) 바로 앞에 아래 함수를 추가한다.

```tsx
// VR 정기 입출금 부호별 라벨 — 카드 자체가 "운용 방식"을 겸하므로 별도 recurringMode 필드 없이 amount 부호로만 판정한다
function recurringModeLabel(recurringAmount: number): string {
  if (recurringAmount > 0) return `적립식($${fmtUsd(recurringAmount)})`
  if (recurringAmount === 0) return '거치식'
  return `인출식($${fmtUsd(Math.abs(recurringAmount))})`
}
```

### Step 4: meta-grid 블록 교체 — 전략타입 옆에 운용 방식(VR) 또는 다음 사이클(비VR) 표시

`widgets/strategy-detail/StrategyDetail.tsx`에서 아래 블록(현재 198~214행)을 찾는다.

```tsx
      <div data-testid="strategy-meta-grid" className={cn('grid gap-3', isVr ? 'grid-cols-1' : 'grid-cols-2')}>
        <KpiCard
          label="전략타입"
          value={<span className="inline-flex items-center text-xl lg:text-2xl font-bold">{strategy.type}</span>}
          className="p-4 lg:p-5"
          valueClassName="text-xl lg:text-2xl"
        />
        {!isVr && (
          <KpiCard
            label="다음 사이클"
            value={
              <Badge tone="none" size="md" className={cn('h-[28px] lg:h-[36px] text-sm lg:text-base', seedBadgeCls)}>{cycleSeedLabel}</Badge>
            }
            className="p-4 lg:p-5"
          />
        )}
      </div>
```

아래로 교체한다.

```tsx
      <div data-testid="strategy-meta-grid" className="grid grid-cols-2 gap-3">
        <KpiCard
          label="전략타입"
          value={<span className="inline-flex items-center text-xl lg:text-2xl font-bold">{strategy.type}</span>}
          className="p-4 lg:p-5"
          valueClassName="text-xl lg:text-2xl"
        />
        {strategy.vr ? (
          <KpiCard
            label="운용 방식"
            value={<span className="inline-flex items-center text-xl lg:text-2xl font-bold">{recurringModeLabel(strategy.vr.recurringAmount)}</span>}
            className="p-4 lg:p-5"
            valueClassName="text-xl lg:text-2xl"
          />
        ) : (
          <KpiCard
            label="다음 사이클"
            value={
              <Badge tone="none" size="md" className={cn('h-[28px] lg:h-[36px] text-sm lg:text-base', seedBadgeCls)}>{cycleSeedLabel}</Badge>
            }
            className="p-4 lg:p-5"
          />
        )}
      </div>
```

(`isVr` 변수 자체는 Step 5의 summary-grid 가드에서 계속 쓰이므로 삭제하지 않는다.)

### Step 5: summary-grid를 비VR 전용으로 가드

`widgets/strategy-detail/StrategyDetail.tsx`에서 아래 블록(현재 216~233행)을 찾는다.

```tsx
      <div data-testid="strategy-summary-grid" className="grid grid-cols-2 gap-3">
        <KpiCard
          label={usesDivisionCount ? '분할' : '운용 방식'}
          value={<span className="inline-flex items-center text-xl lg:text-2xl font-bold">{usesDivisionCount ? `${strategy.divisionCount}분할` : isVr ? 'VR' : '매매표'}</span>}
          className="p-4 lg:p-5"
          valueClassName="text-xl lg:text-2xl"
        />
        <KpiCard
          label="시작금액"
          value={
            strategy.initialUsdDeposit != null ? (
              <span className="inline-flex items-center text-xl lg:text-3xl font-bold">{`$${fmtUsd(strategy.initialUsdDeposit)}`}</span>
            ) : (
              <span className="inline-flex items-center text-sm lg:text-base text-muted-foreground font-normal">미설정</span>
            )
          }
        />
      </div>
```

아래로 교체한다 (VR은 "시작금액"을 Step 6의 `pool` 카드가 대신하므로 이 블록 자체를 렌더하지 않는다. `isVr ? 'VR' : '매매표'`의 `isVr` 분기는 이제 도달 불가능하므로 제거한다).

```tsx
      {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
      {!strategy.vr && (
        <div data-testid="strategy-summary-grid" className="grid grid-cols-2 gap-3">
          <KpiCard
            label={usesDivisionCount ? '분할' : '운용 방식'}
            value={<span className="inline-flex items-center text-xl lg:text-2xl font-bold">{usesDivisionCount ? `${strategy.divisionCount}분할` : '매매표'}</span>}
            className="p-4 lg:p-5"
            valueClassName="text-xl lg:text-2xl"
          />
          <KpiCard
            label="시작금액"
            value={
              strategy.initialUsdDeposit != null ? (
                <span className="inline-flex items-center text-xl lg:text-3xl font-bold">{`$${fmtUsd(strategy.initialUsdDeposit)}`}</span>
              ) : (
                <span className="inline-flex items-center text-sm lg:text-base text-muted-foreground font-normal">미설정</span>
              )
            }
          />
        </div>
      )}
```

### Step 6: vr-grid를 밴드폭/주기 + G/V/pool/pool상한 3-4열 레이아웃으로 재작성

`widgets/strategy-detail/StrategyDetail.tsx`에서 아래 블록(현재 235~244행)을 찾는다.

```tsx
      {/* VR 전용 KPI 그리드 — strategy.vr 존재 시에만 렌더 */}
      {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
      {strategy.vr && (
        <div data-testid="strategy-vr-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="V값" value={`$${fmtUsd(strategy.vr.value)}`} />
          <KpiCard label="밴드 폭" value={`${strategy.vr.bandWidth}%`} />
          <KpiCard label="pool 상한" value={`$${fmtUsd(strategy.vr.poolLimit)}`} />
          <KpiCard label="G" value={`${strategy.vr.gradient}`} />
        </div>
      )}
```

아래로 교체한다. 밴드 폭/주기 순서는 PC와 모바일이 반대이므로 DOM은 모바일 기준(주기 먼저)으로 두고 `order-*` 유틸리티로 PC에서만 시각 순서를 바꾼다.

```tsx
      {/* VR 전용 KPI 그리드 — strategy.vr 존재 시에만 렌더 */}
      {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
      {strategy.vr && (
        <div data-testid="strategy-vr-grid" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="주기" value={`${strategy.vr.intervalWeeks}주`} className="order-1 lg:order-2" />
            <KpiCard label="밴드 폭" value={`${strategy.vr.bandWidth}%`} className="order-2 lg:order-1" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="G" value={`${strategy.vr.gradient}`} />
            <KpiCard label="V" value={`$${fmtUsd(strategy.vr.value)}`} />
            <KpiCard
              label="pool"
              value={strategy.initialUsdDeposit != null ? `$${fmtUsd(strategy.initialUsdDeposit)}` : '미설정'}
            />
            <KpiCard label="pool 상한" value={`$${fmtUsd(strategy.vr.poolLimit)}`} />
          </div>
        </div>
      )}
```

### Step 7: 테스트 실행해서 통과 확인

Run: `npm run test:run -- StrategyDetail.test.tsx`

Expected: 파일 내 모든 테스트 PASS — Step 1에서 추가한 3개 테스트뿐 아니라, 149~199행의 기존 INFINITE/PRIVACY 테스트도 변경 없이 그대로 PASS해야 한다 (비VR 분기 회귀 확인).

### Step 8: 타입 검사

Run: `npm run typecheck`

Expected: 오류 없음. (`strategy.vr ?` 삼항 분기와 `!strategy.vr &&` 가드 모두 TypeScript가 `strategy.vr`를 해당 블록 내에서 `StrategyVrSummary`로 좁혀야 한다 — `isVr` 변수가 아니라 `strategy.vr` 자체를 조건식에 써야 좁혀짐에 유의)

### Step 9: 커밋

```bash
git add widgets/strategy-detail/StrategyDetail.tsx widgets/strategy-detail/StrategyDetail.test.tsx
git commit -m "$(cat <<'EOF'
fix: VR 전략 상세에 주기·pool 표시, 운용방식 카드 중복 제거

전략타입과 동일 문자열("VR")을 반복 표시하던 운용 방식 카드를
정기 입출금(적립식/거치식/인출식) 정보로 교체하고, 화면에 없던
주기(intervalWeeks)와 pool(현재 시작금액) 카드를 추가한다.
필요한 값이 모두 기존 API 응답에 있어 백엔드 변경은 없다.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review 체크리스트 (실행 전 확인 완료)

- **스펙 커버리지**: 설계 문서의 6개 항목(운용 방식 중복 제거, 주기, pool, pool 상한 유지, G/V 라벨, summary-grid 비VR 가드) 모두 Step 3~6에서 다룸.
- **플레이스홀더 스캔**: 없음 — 모든 스텝에 실제 코드/커맨드 포함.
- **타입 일관성**: `recurringModeLabel(recurringAmount: number): string`은 Step 3에서 정의되고 Step 4에서 그대로 호출된다. `StrategyVrSummary` 필드명(`intervalWeeks`, `bandWidth`, `poolLimit`, `gradient`, `value`, `recurringAmount`)은 `entities/strategy/model/types.ts`와 정확히 일치한다.

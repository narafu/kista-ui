# Account Card Strategy Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계좌 목록 카드에서 전략 개수 요약을 전략별 `P-SOXL` / `I-MAGX` badge로 바꾸고, 각 badge에 전략 상태색 테두리와 텍스트를 적용한다.

**Architecture:** 변경 범위는 `AccountCard` 위젯과 해당 테스트 파일로 제한한다. `AccountCard` 내부에 전략 badge 표시용 로컬 formatter/helper를 두고, 모바일/데스크톱 렌더 양쪽에서 공통 재사용한다. 기존 왼쪽 status accent 집계 로직과 전략/계좌 데이터 흐름은 유지한다.

**Tech Stack:** React 19, Next.js 16, TypeScript, Testing Library, Vitest

## Global Constraints

- 왼쪽 status accent strip은 현재 집계 로직과 시각 표현을 그대로 유지한다.
- `전략 N개` 텍스트는 제거하고, 전략별 badge를 직접 나열한다.
- badge 라벨은 `전략 타입 약어 + '-' + ticker` 형식으로 표기한다.
- 현재 범위의 타입 약어는 `PRIVACY -> P`, `INFINITE -> I`로 고정한다.
- badge 배경은 공통 톤으로 유지하고, 각 badge의 테두리와 텍스트만 전략 상태색을 사용한다.
- 변경 범위는 `widgets/account-card/AccountCard.tsx`와 해당 테스트 파일로 제한한다.

---

### Task 1: AccountCard Badge Rendering

**Files:**
- Modify: `widgets/account-card/AccountCard.test.tsx`
- Modify: `widgets/account-card/AccountCard.tsx`

**Interfaces:**
- Consumes: `AccountCard({ account, strategies })`, `Strategy['type']`, `Strategy['ticker']`, `Strategy['status']`
- Produces: `formatStrategyBadge(strategy: Strategy): string`, `STATUS_ACCENT` reused for badge border/text styling, badge markup rendered in both mobile and desktop card sections

- [ ] **Step 1: Write the failing test**

```tsx
it('renders compact strategy badges with status-colored border and text', () => {
  const { container } = render(
    <AccountCard
      account={baseAccount}
      strategies={[
        { ...baseStrategy, id: 'strategy-1', type: 'PRIVACY', ticker: 'SOXL', status: 'PAUSED' },
        { ...baseStrategy, id: 'strategy-2', type: 'INFINITE', ticker: 'MAGX', status: 'ACTIVE' },
      ]}
    />,
  )

  expect(screen.getAllByText('P-SOXL')).toHaveLength(2)
  expect(screen.getAllByText('I-MAGX')).toHaveLength(2)
  expect(screen.queryByText('전략 2개')).not.toBeInTheDocument()

  const pausedBadge = container.querySelector('[data-testid="strategy-badge-strategy-1-mobile"]')

  expect(pausedBadge).toHaveStyle({
    borderColor: 'var(--warn)',
    color: 'var(--warn)',
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- widgets/account-card/AccountCard.test.tsx`
Expected: FAIL because `P-SOXL` / `I-MAGX` badges do not exist and `전략 2개` is still rendered

- [ ] **Step 3: Write minimal implementation**

```tsx
function strategyTypeShort(type: Strategy['type']) {
  if (type === 'PRIVACY') return 'P'
  if (type === 'INFINITE') return 'I'
  return type
}

function formatStrategyBadge(strategy: Strategy) {
  return `${strategyTypeShort(strategy.type)}-${strategy.ticker}`
}

// mobile
{strategies.length > 0 ? (
  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
    {strategies.map((s) => (
      <span
        key={s.id}
        data-testid={`strategy-badge-${s.id}-mobile`}
        className="inline-flex items-center px-2 h-[20px] rounded-full text-xs font-semibold shrink-0 whitespace-nowrap border bg-muted/40"
        style={{ borderColor: STATUS_ACCENT[s.status], color: STATUS_ACCENT[s.status] }}
      >
        {formatStrategyBadge(s)}
      </span>
    ))}
  </div>
) : (
  <span className="inline-flex items-center px-2 h-[20px] rounded-full text-xs font-semibold shrink-0 bg-muted text-muted-foreground whitespace-nowrap">
    미등록
  </span>
)}

// desktop row
<span
  data-testid={`strategy-badge-${s.id}-desktop`}
  className="inline-flex items-center px-2 h-[20px] rounded-full text-xs font-bold uppercase shrink-0 border bg-muted/40"
  style={{ borderColor: STATUS_ACCENT[s.status], color: STATUS_ACCENT[s.status] }}
>
  {formatStrategyBadge(s)}
</span>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- widgets/account-card/AccountCard.test.tsx`
Expected: PASS with the new compact badges rendered and the old count badge absent

- [ ] **Step 5: Commit**

```bash
git add "widgets/account-card/AccountCard.tsx" "widgets/account-card/AccountCard.test.tsx"
git commit -m "feat: 계좌 카드 전략 뱃지 표시 개선"
```

### Task 2: Verification

**Files:**
- Modify: `widgets/account-card/AccountCard.test.tsx`
- Modify: `widgets/account-card/AccountCard.tsx`

**Interfaces:**
- Consumes: Task 1 badge helper and markup
- Produces: verified implementation with no type errors

- [ ] **Step 1: Run the focused regression suite**

```bash
npm run test:run -- widgets/account-card/AccountCard.test.tsx
```

- [ ] **Step 2: Run type verification**

```bash
npm run typecheck
```

- [ ] **Step 3: Review the final diff**

```bash
git diff -- "widgets/account-card/AccountCard.tsx" "widgets/account-card/AccountCard.test.tsx"
```

- [ ] **Step 4: Commit verified changes**

```bash
git add "widgets/account-card/AccountCard.tsx" "widgets/account-card/AccountCard.test.tsx"
git commit -m "feat: 계좌 카드 전략 뱃지 표시 개선"
```

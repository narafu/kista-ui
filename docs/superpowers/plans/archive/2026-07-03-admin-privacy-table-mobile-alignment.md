# Admin Privacy Table Mobile Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 구간에서 관리자 P 매매표의 `날짜`, `종목`, `시작금액`, `보유` 컬럼 폭과 정렬을 콘텐츠 기준으로 정리한다.

**Architecture:** 기존 단일 `<table>` 구조를 유지하면서 모바일 기본 클래스와 `sm:` 오버라이드만 조정한다. 폭 고정 클래스는 모바일 대상 컬럼에서 제거하고, 헤더/셀 정렬은 모바일과 데스크톱을 분리해 제어한다.

**Tech Stack:** React 19, Next.js 16, TypeScript, Tailwind CSS, Vitest, Testing Library

## Global Constraints

- 대상 파일은 `widgets/admin-privacy-trade-list/AdminPrivacyBaseTable.tsx`와 `widgets/admin-privacy-trade-list/AdminPrivacyBaseTable.test.tsx`로 제한한다.
- 모바일 기본 구간만 변경하고 `sm` 이상 데스크톱 정렬과 레이아웃은 유지한다.
- `날짜`, `종목`, `시작금액`, `보유` 헤더는 모바일에서 모두 가운데 정렬한다.
- 데이터 정렬은 모바일에서 `날짜`, `종목`, `보유`는 가운데 정렬, `시작금액`만 오른쪽 정렬한다.
- 기존 모바일 헤더 축약(`시작금액`)은 유지한다.
- 검증은 `npm run test:run -- widgets/admin-privacy-trade-list/AdminPrivacyBaseTable.test.tsx`와 `npm run typecheck`를 사용한다.

---

### Task 1: Update Mobile Header And Cell Alignment

**Files:**
- Modify: `widgets/admin-privacy-trade-list/AdminPrivacyBaseTable.tsx`
- Modify: `widgets/admin-privacy-trade-list/AdminPrivacyBaseTable.test.tsx`

**Interfaces:**
- Consumes: `AdminPrivacyBaseTable({ bases }: Props)` renders the admin privacy base table using Tailwind utility classes.
- Produces: Updated mobile-only class behavior for the four visible columns plus regression coverage in Vitest.

- [ ] **Step 1: Write the failing test**

```tsx
it('centers the four visible mobile headers and keeps only current cycle start right-aligned', () => {
  render(<AdminPrivacyBaseTable bases={[base]} />)

  const dateHeader = screen.getByRole('columnheader', { name: '날짜' })
  const tickerHeader = screen.getByRole('columnheader', { name: '종목' })
  const startHeader = screen.getByRole('columnheader', { name: /시작금액/ })
  const holdingsHeader = screen.getByRole('columnheader', { name: '보유' })

  const dateCell = screen.getByText('2026-07-02').closest('td')
  const tickerCell = screen.getByText('NVDA').closest('td')
  const startCell = screen.getByText('$1,234.56').closest('td')
  const holdingsCell = screen.getByText('3').closest('td')

  expect(dateHeader).toHaveClass('text-center')
  expect(tickerHeader).toHaveClass('text-center')
  expect(startHeader).toHaveClass('text-center')
  expect(holdingsHeader).toHaveClass('text-center')

  expect(dateCell).toHaveClass('text-center')
  expect(tickerCell).toHaveClass('text-center')
  expect(startCell).toHaveClass('text-right')
  expect(holdingsCell).toHaveClass('text-center')

  expect(startHeader).not.toHaveClass('w-[6.5rem]')
  expect(startCell).not.toHaveClass('w-[6.5rem]')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- widgets/admin-privacy-trade-list/AdminPrivacyBaseTable.test.tsx`

Expected: FAIL because the current mobile classes still use left/right header alignment and width classes on the current cycle start column.

- [ ] **Step 3: Write minimal implementation**

```tsx
<th className="px-2.5 py-3 text-center font-semibold text-muted-foreground whitespace-nowrap sm:px-4 sm:text-left">
  날짜
</th>
<th className="px-2.5 py-3 text-center font-semibold text-muted-foreground whitespace-nowrap sm:px-4 sm:text-left">
  종목
</th>
<th className="px-2.5 py-3 text-center font-semibold text-muted-foreground whitespace-nowrap sm:px-4 sm:text-right">
  <span className="sm:hidden">시작금액</span>
  <span className="hidden sm:inline">사이클 시작금액</span>
</th>
<th className="px-2.5 py-3 text-center font-semibold text-muted-foreground whitespace-nowrap sm:px-4 sm:text-right">
  보유
</th>

<td className="px-2.5 py-3 text-center text-muted-foreground text-xs whitespace-nowrap sm:px-4">
  {b.tradeDate}
</td>
<td className="px-2.5 py-3 text-center whitespace-nowrap sm:px-4 sm:text-left">
  {b.ticker}
</td>
<td className="px-2.5 py-3 text-right font-mono text-xs whitespace-nowrap sm:px-4">
  ${fmtUsd(b.currentCycleStart)}
</td>
<td className="px-2.5 py-3 text-center whitespace-nowrap sm:px-4 sm:text-right">
  {b.holdings}
</td>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- widgets/admin-privacy-trade-list/AdminPrivacyBaseTable.test.tsx`

Expected: PASS with all table spacing and alignment tests green.

- [ ] **Step 5: Run broader verification**

Run: `npm run typecheck`

Expected: PASS with exit code 0.

- [ ] **Step 6: Commit**

```bash
git add widgets/admin-privacy-trade-list/AdminPrivacyBaseTable.tsx widgets/admin-privacy-trade-list/AdminPrivacyBaseTable.test.tsx
git commit -m "fix: 관리자 매매표 모바일 정렬 조정"
```

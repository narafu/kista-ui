# Stats Mobile Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit cycle-performance table header on desktop and make every statistics section readable without horizontal page overflow on mobile.

**Architecture:** Keep the existing stats queries and formatting functions unchanged. Render semantic desktop tables at `sm` and above, render flat label-value summaries below `sm`, and share the same mapped data, filters, loading state, and pagination controls between both views.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, TanStack Query, Recharts, Vitest, Testing Library, Playwright

## Global Constraints

- Scope is limited to `widgets/stats-overview`; API, DTO, aggregation formulas, and React Query data flow must not change.
- Use the existing Tailwind `sm` breakpoint: semantic tables at `sm` and above, labeled summary rows below `sm`.
- Do not create nested cards or add new statistics and filters.
- Keep single quotes, omit semicolons, use `cn()` for dynamic classes, and do not add replaceable inline styles.
- Verification must include the related Vitest file, `npm run typecheck`, and 375px plus desktop browser inspection.

---

### Task 1: Specify Responsive Stats Semantics

**Files:**
- Modify: `widgets/stats-overview/StatsOverview.test.tsx`

**Interfaces:**
- Consumes: `StatsOverview` and the existing mocked `StatsSummary`, `EquityCurve`, and cycle response.
- Produces: regression expectations for semantic desktop column headers and visible mobile label text.

- [ ] **Step 1: Add failing semantic and label assertions to the populated-data test**

After `await screen.findByText('SOXL')`, assert the cycle table and both responsive representations expose their meaning:

```tsx
expect(screen.getByRole('table', { name: '사이클 성과' })).toBeInTheDocument()
expect(screen.getByRole('columnheader', { name: '종목' })).toBeInTheDocument()
expect(screen.getByRole('columnheader', { name: '기간' })).toBeInTheDocument()
expect(screen.getAllByText('손익').length).toBeGreaterThan(0)
expect(screen.getAllByText('수익률').length).toBeGreaterThan(0)
expect(screen.getAllByText('소요일').length).toBeGreaterThan(0)
expect(screen.getAllByText('승률').length).toBeGreaterThan(0)
```

- [ ] **Step 2: Run the focused test and verify the new expectations fail**

Run: `npm run test:run -- widgets/stats-overview/StatsOverview.test.tsx`

Expected: FAIL because the cycle list has no accessible table and mobile label text is absent.

- [ ] **Step 3: Commit the failing regression test**

```bash
git add widgets/stats-overview/StatsOverview.test.tsx
git commit -m 'test: 통계 반응형 표 구조 명세 추가'
```

### Task 2: Implement Responsive Comparison and Cycle Views

**Files:**
- Modify: `widgets/stats-overview/StrategyTypeComparison.tsx`
- Modify: `widgets/stats-overview/CyclePerformanceList.tsx`

**Interfaces:**
- Consumes: `StrategyTypeStats[]`, `useStatsCyclesQuery(typeFilter)`, existing format helpers, `Badge`, and `TableHeadCell`.
- Produces: desktop semantic tables and mobile flat summaries with no changes to component props.

- [ ] **Step 1: Add a mobile strategy comparison list beside the desktop table**

Keep the table in a `hidden sm:block overflow-x-auto` wrapper and add a `sm:hidden divide-y` list. Each item uses one header row and a two-column definition grid:

```tsx
<div className="divide-y sm:hidden">
  {byType.map((item) => (
    <section key={item.type} className="px-4 py-4">
      <Badge tone="brand" size="md">{item.type}</Badge>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div><dt className="text-xs text-muted-foreground">사이클</dt><dd className="mt-0.5 tabular-nums">종료 {item.closedCycleCount} · 진행 {item.activeCycleCount}</dd></div>
        <div><dt className="text-xs text-muted-foreground">승률</dt><dd className="mt-0.5 tabular-nums">{item.winRate != null ? `${Math.round(item.winRate * 100)}%` : '—'}</dd></div>
        <div><dt className="text-xs text-muted-foreground">평균 수익률</dt><dd className={cn('mt-0.5 tabular-nums', item.avgReturnRate != null && pnlTextClass(item.avgReturnRate))}>{item.avgReturnRate != null ? `${item.avgReturnRate >= 0 ? '+' : ''}${(item.avgReturnRate * 100).toFixed(1)}%` : '—'}</dd></div>
        <div><dt className="text-xs text-muted-foreground">평균 소요일</dt><dd className="mt-0.5 tabular-nums">{item.avgDurationDays != null ? `${item.avgDurationDays.toFixed(1)}일` : '—'}</dd></div>
        <div><dt className="text-xs text-muted-foreground">실현손익</dt><dd className={cn('mt-0.5 font-medium tabular-nums', pnlTextClass(item.realizedPnl))}>{fmtSignedUsd(item.realizedPnl, 2, '$')}</dd></div>
        <div><dt className="text-xs text-muted-foreground">미실현</dt><dd className={cn('mt-0.5 font-medium tabular-nums', pnlTextClass(item.unrealizedPnl))}>{fmtSignedUsd(item.unrealizedPnl, 2, '$')}</dd></div>
      </dl>
    </section>
  ))}
</div>
```

Do not introduce new formatter behavior. Import `cn` because conditional template strings are replaced with `cn()`.

- [ ] **Step 2: Replace the desktop cycle `div` rows with a semantic table**

Wrap it in `hidden sm:block overflow-x-auto`, set `aria-label="사이클 성과"`, and define these columns:

```tsx
<table className="w-full min-w-[720px] text-sm" aria-label="사이클 성과">
  <thead className="bg-muted/50">
    <tr>
      <TableHeadCell className="text-left">전략</TableHeadCell>
      <TableHeadCell className="text-left">종목</TableHeadCell>
      <TableHeadCell className="text-left">기간</TableHeadCell>
      <TableHeadCell className="text-right">손익</TableHeadCell>
      <TableHeadCell className="text-right">수익률</TableHeadCell>
      <TableHeadCell className="text-right">소요일</TableHeadCell>
    </tr>
  </thead>
  <tbody>
    {cycles.map((cycle) => (
      <tr key={cycle.cycleId} className="border-t transition-colors hover:bg-muted/30">
        <td className="px-4 py-3"><Badge tone="brand" size="sm">{cycle.strategyType}</Badge></td>
        <td className="px-4 py-3 font-medium tabular-nums">{cycle.ticker ?? '—'}</td>
        <td className="px-4 py-3 text-muted-foreground">{fmtDate(cycle.startDate)} ~ {cycle.endDate ? fmtDate(cycle.endDate) : '진행 중'} {!cycle.closed && <Badge tone="neutral" size="sm">진행 중</Badge>}</td>
        <td className={cn('px-4 py-3 text-right tabular-nums', cycle.pnl != null ? pnlTextClass(cycle.pnl) : 'text-muted-foreground')}>{cycle.pnl != null ? fmtSignedUsd(cycle.pnl, 2, '$') : '—'}</td>
        <td className={cn('px-4 py-3 text-right tabular-nums', cycle.returnRate != null ? pnlTextClass(cycle.returnRate) : 'text-muted-foreground')}>{cycle.returnRate != null ? `${cycle.returnRate >= 0 ? '+' : ''}${(cycle.returnRate * 100).toFixed(1)}%` : '—'}</td>
        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{cycle.durationDays != null ? `${cycle.durationDays}일` : '—'}</td>
      </tr>
    ))}
  </tbody>
</table>
```

Import `TableHeadCell`. Preserve the current `Badge`, date, PnL, return-rate, duration, and active-state expressions exactly.

- [ ] **Step 3: Add the mobile cycle summary list**

Render the same `cycles` in `sm:hidden divide-y`. Each flat item has a strategy/ticker header, a date line with active badge, and a three-column definition grid:

```tsx
<section className="px-4 py-4">
  <div className="flex items-center justify-between gap-3">
    <Badge tone="brand" size="sm">{cycle.strategyType}</Badge>
    <span className="text-sm font-semibold tabular-nums">{cycle.ticker ?? '—'}</span>
  </div>
  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
    {fmtDate(cycle.startDate)} ~ {cycle.endDate ? fmtDate(cycle.endDate) : '진행 중'}
    {!cycle.closed && <Badge tone="neutral" size="sm">진행 중</Badge>}
  </div>
  <dl className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-right">
    <div><dt className="text-xs text-muted-foreground">손익</dt><dd className={cn('mt-1 text-sm tabular-nums', cycle.pnl != null ? pnlTextClass(cycle.pnl) : 'text-muted-foreground')}>{cycle.pnl != null ? fmtSignedUsd(cycle.pnl, 2, '$') : '—'}</dd></div>
    <div><dt className="text-xs text-muted-foreground">수익률</dt><dd className={cn('mt-1 text-sm tabular-nums', cycle.returnRate != null ? pnlTextClass(cycle.returnRate) : 'text-muted-foreground')}>{cycle.returnRate != null ? `${cycle.returnRate >= 0 ? '+' : ''}${(cycle.returnRate * 100).toFixed(1)}%` : '—'}</dd></div>
    <div><dt className="text-xs text-muted-foreground">소요일</dt><dd className="mt-1 text-sm tabular-nums text-muted-foreground">{cycle.durationDays != null ? `${cycle.durationDays}일` : '—'}</dd></div>
  </dl>
</section>
```

Keep one shared loading/empty-state branch and one shared pagination control outside the desktop/mobile wrappers.

- [ ] **Step 4: Make the strategy filter stable on narrow screens**

Stack the cycle card header below `sm`, and make the segmented control a one-line horizontal scroller:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <CardTitle className="text-base lg:text-lg">사이클 성과</CardTitle>
  <div className="-mx-1 flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md border border-border p-0.5">
    <button type="button" onClick={() => setTypeFilter(undefined)} className={cn('min-h-9 shrink-0 rounded px-2 text-xs font-medium transition-colors', typeFilter === undefined ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>전체</button>
    {byType.map((item) => <button key={item.type} type="button" title={item.type} onClick={() => setTypeFilter(item.type)} className={cn('min-h-9 shrink-0 rounded px-2 text-xs font-medium transition-colors', typeFilter === item.type ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>{strategyTypeShort(item.type)}</button>)}
  </div>
</div>
```

Use `shrink-0` and a minimum 36px height on filter buttons so labels do not wrap and remain touchable.

- [ ] **Step 5: Run the focused test and verify it passes**

Run: `npm run test:run -- widgets/stats-overview/StatsOverview.test.tsx`

Expected: all `StatsOverview` tests PASS.

- [ ] **Step 6: Commit the responsive data views**

```bash
git add widgets/stats-overview/StrategyTypeComparison.tsx widgets/stats-overview/CyclePerformanceList.tsx
git commit -m '통계 표 모바일 요약 보기 추가'
```

### Task 3: Tighten KPI and Chart Layouts

**Files:**
- Modify: `widgets/stats-overview/StatsKpiRow.tsx`
- Modify: `widgets/stats-overview/EquityCurveChart.tsx`

**Interfaces:**
- Consumes: existing `StatsSummary`, `RangeKey`, normalized chart rows, and `KpiCard` class hooks.
- Produces: the same component props and behavior with compact mobile dimensions.

- [ ] **Step 1: Use a compact two-column KPI layout on mobile**

Change the grid to two columns below `sm`, let the last KPI span both columns, and reduce only mobile padding/type through `KpiCard` classes:

```tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
  <KpiCard label="총 실현손익" value={fmtSignedUsd(summary.totalRealizedPnl, 2, '$')} sub={`종료 사이클 ${closedCount}개 누적`} className="min-w-0 p-4 sm:p-5" valueClassName={cn('break-words text-xl sm:text-2xl lg:text-3xl', pnlTextClass(summary.totalRealizedPnl))} />
  <KpiCard label="미실현 평가손익" value={fmtSignedUsd(summary.totalUnrealizedPnl, 2, '$')} sub={`진행 중 사이클 ${activeCount}개`} className="min-w-0 p-4 sm:p-5" valueClassName={cn('break-words text-xl sm:text-2xl lg:text-3xl', pnlTextClass(summary.totalUnrealizedPnl))} />
  <KpiCard label="운용 원금" value={`$${fmtUsd(summary.activePrincipal)}`} sub="진행 중 사이클 시드 합" className="col-span-2 min-w-0 p-4 sm:col-span-1 sm:p-5" valueClassName="break-words text-xl sm:text-2xl lg:text-3xl" />
</div>
```

Import `cn` and keep all existing values and descriptions.

- [ ] **Step 2: Reflow the chart header and controls for mobile**

Use a stacked header below `sm`, make the range control a full-width five-column segmented control, and give every option a stable minimum 36px height:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <CardTitle className="text-base lg:text-lg">누적 자산 추이</CardTitle>
  <div className="grid w-full grid-cols-5 rounded-md border border-border p-0.5 sm:w-auto">
    {RANGE_OPTIONS.map((option) => <ToggleButton key={option.value} active={range === option.value} onClick={() => onRangeChange(option.value)}>{option.label}</ToggleButton>)}
  </div>
</div>
```

Change `ToggleButton` to fill its grid cell. Keep the existing selected and hover colors.

- [ ] **Step 3: Recover chart width on mobile**

Set responsive card padding with `CardContent className="px-2 pb-4 sm:px-6 sm:pb-6"`, set the mobile chart height to 240px while retaining 280px from `sm`, and reduce Y-axis width from 36 to 32. Use a CSS-sized wrapper around `ResponsiveContainer` instead of adding viewport-dependent JavaScript.

- [ ] **Step 4: Run tests and typecheck**

Run:

```bash
npm run test:run -- widgets/stats-overview/StatsOverview.test.tsx
npm run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit compact KPI and chart layouts**

```bash
git add widgets/stats-overview/StatsKpiRow.tsx widgets/stats-overview/EquityCurveChart.tsx
git commit -m '통계 KPI와 차트 모바일 배치 개선'
```

### Task 4: Browser Verification and Final Regression

**Files:**
- Modify only files from Tasks 1-3 if visual defects are found.

**Interfaces:**
- Consumes: the running Next.js stats page and existing authenticated local environment.
- Produces: verified desktop and mobile layouts with no page-level horizontal overflow.

- [ ] **Step 1: Start the development server**

Run: `npm run dev`

Expected: Next.js reports a local URL. If port 3000 is occupied, use the next available port and record it.

- [ ] **Step 2: Inspect a 375x812 mobile viewport**

Use the repository Playwright workflow to open `/stats`. Verify:

```text
document.documentElement.scrollWidth === document.documentElement.clientWidth
KPI values do not overlap
range controls remain one row
chart canvas/SVG is nonblank and readable
comparison items show visible labels
cycle items show 손익, 수익률, 소요일 labels
filter control scrolls inside its own width
bottom navigation does not cover the final control
```

Capture a screenshot for visual review.

- [ ] **Step 3: Inspect a 1440x1000 desktop viewport**

Verify both tables show aligned headers and rows, the cycle table exposes all six columns without clipping, and the chart remains 280px high. Capture a screenshot.

- [ ] **Step 4: Fix any visual defect and repeat both viewport checks**

Limit fixes to the files listed in Tasks 1-3. Repeat overflow and overlap assertions after every change.

- [ ] **Step 5: Run final verification**

Run:

```bash
npm run test:run -- widgets/stats-overview/StatsOverview.test.tsx
npm run typecheck
git diff --check
```

Expected: tests pass, typecheck exits 0, and `git diff --check` prints no output.

- [ ] **Step 6: Commit verification fixes and completed plan state**

```bash
git add widgets/stats-overview docs/superpowers/plans/2026-07-18-stats-mobile-layout.md
git commit -m '통계 페이지 모바일 레이아웃 개선 완료'
```

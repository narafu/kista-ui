# 가계부 예산 탭 이동·레이아웃 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 가계부 설정에 있던 예산 관리를 수입/소비/저축 탭의 "예산등록" 버튼으로 옮기고, 탭 순서(자산 맨앞)·탭 내부 섹션 순서·연간 모드 UI(연도 선택·전년대비)·내역 복제·카테고리 정렬순서 하한을 개편한다.

**Architecture:** 기존 FSD 계층(app→widgets→features→entities→shared)과 finance 도메인의 12개월 슬라이딩 윈도우 쿼리 패턴을 그대로 따른다. 새 컴포넌트는 `features/finance/manage-budgets/BudgetManagerDialog`(예산 CRUD를 다이얼로그로 감싼 트리거 버튼) 하나뿐이고, 나머지는 기존 컴포넌트의 props/렌더 순서 조정이다. 전년대비는 기존 12개월 윈도우로 커버되지 않아 `period.mode === 'yearly'`일 때만 추가로 전년 동기간 거래를 조회하는 두 번째 쿼리를 도입한다.

**Tech Stack:** Next.js 16, React Query, TypeScript, vitest + @testing-library/react

**참고 문서:** `docs/superpowers/specs/2026-08-21-finance-budget-tabs-design.md`

---

## Task 1: `period.ts` — 전년 동기간 range 계산 함수

**Files:**
- Modify: `entities/finance/lib/period.ts`
- Modify: `entities/finance/lib/period.test.ts`
- Modify: `entities/finance/index.ts:141`

- [ ] **Step 1: 실패하는 테스트 작성**

`entities/finance/lib/period.test.ts`에 추가:

```ts
describe('previousYearRange', () => {
  it('연간 모드 선택월의 전년 1월~동일월 말일 범위를 반환한다', () => {
    expect(previousYearRange({ month: '2026-08', mode: 'yearly' })).toEqual({
      from: '2025-01-01',
      to: '2025-08-31',
    })
  })
})
```

파일 상단 import에 `previousYearRange` 추가.

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- period.test.ts`
Expected: FAIL — `previousYearRange is not a function` / not exported

- [ ] **Step 3: 구현**

`entities/finance/lib/period.ts` 파일 끝(`elapsedMonthsInYear` 함수 뒤)에 추가:

```ts
// 연간(YTD) 모드의 "전년대비" 비교 대상 범위 — 선택 연도 전년 1월부터 선택월과 동일한 월까지.
export function previousYearRange(period: Period): { from: string; to: string } {
  const prevYear = Number(period.month.slice(0, 4)) - 1
  const mm = period.month.slice(5, 7)
  return { from: `${prevYear}-01-01`, to: monthEndDate(`${prevYear}-${mm}`) }
}
```

`entities/finance/index.ts:141` 줄의 export 목록에 `previousYearRange` 추가:

```ts
export { daysInMonth, elapsedDaysInMonth, elapsedMonthsInYear, monthEndDate, monthStartDate, periodRange, previousYearRange, shiftMonth, windowRange } from './lib/period'
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- period.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add entities/finance/lib/period.ts entities/finance/lib/period.test.ts entities/finance/index.ts
git commit -m "feat(finance): 연간 모드 전년대비 range 계산 함수 추가"
```

---

## Task 2: `useFinanceTransactionsQuery` — enabled 옵션 지원

**Files:**
- Modify: `entities/finance/hooks/useFinanceQueries.ts:54-57`

- [ ] **Step 1: 구현** (이 훅은 별도 유닛 테스트가 없고 FinanceDashboard 통합 테스트로 검증됨 — Task 6에서 검증)

```ts
// from/to는 lib/period.ts의 windowRange(month) — 수입/소비/저축 탭이 공유하는 12개월 윈도우.
// enabled: 연간 모드 전년대비 쿼리처럼 조건부로만 실행해야 하는 호출부를 위한 옵션(기본 true).
export function useFinanceTransactionsQuery(from: string, to: string, options?: { enabled?: boolean }) {
  const groupId = useActiveGroupId()
  return useQuery({ ...transactionListQueryOptions(groupId, from, to), enabled: options?.enabled ?? true })
}
```

- [ ] **Step 2: 타입 체크**

Run: `npm run typecheck`
Expected: 이 파일 관련 오류 없음 (기존 단일 호출부는 옵션 없이도 그대로 컴파일됨)

- [ ] **Step 3: 커밋**

```bash
git add entities/finance/hooks/useFinanceQueries.ts
git commit -m "feat(finance): useFinanceTransactionsQuery에 enabled 옵션 추가"
```

---

## Task 3: `FinanceBudgetProgress` — INCOME 타입 허용

**Files:**
- Modify: `widgets/finance-budget-progress/FinanceBudgetProgress.tsx:12`

- [ ] **Step 1: Props 타입 확장**

`widgets/finance-budget-progress/FinanceBudgetProgress.tsx:12` 줄:

```ts
  type: 'EXPENSE' | 'SAVING'
```
을
```ts
  type: 'INCOME' | 'EXPENSE' | 'SAVING'
```
로 변경.

- [ ] **Step 2: 타입 체크**

Run: `npm run typecheck`
Expected: PASS (내부 로직은 `type`을 필터링에만 쓰고 EXPENSE/SAVING 전용 분기가 없어 영향 없음)

- [ ] **Step 3: 커밋**

```bash
git add widgets/finance-budget-progress/FinanceBudgetProgress.tsx
git commit -m "feat(finance): 예산 대비 위젯에 수입 타입 허용"
```

---

## Task 4: `BudgetManager` — type prop으로 전환 (세그먼트 제거)

**Files:**
- Modify: `features/finance/manage-budgets/BudgetManager.tsx`
- Modify: `features/finance/manage-budgets/BudgetManager.test.tsx` (파일 없으면 생성 — 기존 테스트 존재 여부는 Step 1에서 확인)

- [ ] **Step 1: 기존 테스트 확인**

Run: `ls features/finance/manage-budgets/*.test.tsx 2>/dev/null || echo none`

테스트 파일이 있으면 `type` prop을 받는 새 시그니처에 맞게 렌더 호출부(`render(<BudgetManager type="EXPENSE" />)`)를 수정하고 "예산 유형" 세그먼트 관련 assertion을 제거한다. 없으면 이 Task는 컴포넌트 리팩터링만 진행한다(수동 확인은 Task 6 통합 테스트가 대체).

- [ ] **Step 2: 구현**

`features/finance/manage-budgets/BudgetManager.tsx` 전체를 다음으로 교체:

```tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@shared/ui/EmptyState'
import { ConfirmDeleteDialog } from '@shared/ui/ConfirmDeleteDialog'
import { fmtKrw } from '@shared/lib/format'
import { useConfirmDialog } from '@shared/lib/hooks/use-confirm-dialog'
import { getCategoryPath, useDeleteFinanceBudgetMutation, useFinanceBudgetsQuery, useFinanceCategoriesQuery } from '@entities/finance'
import type { FinanceBudget } from '@entities/finance'
import { BudgetFormDialog } from './BudgetFormDialog'

interface Props {
  type: 'INCOME' | 'EXPENSE' | 'SAVING'
}

// 예산 유형은 더 이상 이 컴포넌트가 스스로 고르지 않는다 — 호출부(BudgetManagerDialog)가
// 수입/소비/저축 탭 컨텍스트에서 이미 고정된 type을 넘긴다(설정 화면의 독립 세그먼트 UI는 폐기).
export function BudgetManager({ type }: Props) {
  const { data: categories = [] } = useFinanceCategoriesQuery(type)
  const { data: allBudgets = [] } = useFinanceBudgetsQuery()

  const budgets = allBudgets.filter((b) => getCategoryPath(categories, b.categoryId).length > 0)

  const [formTarget, setFormTarget] = useState<FinanceBudget | 'new' | null>(null)
  const deleteDialog = useConfirmDialog<FinanceBudget>()
  const deleteMutation = useDeleteFinanceBudgetMutation()

  function handleDelete() {
    if (!deleteDialog.target) return
    deleteMutation.mutate(deleteDialog.target.id, {
      onSuccess: () => {
        toast.success('예산이 삭제되었습니다')
        deleteDialog.close()
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" className="gap-1.5" onClick={() => setFormTarget('new')}>
          <Plus className="size-4" />
          예산 추가
        </Button>
      </div>

      {budgets.length === 0 ? (
        <EmptyState variant="text" message="등록된 예산이 없습니다." />
      ) : (
        <ul className="m-0 list-none divide-y rounded-[var(--r-lg)] border border-border p-0">
          {budgets.map((budget) => {
            const path = getCategoryPath(categories, budget.categoryId)
            const categoryName = path[path.length - 1]?.name ?? '(삭제된 카테고리)'
            return (
              <li key={budget.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{categoryName}</p>
                  <p className="text-xs text-muted-foreground">
                    {budget.applyStartDate} ~ {budget.applyEndDate ?? '무기한'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium tabular-nums">{fmtKrw(budget.amount)}</span>
                  <button type="button" onClick={() => setFormTarget(budget)} className="text-xs font-semibold text-foreground hover:text-[var(--brand-fg-soft)]">수정</button>
                  <button type="button" onClick={() => deleteDialog.request(budget)} className="text-xs font-semibold text-destructive hover:text-destructive/80">삭제</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {formTarget && (
        <BudgetFormDialog
          open
          onOpenChange={(next) => { if (!next) setFormTarget(null) }}
          categoryTree={categories}
          budget={formTarget === 'new' ? null : formTarget}
          onSuccess={() => setFormTarget(null)}
        />
      )}

      {deleteDialog.target && (
        <ConfirmDeleteDialog
          open
          onOpenChange={deleteDialog.onOpenChange}
          title="예산을 삭제하시겠습니까?"
          description="삭제한 예산은 복구할 수 없습니다."
          onConfirm={handleDelete}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
```

(`cn` import와 로컬 `TypeButton` 정의를 제거했다 — 세그먼트 UI가 사라져 더 이상 쓰이지 않는다.)

- [ ] **Step 3: 타입 체크 + 테스트**

Run: `npm run typecheck && npm test -- manage-budgets`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add features/finance/manage-budgets/BudgetManager.tsx
git commit -m "refactor(finance): BudgetManager가 예산 유형을 prop으로 받도록 변경"
```

---

## Task 5: `BudgetManagerDialog` 신설 — "예산등록" 버튼

**Files:**
- Create: `features/finance/manage-budgets/BudgetManagerDialog.tsx`
- Create: `features/finance/manage-budgets/BudgetManagerDialog.test.tsx`
- Modify: `features/finance/manage-budgets/index.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`features/finance/manage-budgets/BudgetManagerDialog.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BudgetManagerDialog } from './BudgetManagerDialog'

vi.mock('@entities/meta', () => ({
  useMeta: () => ({ labelOf: (_group: string, code: string) => (code === 'EXPENSE' ? '소비' : code) }),
}))
vi.mock('./BudgetManager', () => ({
  BudgetManager: ({ type }: { type: string }) => <div data-testid="budget-manager">{type}</div>,
}))

describe('BudgetManagerDialog', () => {
  it('버튼 클릭 전에는 다이얼로그가 마운트되지 않는다', () => {
    render(<BudgetManagerDialog type="EXPENSE" />)
    expect(screen.queryByTestId('budget-manager')).not.toBeInTheDocument()
  })

  it('예산 등록 버튼을 클릭하면 해당 타입의 BudgetManager가 담긴 다이얼로그가 열린다', async () => {
    const user = userEvent.setup()
    render(<BudgetManagerDialog type="EXPENSE" />)

    await user.click(screen.getByRole('button', { name: '예산 등록' }))

    expect(screen.getByText('소비 예산 관리')).toBeInTheDocument()
    expect(screen.getByTestId('budget-manager')).toHaveTextContent('EXPENSE')
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- BudgetManagerDialog.test.tsx`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 구현**

`features/finance/manage-budgets/BudgetManagerDialog.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@shared/lib/utils'
import { useMeta } from '@entities/meta'
import { BudgetManager } from './BudgetManager'

interface Props {
  type: 'INCOME' | 'EXPENSE' | 'SAVING'
  className?: string
}

// NewTransactionButton(내역 등록)과 나란히 배치되는 보조 액션이라 그라디언트 대신 outline으로
// 위계를 낮춘다. CategoryManager 등과 동일하게 열릴 때만 Dialog(+ BudgetManager)를 마운트한다 —
// 상시 마운트하면 BudgetManager 내부 useState(formTarget 등)가 다음 열림에도 초기화되지 않는다.
export function BudgetManagerDialog({ type, className }: Props) {
  const { labelOf } = useMeta()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-accent',
          className,
        )}
      >
        <Plus className="size-3.5" />
        예산 등록
      </button>
      {open && (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{`${labelOf('financeCategoryTypes', type)} 예산 관리`}</DialogTitle>
              <DialogDescription>카테고리별 월 예산을 등록·수정·삭제합니다.</DialogDescription>
            </DialogHeader>
            <BudgetManager type={type} />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
```

`features/finance/manage-budgets/index.ts`:

```ts
export { BudgetManager } from './BudgetManager'
export { BudgetManagerDialog } from './BudgetManagerDialog'
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- BudgetManagerDialog.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add features/finance/manage-budgets/BudgetManagerDialog.tsx features/finance/manage-budgets/BudgetManagerDialog.test.tsx features/finance/manage-budgets/index.ts
git commit -m "feat(finance): 탭 상단 예산등록 버튼(BudgetManagerDialog) 추가"
```

---

## Task 6: `AssetSettingsPanel` — 예산 카드 제거

**Files:**
- Modify: `widgets/asset-settings/AssetSettingsPanel.tsx`

- [ ] **Step 1: 구현**

`widgets/asset-settings/AssetSettingsPanel.tsx`에서 `BudgetManager` import(5행)와 "예산" `Surface` 블록(27-31행)을 제거하고, 주석(10-17행)에서 예산 관련 문장을 삭제:

```tsx
'use client'

import { CategoryManager } from '@features/finance/manage-categories'
import { AccountManager } from '@features/finance/manage-accounts'
import { StrategySuggestionManager } from '@features/finance/manage-strategy-suggestions'
import { GroupManager } from '@features/finance/manage-group'
import { Surface } from '@shared/ui/Surface'

// 자산 탭의 5번째 세그먼트("설정")를 구성하는 조합 위젯 — SettingsPageContent와 동일하게
// features 슬라이스를 Surface 카드로 묶어 나열한다. 카테고리·계좌는 서로 다른 리소스라
// AccountManager가 자체 카드(bg-card 배경)를 갖고 있어 이 컴포넌트가 다시 Surface로
// 감싸지 않는다 — CategoryManager/GroupManager는 카드 배경이 없어 Surface로 감싼다.
// StrategySuggestionManager는 ADMIN이 아니면 스스로 null을 반환한다(구 admin/settings 폼의
// 전역 설정을 계좌관리 아래로 이관 — 일반 사용자도 방문하는 탭이라 컴포넌트 자체가 게이팅한다).
// 예산 관리는 수입/소비/저축 탭 상단 "예산등록" 버튼(BudgetManagerDialog)으로 이관됐다(2026-08).
export function AssetSettingsPanel() {
  return (
    <div className="flex flex-col gap-[18px]">
      <Surface as="section" className="p-6">
        <div className="text-sm font-bold mb-0.5">카테고리</div>
        <div className="text-sm text-muted-foreground mb-[18px]">자산·수입·지출·저축 카테고리를 관리합니다.</div>
        <CategoryManager />
      </Surface>

      <AccountManager />

      <StrategySuggestionManager />

      <GroupManager />
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add widgets/asset-settings/AssetSettingsPanel.tsx
git commit -m "refactor(finance): 설정 탭에서 예산 관리 카드 제거"
```

---

## Task 7: `FinanceSummary` — 연간 모드 연도 입력 + 전년대비

**Files:**
- Modify: `widgets/finance-summary/FinanceSummary.tsx`
- Modify: `widgets/finance-summary/FinanceSummary.test.tsx` (없으면 생성)

- [ ] **Step 1: 기존 테스트 확인 및 실패하는 테스트 추가**

Run: `ls widgets/finance-summary/*.test.tsx 2>/dev/null || echo none`

`widgets/finance-summary/FinanceSummary.test.tsx`에 다음 테스트가 없으면 추가(파일이 없으면 새로 작성, 최소 기존 스타일에 맞춰 `@entities/meta`의 `useMeta` mock 포함):

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FinanceSummary } from './FinanceSummary'
import type { FinanceTransaction } from '@entities/finance'

vi.mock('@entities/meta', () => ({
  useMeta: () => ({ labelOf: () => '소비' }),
}))

const index = new Map([['cat-1', { type: 'EXPENSE' as const, rootId: 'cat-1', name: '식비' }]])

function tx(date: string, amount: number): FinanceTransaction {
  return { id: date + amount, categoryId: 'cat-1', transactionDate: date, amount, memo: undefined } as FinanceTransaction
}

describe('FinanceSummary 연간 모드', () => {
  it('연간 모드일 때 월 선택 input 대신 연도 숫자 입력을 렌더한다', () => {
    render(
      <FinanceSummary
        type="EXPENSE"
        transactions={[]}
        index={index}
        isLoading={false}
        isError={false}
        period={{ month: '2026-08', mode: 'yearly' }}
        onPeriodChange={() => {}}
      />,
    )
    expect(screen.queryByLabelText('기준 월')).not.toBeInTheDocument()
    expect(screen.getByLabelText('기준 연도')).toHaveValue(2026)
  })

  it('연간 모드에서 전년 동기간 거래가 있으면 전년 대비 카드를 보여준다', () => {
    render(
      <FinanceSummary
        type="EXPENSE"
        transactions={[tx('2026-03-01', 30000)]}
        index={index}
        isLoading={false}
        isError={false}
        period={{ month: '2026-08', mode: 'yearly' }}
        onPeriodChange={() => {}}
        previousYearTransactions={[tx('2025-03-01', 10000)]}
      />,
    )
    expect(screen.getByText('전년 대비')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- finance-summary`
Expected: FAIL — `기준 연도` label 없음 / `previousYearTransactions` prop 미지원

- [ ] **Step 3: 구현**

`widgets/finance-summary/FinanceSummary.tsx` 전체 교체:

```tsx
'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionError } from '@shared/ui/SectionError'
import { fmtKrw, fmtSignedKrw, pnlTextClass, todayKst } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import { useMeta } from '@entities/meta'
import { calcFlowSummary, elapsedDaysInMonth, elapsedMonthsInYear, filterByType, previousYearRange } from '@entities/finance'
import type { CategoryIndex, FinanceCategoryType, FinanceTransaction, Period, PeriodMode } from '@entities/finance'
import { KpiCard } from '@widgets/kpi-card'

interface Props {
  type: FinanceCategoryType
  transactions: FinanceTransaction[]
  index: CategoryIndex
  isLoading: boolean
  isError: boolean
  period: Period
  onPeriodChange: (period: Period) => void
  // 연간 모드 전년대비 전용 — period.mode==='yearly'일 때만 부모(FinanceDashboard)가 조회해 넘긴다.
  // 기존 12개월 슬라이딩 윈도우(windowRange)로는 전년 동기간을 커버할 수 없어 별도 쿼리가 필요하다.
  previousYearTransactions?: FinanceTransaction[]
}

const MODE_OPTIONS: { value: PeriodMode; label: string }[] = [
  { value: 'monthly', label: '월간' },
  { value: 'yearly', label: '연간' },
]

// FinanceDashboard.tsx의 로컬 TabButton과 동일한 스타일 — widget cross-import 금지라 직접 복제.
function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-9 rounded px-3 py-1 text-sm font-medium transition-colors',
        active
          ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}

export function FinanceSummary({ type, transactions, index, isLoading, isError, period, onPeriodChange, previousYearTransactions }: Props) {
  const { labelOf } = useMeta()

  const typeTransactions = useMemo(() => filterByType(transactions, index, type), [transactions, index, type])
  const summary = useMemo(() => calcFlowSummary(typeTransactions, period), [typeTransactions, period])
  // 소비는 늘어난 게 나쁜 신호라 색상 부호를 뒤집는다 — AssetOverview의 부채(isLiability) 델타
  // 반전과 같은 이유. 수입·저축은 늘어난 게 좋은 신호라 그대로 둔다.
  const previousDelta = summary.previousTotal !== null ? summary.total - summary.previousTotal : null

  const previousYearTotal = useMemo(() => {
    if (period.mode !== 'yearly' || !previousYearTransactions) return null
    const { from, to } = previousYearRange(period)
    return filterByType(previousYearTransactions, index, type)
      .filter((t) => t.transactionDate >= from && t.transactionDate <= to)
      .reduce((sum, t) => sum + t.amount, 0)
  }, [period, previousYearTransactions, index, type])
  const previousYearDelta = previousYearTotal !== null ? summary.total - previousYearTotal : null

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base lg:text-lg">{labelOf('financeCategoryTypes', type)} 요약</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {period.mode === 'monthly' ? (
            <input
              type="month"
              aria-label="기준 월"
              value={period.month}
              onChange={(e) => { if (e.target.value) onPeriodChange({ ...period, month: e.target.value }) }}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            />
          ) : (
            <input
              type="number"
              aria-label="기준 연도"
              value={Number(period.month.slice(0, 4))}
              onChange={(e) => {
                if (!e.target.value) return
                onPeriodChange({ ...period, month: `${e.target.value}-${period.month.slice(5, 7)}` })
              }}
              className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm"
            />
          )}
          <div role="group" aria-label="기간 모드" className="grid grid-cols-2 rounded-md border border-border p-0.5">
            {MODE_OPTIONS.map((option) => (
              <ModeButton
                key={option.value}
                active={period.mode === option.value}
                onClick={() => onPeriodChange({ ...period, mode: option.value })}
              >
                {option.label}
              </ModeButton>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">불러오는 중…</div>
        ) : isError ? (
          <SectionError message="요약을 불러오지 못했습니다" />
        ) : summary.count === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">표시할 거래내역이 없습니다</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="합계" value={fmtKrw(summary.total)} variant="accent" valueClassName="break-words text-base sm:text-2xl lg:text-3xl" />
            <KpiCard label="건수" value={`${summary.count}건`} valueClassName="break-words text-base sm:text-2xl lg:text-3xl" />
            {period.mode === 'monthly' && previousDelta !== null && (
              <KpiCard
                label="전월 대비"
                value={fmtSignedKrw(previousDelta)}
                valueClassName={cn('break-words text-base sm:text-2xl lg:text-3xl', pnlTextClass(type === 'EXPENSE' ? -previousDelta : previousDelta))}
              />
            )}
            {period.mode === 'yearly' && previousYearDelta !== null && (
              <KpiCard
                label="전년 대비"
                value={fmtSignedKrw(previousYearDelta)}
                valueClassName={cn('break-words text-base sm:text-2xl lg:text-3xl', pnlTextClass(type === 'EXPENSE' ? -previousYearDelta : previousYearDelta))}
              />
            )}
            <KpiCard
              label={period.mode === 'monthly' ? '일평균' : '월평균'}
              value={fmtKrw(
                Math.round(
                  summary.total /
                    (period.mode === 'monthly' ? elapsedDaysInMonth(period.month, todayKst()) : elapsedMonthsInYear(period.month)),
                ),
              )}
              valueClassName="break-words text-base sm:text-2xl lg:text-3xl"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- finance-summary`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add widgets/finance-summary/FinanceSummary.tsx widgets/finance-summary/FinanceSummary.test.tsx
git commit -m "feat(finance): 요약 위젯 연간 모드 연도 입력·전년대비 지표 추가"
```

---

## Task 8: `TransactionFormDialog` — 복제(duplicateFrom) 지원

**Files:**
- Modify: `features/finance/save-transaction/TransactionFormDialog.tsx`

- [ ] **Step 1: 구현**

`Props` 인터페이스(21-36행)에 `duplicateFrom` 추가:

```ts
interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: FinanceCategoryType
  initial?: FinanceTransaction
  // 내역 복제 전용 — initial과 달리 id를 갖지 않아 항상 create 모드로 제출된다. 카테고리·금액·메모만
  // 프리필하고 날짜는 오늘로 초기화한다(clampDate 기본 동작 그대로 유지 — 아래서 별도 처리 안 함).
  duplicateFrom?: Pick<FinanceTransaction, 'categoryId' | 'amount' | 'memo'>
  onSuccess: () => void
  windowFrom?: string
  windowTo?: string
}
```

컴포넌트 본문(44-63행)을 다음으로 교체 — `initial` 단독으로 쓰이던 프리필 소스를 `seed = initial ?? duplicateFrom`으로 통일하되 `mode`와 날짜 기본값은 `initial`에만 반응하도록 분리:

```tsx
export function TransactionFormDialog({ open, onOpenChange, type, initial, duplicateFrom, onSuccess, windowFrom, windowTo }: Props) {
  const mode = initial ? 'edit' : 'create'
  const { data: categories = [] } = useFinanceCategoriesQuery(type)
  const seed = initial ?? duplicateFrom

  const [transactionDate, setTransactionDate] = useState(initial?.transactionDate ?? clampDate(todayKst(), windowFrom, windowTo))
  // 계단식 카테고리 Select: AssetForm과 동일 패턴 — selectedPath 마지막 값이 실제 제출용 categoryId.
  const [selectedPath, setSelectedPath] = useState<string[]>(() =>
    seed ? getCategoryPath(categories, seed.categoryId).map((c) => c.id) : []
  )
  // 다이얼로그가 카테고리 쿼리 로딩보다 먼저 열릴 수 있어, 데이터 도착 후 한 번 더 경로를 복원한다.
  useEffect(() => {
    if (seed && selectedPath.length === 0 && categories.length > 0) {
      setSelectedPath(getCategoryPath(categories, seed.categoryId).map((c) => c.id))
    }
  }, [seed, categories, selectedPath.length])
  const cascadeLevels = useMemo(() => getCascadeLevels(categories, selectedPath), [categories, selectedPath])
  const categoryId = selectedPath[selectedPath.length - 1] ?? ''

  const [amountDigits, setAmountDigits] = useState(seed ? String(seed.amount) : '')
  const [memo, setMemo] = useState(seed?.memo ?? '')
```

나머지(createMutation/updateMutation/handleSubmit/JSX)는 변경 없음 — `mode`가 `initial` 유무로만 결정되므로 `duplicateFrom`이 있어도 항상 `createMutation`을 탄다.

다이얼로그 타이틀(105-107행)은 이미 `mode === 'edit' ? '거래내역 수정' : '거래내역 등록'`이라 복제 시에도 "거래내역 등록"으로 자연스럽게 표시된다 — 수정 불필요.

- [ ] **Step 2: 타입 체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add features/finance/save-transaction/TransactionFormDialog.tsx
git commit -m "feat(finance): 거래내역 등록 다이얼로그에 복제 프리필(duplicateFrom) 지원 추가"
```

---

## Task 9: `FinanceRecordList` — 복제 버튼

**Files:**
- Modify: `widgets/finance-record-list/FinanceRecordList.tsx`
- Modify: `widgets/finance-record-list/FinanceRecordList.test.tsx` (없으면 이 Task는 수동 확인으로 대체 — Step 1에서 확인)

- [ ] **Step 1: 기존 테스트 확인**

Run: `ls widgets/finance-record-list/*.test.tsx 2>/dev/null || echo none`

있으면 아래 케이스를 추가한다(mock에 `@features/finance/save-transaction`의 `TransactionFormDialog` mock 포함 여부 확인 후 맞춰 작성):

```tsx
it('행의 복제 버튼을 클릭하면 오늘 날짜로 프리필된 등록 다이얼로그가 열린다', async () => {
  const user = userEvent.setup()
  render(<FinanceRecordList {...defaultProps} />)

  await user.click(screen.getAllByRole('button', { name: '복제' })[0])

  expect(screen.getByText('거래내역 등록')).toBeInTheDocument()
})
```

없으면 이 Step은 건너뛰고 Step 2에서 구현 후 수동 확인만 한다.

- [ ] **Step 2: 구현**

`widgets/finance-record-list/FinanceRecordList.tsx`:

1. Props에 등록 전용 창(오늘 기준) 추가 — 복제는 새 거래라 조회 윈도우(`window`)가 아니라 등록 윈도우가 필요하다:

```ts
interface Props {
  type: FinanceCategoryType
  transactions: FinanceTransaction[]
  categoryTree: FinanceCategory[]
  index: CategoryIndex
  period: Period
  isLoading: boolean
  isError: boolean
  // 복제 시 새로 등록될 거래의 날짜 제약("오늘 기준" 독립 12개월 창) — FinanceDashboard의
  // registerWindow와 동일한 값. 수정용 window(조회 윈도우)와는 의도적으로 분리한다.
  registerWindowFrom?: string
  registerWindowTo?: string
}
```

2. 함수 시그니처와 상태 추가 (42-52행 근방):

```tsx
export function FinanceRecordList({ type, transactions, categoryTree, index, period, isLoading, isError, registerWindowFrom, registerWindowTo }: Props) {
  const deleteMutation = useDeleteFinanceTransactionMutation()

  const [categoryPath, setCategoryPath] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('transactionDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState('10')

  const editDialog = useConfirmDialog<FinanceTransaction>()
  const deleteDialog = useConfirmDialog<FinanceTransaction>()
  const duplicateDialog = useConfirmDialog<FinanceTransaction>()
```

`deleteDialog`는 원래 `useConfirmDialog<string>()`(id만 저장)였다 — 기존 `deleteDialog.request(t.id)`/`deleteMutation.mutate(deleteDialog.target, ...)` 호출부가 문자열 하나만 쓰므로 타입을 바꾸지 않고 그대로 둔다. 새로 추가하는 `duplicateDialog`만 `FinanceTransaction` 전체를 담는다.

3. 데스크톱 액션 셀(198-204행)에 복제 버튼 추가:

```tsx
                          <TableDataCell>
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" onClick={() => editDialog.request(t)} className="text-xs font-semibold text-foreground hover:text-[var(--brand-fg-soft)]">수정</button>
                              <span className="text-muted-foreground/40">·</span>
                              <button type="button" onClick={() => duplicateDialog.request(t)} className="text-xs font-semibold text-foreground hover:text-[var(--brand-fg-soft)]">복제</button>
                              <span className="text-muted-foreground/40">·</span>
                              <button type="button" onClick={() => deleteDialog.request(t.id)} className="text-xs font-semibold text-destructive hover:text-destructive/80">삭제</button>
                            </div>
                          </TableDataCell>
```

4. 모바일 액션 영역(231-234행)에 복제 버튼 추가:

```tsx
                      <div className="mt-3 flex items-center justify-end gap-3 border-t pt-3">
                        <button type="button" onClick={() => editDialog.request(t)} className="px-1 py-2 text-xs font-semibold text-foreground">수정</button>
                        <button type="button" onClick={() => duplicateDialog.request(t)} className="px-1 py-2 text-xs font-semibold text-foreground">복제</button>
                        <button type="button" onClick={() => deleteDialog.request(t.id)} className="px-1 py-2 text-xs font-semibold text-destructive">삭제</button>
                      </div>
```

5. 편집 다이얼로그(250-260행) 아래에 복제 다이얼로그 추가:

```tsx
      {editDialog.target && (
        <TransactionFormDialog
          open
          onOpenChange={editDialog.onOpenChange}
          type={type}
          initial={editDialog.target}
          windowFrom={window.from}
          windowTo={window.to}
          onSuccess={() => editDialog.close()}
        />
      )}
      {duplicateDialog.target && (
        <TransactionFormDialog
          open
          onOpenChange={duplicateDialog.onOpenChange}
          type={type}
          duplicateFrom={duplicateDialog.target}
          windowFrom={registerWindowFrom}
          windowTo={registerWindowTo}
          onSuccess={() => duplicateDialog.close()}
        />
      )}
```

- [ ] **Step 3: 테스트 실행 (있으면) / 타입 체크**

Run: `npm run typecheck && npm test -- finance-record-list`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add widgets/finance-record-list/FinanceRecordList.tsx widgets/finance-record-list/FinanceRecordList.test.tsx
git commit -m "feat(finance): 내역 리스트에 복제 버튼 추가"
```

---

## Task 10: `FinanceDashboard` — 탭 순서·레이아웃·예산 버튼·전년대비 쿼리 통합

**Files:**
- Modify: `app/(main)/finance/FinanceDashboard.tsx`
- Modify: `app/(main)/finance/FinanceDashboard.test.tsx`

- [ ] **Step 1: 테스트 갱신 (레이아웃 변경에 맞춰 먼저 고친다)**

`app/(main)/finance/FinanceDashboard.test.tsx` 변경:

1. mock에 `@features/finance/manage-budgets` 추가:

```ts
vi.mock('@features/finance/manage-budgets', () => ({
  BudgetManagerDialog: () => <button type="button">예산 등록</button>,
}))
```

2. `'탭은 수입·소비·저축·자산·설정 순서로 배치된다'` 테스트를 자산이 맨 앞으로 오도록 수정:

```tsx
  it('탭은 자산·수입·소비·저축·설정 순서로 배치된다', () => {
    render(<FinanceDashboard />)

    const group = screen.getByRole('group', { name: '자산 탭' })
    const labels = within(group).getAllByRole('button').map((el) => el.textContent)

    expect(labels).toEqual(['자산', '수입', '소비', '저축', '설정'])
  })
```

3. `'수입 탭을 선택하면 ... 예산 대비는 없다(수입은 예산 대상 아님)'` 테스트를 반대로 수정 — 이제 수입도 예산 대비를 보여준다:

```tsx
  it('수입 탭을 선택하면 요약·예산 대비·추이·내역 위젯과 예산등록·내역등록 버튼을 보여준다', async () => {
    const user = userEvent.setup()
    render(<FinanceDashboard />)

    await user.click(screen.getByRole('button', { name: '수입' }))

    for (const testId of ASSET_WIDGET_TEST_IDS) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    }
    for (const testId of FLOW_WIDGET_TEST_IDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
    expect(screen.getByTestId('finance-budget-progress')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '자산 등록' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '예산 등록' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '내역 등록' })).toBeInTheDocument()
  })
```

4. 소비/저축 탭 테스트에도 `예산 등록` 버튼 존재 assertion 한 줄씩 추가:

```tsx
    expect(screen.getByRole('button', { name: '예산 등록' })).toBeInTheDocument()
```

(각 `expect(screen.getByRole('button', { name: '내역 등록' })).toBeInTheDocument()` 바로 위 또는 아래에)

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- FinanceDashboard.test.tsx`
Expected: FAIL — 탭 순서·버튼 미존재

- [ ] **Step 3: 구현**

`app/(main)/finance/FinanceDashboard.tsx` 변경 사항:

1. import 추가 (15-16행 근방):

```ts
import { NewTransactionButton } from '@features/finance/save-transaction'
import { BudgetManagerDialog } from '@features/finance/manage-budgets'
```

2. `TAB_OPTIONS`(32-38행) — `investment`를 맨 앞으로:

```ts
const TAB_OPTIONS: { value: AssetTab; label: string }[] = [
  { value: 'investment', label: '자산' },
  { value: 'income', label: '수입' },
  { value: 'expense', label: '소비' },
  { value: 'saving', label: '저축' },
  { value: 'settings', label: '설정' },
]
```

3. `BUDGET_TABS`(47행) — income 추가:

```ts
const BUDGET_TABS = ['income', 'expense', 'saving'] as const
```

4. `previousYearRange`, `useFinanceTransactionsQuery` 관련 import 추가(기존 4-12행 import 블록에 `previousYearRange` 추가):

```ts
import {
  buildCategoryIndex,
  listAvailableMonths,
  previousYearRange,
  useAssetSnapshotsQuery,
  useFinanceBudgetsQuery,
  useFinanceCategoriesQuery,
  useFinanceTransactionsQuery,
  windowRange,
} from '@entities/finance'
```

5. `period`/`flowWindow` 선언(85-96행) 아래에 전년대비 쿼리 추가:

```ts
  const [period, setPeriod] = useState<Period>({ month: todayKst().slice(0, 7), mode: 'monthly' })
  const flowWindow = useMemo(() => windowRange(period.month), [period.month])
  const registerWindow = useMemo(() => windowRange(todayKst().slice(0, 7)), [])
  const {
    data: transactions = [],
    isLoading: isTransactionsLoading,
    isError: isTransactionsError,
  } = useFinanceTransactionsQuery(flowWindow.from, flowWindow.to)
  const isFlowTab = tab === 'income' || tab === 'expense' || tab === 'saving'
  // 전년대비 전용 — 연간 모드일 때만 조회한다. 기존 12개월 윈도우(flowWindow)로는 전년 동기간이
  // 커버되지 않아(예: 2026-08 YTD 대비 2025-01~08은 완전히 다른 범위) 별도 쿼리가 필요하다.
  const previousYearWindow = useMemo(() => previousYearRange(period), [period])
  const { data: previousYearTransactions = [] } = useFinanceTransactionsQuery(
    previousYearWindow.from,
    previousYearWindow.to,
    { enabled: isFlowTab && period.mode === 'yearly' },
  )
```

(`isFlowTab` 선언을 원래 위치인 118행에서 여기로 끌어올린다 — 아래 6번에서 118행의 기존 선언은 삭제한다. `useFinanceCategoriesQuery` 세 줄과 `useFinanceBudgetsQuery`는 그대로 유지, 순서만 이 블록 뒤에 이어진다.)

6. 기존 118행의 `const isFlowTab = ...` 중복 선언 삭제(5번에서 이미 위로 옮겼으므로).

7. `actions`(134-140행) — 예산등록 버튼을 내역등록 왼쪽에 배치:

```tsx
        actions={
          tab === 'investment' ? (
            <NewAssetButton />
          ) : isFlowTab && flowType ? (
            <div className="flex items-center gap-2">
              <BudgetManagerDialog type={flowType} />
              <NewTransactionButton type={flowType} windowFrom={registerWindow.from} windowTo={registerWindow.to} />
            </div>
          ) : undefined
        }
```

8. 렌더 순서(165-206행) — 요약 → 예산대비 → 추이 → 내역, `BUDGET_TABS` 캐스트에서 `AssetTab[]`은 그대로 두되 `FinanceBudgetProgress`의 `type` prop 캐스트를 제거(Task 3에서 `'INCOME'|'EXPENSE'|'SAVING'`으로 넓혔으므로 `flowType` 그대로 대입 가능):

```tsx
        {isFlowTab && flowType && (
          <>
            <FinanceSummary
              type={flowType}
              transactions={transactions}
              index={categoryIndex}
              isLoading={isFlowLoading}
              isError={isTransactionsError}
              period={period}
              onPeriodChange={setPeriod}
              previousYearTransactions={previousYearTransactions}
            />
            {(BUDGET_TABS as readonly AssetTab[]).includes(tab) && (
              <FinanceBudgetProgress
                type={flowType}
                budgets={budgets}
                transactions={transactions}
                categoryTree={categoryTreeByType[flowType]}
                index={categoryIndex}
                period={period}
                isLoading={isFlowLoading}
                isError={isTransactionsError}
              />
            )}
            <FinanceTrend
              type={flowType}
              transactions={transactions}
              index={categoryIndex}
              month={period.month}
              isLoading={isFlowLoading}
              isError={isTransactionsError}
            />
            <FinanceRecordList
              type={flowType}
              transactions={transactions}
              categoryTree={categoryTreeByType[flowType]}
              index={categoryIndex}
              period={period}
              isLoading={isFlowLoading}
              isError={isTransactionsError}
              registerWindowFrom={registerWindow.from}
              registerWindowTo={registerWindow.to}
            />
          </>
        )}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- FinanceDashboard.test.tsx`
Expected: PASS

- [ ] **Step 5: 타입 체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add "app/(main)/finance/FinanceDashboard.tsx" "app/(main)/finance/FinanceDashboard.test.tsx"
git commit -m "feat(finance): 자산 탭 최우선 배치, 예산등록 버튼·전년대비 쿼리·섹션 순서 통합"
```

---

## Task 11: 카테고리 정렬순서 하한 1 (그룹 설정 + 어드민)

**Files:**
- Modify: `features/finance/manage-categories/CategoryFormDialog.tsx:38,58,133-140`
- Modify: `features/finance/manage-categories/SystemCategoryFormDialog.tsx:39,59,134-141`

- [ ] **Step 1: `CategoryFormDialog.tsx` 구현**

38행:
```ts
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 1))
```

58행:
```ts
      sortOrder: Math.max(1, Number(sortOrder) || 1),
```

132-141행:
```tsx
            <div className="space-y-2">
              <Label htmlFor="categorySortOrder">정렬순서</Label>
              <Input
                id="categorySortOrder"
                type="number"
                min={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={isPending}
              />
            </div>
```

- [ ] **Step 2: `SystemCategoryFormDialog.tsx` 구현**

39행:
```ts
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 1))
```

59행:
```ts
      sortOrder: Math.max(1, Number(sortOrder) || 1),
```

133-142행:
```tsx
            <div className="space-y-2">
              <Label htmlFor="systemCategorySortOrder">정렬순서</Label>
              <Input
                id="systemCategorySortOrder"
                type="number"
                min={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={isPending}
              />
            </div>
```

- [ ] **Step 3: 타입 체크 + 관련 테스트**

Run: `npm run typecheck && npm test -- manage-categories`
Expected: PASS (기존 `CategoryManager.test.tsx`/`SystemCategoryManager.test.tsx`가 sortOrder 기본값 0을 가정한 assertion을 갖고 있다면 실패 — 있으면 기대값을 1로 맞춰 수정한다)

- [ ] **Step 4: 커밋**

```bash
git add features/finance/manage-categories/CategoryFormDialog.tsx features/finance/manage-categories/SystemCategoryFormDialog.tsx
git commit -m "fix(finance): 카테고리 정렬순서 입력 하한을 1로 제한"
```

---

## Task 12: 전체 검증

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 전체 테스트**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 2: 타입 체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: 커밋 전 리뷰어 검수**

CLAUDE.md 규칙에 따라 코드 리뷰어 서브에이전트(상위 모델)로 diff 전체를 검수한다. 발견된 실결함은 수정 후 재검증한다.

- [ ] **Step 4: 수동 확인 (선택, 권장)**

`npm run dev`로 로컬 기동 후 `/finance` 페이지에서:
- 탭 순서(자산 맨앞), 수입/소비/저축탭 예산등록 버튼 동작
- 연간 모드 연도 입력 + 전년대비 카드
- 내역 복제 버튼
- 설정/어드민 카테고리 정렬순서 최소값 1 강제

확인.

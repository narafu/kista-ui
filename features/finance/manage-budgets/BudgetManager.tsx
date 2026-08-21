'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@shared/ui/EmptyState'
import { ConfirmDeleteDialog } from '@shared/ui/ConfirmDeleteDialog'
import { fmtKrw } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import { useConfirmDialog } from '@shared/lib/hooks/use-confirm-dialog'
import { useMeta } from '@entities/meta'
import { getCategoryPath, useDeleteFinanceBudgetMutation, useFinanceBudgetsQuery, useFinanceCategoriesQuery } from '@entities/finance'
import type { FinanceBudget } from '@entities/finance'
import { BudgetFormDialog } from './BudgetFormDialog'

type BudgetType = 'EXPENSE' | 'SAVING'

// CategoryManager/SystemCategoryManager의 TypeButton과 동일 스타일 — feature 슬라이스끼리
// cross-import 금지라 로컬로 다시 정의한다(다른 위젯들도 이미 다 그렇게 복제했다).
function TypeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-9 w-full rounded px-2 py-1 text-sm font-medium transition-colors',
        active
          ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}

// 예산은 소비/저축 두 타입만 존재한다(CategoryManager는 ASSET/INCOME까지 4타입이지만 이 화면은
// 예산 개념이 있는 2타입뿐이다).
export function BudgetManager() {
  const { labelOf } = useMeta()
  const [type, setType] = useState<BudgetType>('EXPENSE')
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
      <div role="group" aria-label="예산 유형" className="grid w-full grid-cols-2 rounded-md border border-border p-0.5 sm:w-64">
        {(['EXPENSE', 'SAVING'] as const).map((t) => (
          <TypeButton key={t} active={type === t} onClick={() => setType(t)}>
            {labelOf('financeCategoryTypes', t)}
          </TypeButton>
        ))}
      </div>

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

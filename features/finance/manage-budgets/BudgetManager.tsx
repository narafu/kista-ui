'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@shared/ui/EmptyState'
import { ConfirmDeleteDialog } from '@shared/ui/ConfirmDeleteDialog'
import { fmtKrw } from '@shared/lib/format'
import { useConfirmDialog } from '@shared/lib/hooks/use-confirm-dialog'
import {
  getCategoryPath,
  useCanShareToGroup,
  useDeleteFinanceBudgetMutation,
  useFinanceBudgetsQuery,
  useFinanceCategoriesQuery,
  useShareFinanceBudgetMutation,
  useUnshareFinanceBudgetMutation,
} from '@entities/finance'
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
  const shareMutation = useShareFinanceBudgetMutation()
  const unshareMutation = useUnshareFinanceBudgetMutation()
  const canShare = useCanShareToGroup()

  function handleShare(id: string) {
    shareMutation.mutate(id, { onSuccess: () => toast.success('그룹에 공유했습니다') })
  }

  function handleUnshare(id: string) {
    unshareMutation.mutate(id, { onSuccess: () => toast.success('개인 소유로 되돌렸습니다') })
  }

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
                  {canShare && !budget.groupId && (
                    <button type="button" onClick={() => handleShare(budget.id)} disabled={shareMutation.isPending} className="text-xs font-semibold text-foreground hover:text-[var(--brand-fg-soft)]">공유</button>
                  )}
                  {canShare && budget.groupId && (
                    <button type="button" onClick={() => handleUnshare(budget.id)} disabled={unshareMutation.isPending} className="text-xs font-semibold text-foreground hover:text-[var(--brand-fg-soft)]">개인으로</button>
                  )}
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

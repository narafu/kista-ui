'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@shared/ui/EmptyState'
import { BRAND_TINT_BUTTON_CLASS } from '@shared/ui/brand-button-class'
import { cn } from '@shared/lib/utils'
import { useConfirmDialog } from '@shared/lib/hooks/use-confirm-dialog'
import { useMeta } from '@entities/meta'
import { collectSubtreeIds, sortCategoryTree, useDeleteSystemFinanceCategoryMutation, useSystemFinanceCategoriesQuery } from '@entities/finance'
import type { FinanceCategory, FinanceCategoryType } from '@entities/finance'
import { CategoryRow } from './CategoryRow'
import { DeleteCategoryDialog } from './DeleteCategoryDialog'
import { SystemCategoryFormDialog } from './SystemCategoryFormDialog'
import { TypeButton } from './TypeButton'

// 관리자 전용 시스템(공통) 카테고리 CRUD — CategoryManager와 거의 동일한 구조이되
// /api/admin/finance/categories를 소비하고(캐시 네임스페이스 분리: systemCategoriesRoot),
// CategoryRow에 lockSystemCategories={false}를 넘겨 시스템 카테고리도 수정·삭제할 수 있게 한다.
export function SystemCategoryManager() {
  const { meta } = useMeta()
  const [type, setType] = useState<FinanceCategoryType>('ASSET')
  const { data: categories } = useSystemFinanceCategoriesQuery(type)
  const l1Categories = categories ? sortCategoryTree(categories) : []

  const [formTarget, setFormTarget] = useState<FinanceCategory | 'new' | null>(null)
  const deleteDialog = useConfirmDialog<FinanceCategory>()

  const deleteMutation = useDeleteSystemFinanceCategoryMutation()

  function handleDelete() {
    if (!deleteDialog.target) return
    deleteMutation.mutate(deleteDialog.target.id, {
      onSuccess: () => {
        toast.success('카테고리가 삭제되었습니다')
        deleteDialog.close()
      },
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">어드민에서 등록한 카테고리는 모든 그룹에 공통으로 노출됩니다.</p>

      <div role="group" aria-label="카테고리 유형" className="grid w-full grid-cols-4 rounded-md border border-border p-0.5 sm:w-96">
        {meta.financeCategoryTypes.map((t) => (
          <TypeButton key={t.code} active={type === t.code} onClick={() => setType(t.code as FinanceCategoryType)}>
            {t.label}
          </TypeButton>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="button" size="sm" className={cn('gap-1.5', BRAND_TINT_BUTTON_CLASS)} onClick={() => setFormTarget('new')}>
          <Plus className="size-3.5" />
          카테고리 추가
        </Button>
      </div>

      {l1Categories.length === 0 ? (
        <EmptyState variant="text" message="등록된 카테고리가 없습니다." />
      ) : (
        <ul className="m-0 list-none rounded-[var(--r-lg)] border border-border p-0">
          {l1Categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              depth={0}
              onEdit={setFormTarget}
              onDelete={deleteDialog.request}
              lockSystemCategories={false}
            />
          ))}
        </ul>
      )}

      {formTarget && (
        <SystemCategoryFormDialog
          open
          onOpenChange={(next) => { if (!next) setFormTarget(null) }}
          type={type}
          l1Categories={l1Categories}
          category={formTarget === 'new' ? null : formTarget}
          onSuccess={() => setFormTarget(null)}
        />
      )}

      {deleteDialog.target && (
        <DeleteCategoryDialog
          open
          onOpenChange={deleteDialog.onOpenChange}
          categoryName={deleteDialog.target.name}
          subtreeCount={collectSubtreeIds(l1Categories, deleteDialog.target.id).length}
          onConfirm={handleDelete}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

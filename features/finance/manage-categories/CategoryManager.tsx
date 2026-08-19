'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@shared/ui/EmptyState'
import { useConfirmDialog } from '@shared/lib/hooks/use-confirm-dialog'
import { useMeta } from '@entities/meta'
import { collectSubtreeIds, useDeleteFinanceCategoryMutation, useFinanceCategoriesQuery } from '@entities/finance'
import type { FinanceCategory, FinanceCategoryType } from '@entities/finance'
import { CategoryFormDialog } from './CategoryFormDialog'
import { CategoryRow } from './CategoryRow'
import { DeleteCategoryDialog } from './DeleteCategoryDialog'
import { TypeButton } from './TypeButton'

// 4타입(ASSET/INCOME/EXPENSE/SAVING) 카테고리 트리를 사용자가 직접 생성·수정·삭제하는 화면.
// 수입/지출/저축 탭 자체는 아직 미구현이지만 카테고리는 미리 만들어둘 수 있어야 해서 타입
// 세그먼트만 먼저 노출한다. shadcn Tabs가 없어 FinanceDashboard의 TabButton 패턴을 그대로 따른다.
export function CategoryManager() {
  const { meta } = useMeta()
  const [type, setType] = useState<FinanceCategoryType>('ASSET')
  const { data: categories } = useFinanceCategoriesQuery(type)
  const l1Categories = categories ?? []

  // AccountManager와 동일한 조건부 마운트 패턴 — 열 때마다 다이얼로그가 새로 마운트되므로
  // key 트릭 없이도 내부 useState(name 등)가 매번 초기화된다.
  const [formTarget, setFormTarget] = useState<FinanceCategory | 'new' | null>(null)
  const deleteDialog = useConfirmDialog<FinanceCategory>()

  const deleteMutation = useDeleteFinanceCategoryMutation()

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
      <div role="group" aria-label="카테고리 유형" className="grid w-full grid-cols-4 rounded-md border border-border p-0.5 sm:w-96">
        {meta.financeCategoryTypes.map((t) => (
          <TypeButton key={t.code} active={type === t.code} onClick={() => setType(t.code as FinanceCategoryType)}>
            {t.label}
          </TypeButton>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="button" size="sm" className="gap-1.5" onClick={() => setFormTarget('new')}>
          <Plus className="size-4" />
          카테고리 추가
        </Button>
      </div>

      {l1Categories.length === 0 ? (
        <EmptyState variant="text" message="등록된 카테고리가 없습니다." />
      ) : (
        <ul className="m-0 list-none rounded-[var(--r-lg)] border border-border p-0">
          {l1Categories.map((category) => (
            <CategoryRow key={category.id} category={category} depth={0} onEdit={setFormTarget} onDelete={deleteDialog.request} />
          ))}
        </ul>
      )}

      {formTarget && (
        <CategoryFormDialog
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

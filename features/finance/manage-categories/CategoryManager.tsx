'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { cn } from '@shared/lib/utils'
import { useMeta } from '@entities/meta'
import { collectSubtreeIds, useDeleteFinanceCategoryMutation, useFinanceCategoriesQuery } from '@entities/finance'
import type { FinanceCategory, FinanceCategoryType } from '@entities/finance'
import { CategoryFormDialog } from './CategoryFormDialog'
import { DeleteCategoryDialog } from './DeleteCategoryDialog'

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

interface RowProps {
  category: FinanceCategory
  depth: number
  onEdit: (category: FinanceCategory) => void
  onDelete: (category: FinanceCategory) => void
}

// system 카테고리는 kista-api가 PUT/DELETE 시 403을 낸다 — 수정·삭제 버튼을 여기서 비활성화한다.
// 서버는 depth 제한이 없지만 이 UI는 L1/L2 2단만 지원해 재귀 depth는 실질적으로 0·1만 쓰인다.
function CategoryRow({ category, depth, onEdit, onDelete }: RowProps) {
  return (
    <>
      <li className={cn('flex items-center justify-between gap-3 border-t border-border px-4 py-3 first:border-t-0', depth > 0 && 'pl-10')}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{category.name}</span>
          {category.system && <Badge tone="neutral" size="sm">시스템</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => onEdit(category)}
            disabled={category.system}
            className={cn('text-xs font-semibold text-foreground hover:text-[var(--brand-fg-soft)]', category.system && 'opacity-40 pointer-events-none')}
          >
            수정
          </button>
          <button
            type="button"
            onClick={() => onDelete(category)}
            disabled={category.system}
            className={cn('text-xs font-semibold text-destructive hover:text-destructive/80', category.system && 'opacity-40 pointer-events-none')}
          >
            삭제
          </button>
        </div>
      </li>
      {category.children.map((child) => (
        <CategoryRow key={child.id} category={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  )
}

// 4타입(ASSET/INCOME/EXPENSE/SAVING) 카테고리 트리를 사용자가 직접 생성·수정·삭제하는 화면.
// 수입/지출/저축 탭 자체는 아직 미구현이지만 카테고리는 미리 만들어둘 수 있어야 해서 타입
// 세그먼트만 먼저 노출한다. shadcn Tabs가 없어 AssetsDashboard의 TabButton 패턴을 그대로 따른다.
export function CategoryManager() {
  const { meta } = useMeta()
  const [type, setType] = useState<FinanceCategoryType>('ASSET')
  const { data: categories } = useFinanceCategoriesQuery(type)
  const l1Categories = categories ?? []

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<FinanceCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FinanceCategory | null>(null)

  const deleteMutation = useDeleteFinanceCategoryMutation()

  function openCreateDialog() {
    setEditingCategory(null)
    setIsFormOpen(true)
  }

  function openEditDialog(category: FinanceCategory) {
    setEditingCategory(category)
    setIsFormOpen(true)
  }

  function handleDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success('카테고리가 삭제되었습니다')
        setDeleteTarget(null)
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
        <Button type="button" size="sm" className="gap-1.5" onClick={openCreateDialog}>
          <Plus className="size-4" />
          카테고리 추가
        </Button>
      </div>

      {l1Categories.length === 0 ? (
        <EmptyState variant="text" message="등록된 카테고리가 없습니다." />
      ) : (
        <ul className="m-0 list-none rounded-[var(--r-lg)] border border-border p-0">
          {l1Categories.map((category) => (
            <CategoryRow key={category.id} category={category} depth={0} onEdit={openEditDialog} onDelete={setDeleteTarget} />
          ))}
        </ul>
      )}

      {/* key: 편집 대상이 바뀔 때마다 다이얼로그 내부 useState(name 등)를 새로 초기화하기 위한 리마운트 트리거 */}
      <CategoryFormDialog
        key={`${editingCategory?.id ?? 'create'}-${isFormOpen}`}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        type={type}
        l1Categories={l1Categories}
        category={editingCategory}
        onSuccess={() => setIsFormOpen(false)}
      />

      <DeleteCategoryDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        categoryName={deleteTarget?.name ?? ''}
        subtreeCount={deleteTarget ? collectSubtreeIds(l1Categories, deleteTarget.id).length : 0}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}

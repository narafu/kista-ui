'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, Pencil, Plus, Share2, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@shared/ui/EmptyState'
import { ConfirmDeleteDialog } from '@shared/ui/ConfirmDeleteDialog'
import { IconButton } from '@shared/ui/IconButton'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { fmtKrw, todayKst } from '@shared/lib/format'
import { useConfirmDialog } from '@shared/lib/hooks/use-confirm-dialog'
import {
  collectSubtreeIds,
  getCascadeLevels,
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

type FormTarget =
  | { mode: 'create' }
  | { mode: 'edit'; budget: FinanceBudget }
  | { mode: 'duplicate'; budget: FinanceBudget }

const ALL_FILTER_VALUE = 'ALL'
type StatusFilter = 'ALL' | 'ACTIVE' | 'ENDED'

function BudgetRowActions({
  onEdit, onDuplicate, onShare, onUnshare, onDelete, canShare, hasGroupId, sharePending, unsharePending,
}: {
  onEdit: () => void
  onDuplicate: () => void
  onShare: () => void
  onUnshare: () => void
  onDelete: () => void
  canShare: boolean
  hasGroupId: boolean
  sharePending: boolean
  unsharePending: boolean
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {canShare && !hasGroupId && (
        <IconButton aria-label="공유" onClick={onShare} disabled={sharePending}>
          <Share2 className="size-4" />
        </IconButton>
      )}
      {canShare && hasGroupId && (
        <IconButton aria-label="귀속" onClick={onUnshare} disabled={unsharePending}>
          <Undo2 className="size-4" />
        </IconButton>
      )}
      <IconButton aria-label="복제" onClick={onDuplicate}>
        <Copy className="size-4" />
      </IconButton>
      <IconButton aria-label="수정" onClick={onEdit}>
        <Pencil className="size-4" />
      </IconButton>
      <IconButton aria-label="삭제" onClick={onDelete} className="text-destructive hover:text-destructive">
        <Trash2 className="size-4" />
      </IconButton>
    </div>
  )
}

// 예산 유형은 더 이상 이 컴포넌트가 스스로 고르지 않는다 — 호출부(BudgetManagerDialog)가
// 수입/소비/저축 탭 컨텍스트에서 이미 고정된 type을 넘긴다(설정 화면의 독립 세그먼트 UI는 폐기).
export function BudgetManager({ type }: Props) {
  const { data: categories = [] } = useFinanceCategoriesQuery(type)
  const { data: allBudgets = [] } = useFinanceBudgetsQuery()
  // 여러 하위 위젯이 공유하는 값이 아니라 이 컴포넌트 하나만 쓰므로 직접 호출한다.
  const today = todayKst()

  const budgets = allBudgets.filter((b) => getCategoryPath(categories, b.categoryId).length > 0)

  const [categoryPath, setCategoryPath] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_FILTER_VALUE)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState('10')

  // 계단식 카테고리 필터: 특정 depth에서 멈추면 그 하위 전부를 포함해 매칭한다(AssetRecordList와 동일 패턴).
  const cascadeLevels = useMemo(() => getCascadeLevels(categories, categoryPath), [categories, categoryPath])
  const categorySubtreeIds = useMemo(() => {
    if (categoryPath.length === 0) return null
    return new Set(collectSubtreeIds(categories, categoryPath[categoryPath.length - 1]))
  }, [categories, categoryPath])

  // "진행중"은 오늘이 적용 기간(applyStartDate~applyEndDate) 안에 있다는 뜻이다 — applyEndDate만
  // 보면 시작일이 미래인(아직 시작 전) 예산도 진행중으로 잘못 분류된다(리뷰에서 발견).
  function isActiveBudget(budget: FinanceBudget): boolean {
    return budget.applyStartDate <= today && (!budget.applyEndDate || budget.applyEndDate >= today)
  }

  const filtered = useMemo(() => budgets.filter((b) =>
    (categorySubtreeIds === null || categorySubtreeIds.has(b.categoryId)) &&
    (statusFilter === ALL_FILTER_VALUE || (statusFilter === 'ACTIVE' ? isActiveBudget(b) : !isActiveBudget(b))),
  ), [budgets, categorySubtreeIds, statusFilter, today])

  // 필터 변경은 결과 집합을 바꾸므로 페이지를 1로 리셋한다(AssetRecordList와 동일 패턴).
  useEffect(() => {
    setPage(1)
  }, [categoryPath, statusFilter])

  function handlePageSizeChange(nextSize: string) {
    setPageSize(nextSize)
    setPage(1)
  }

  const size = Number(pageSize)
  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * size, currentPage * size)

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={[{ value: ALL_FILTER_VALUE, label: '전체' }, ...cascadeLevels[0].map((c) => ({ value: c.id, label: c.name }))]}
            value={categoryPath[0] ?? ALL_FILTER_VALUE}
            onValueChange={(value) => {
              if (!value) return
              setCategoryPath(value === ALL_FILTER_VALUE ? [] : [value])
            }}
          >
            <SelectTrigger aria-label="카테고리" className="w-full lg:w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>전체</SelectItem>
              {cascadeLevels[0].map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {cascadeLevels.slice(1).map((level, i) => {
            const levelIndex = i + 1
            return (
              <Select
                key={levelIndex}
                items={[{ value: ALL_FILTER_VALUE, label: '전체' }, ...level.map((c) => ({ value: c.id, label: c.name }))]}
                value={categoryPath[levelIndex] ?? ALL_FILTER_VALUE}
                onValueChange={(value) => {
                  if (!value) return
                  setCategoryPath(value === ALL_FILTER_VALUE ? categoryPath.slice(0, levelIndex) : [...categoryPath.slice(0, levelIndex), value])
                }}
              >
                <SelectTrigger aria-label={`하위 카테고리 ${levelIndex}`} className="w-full lg:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>전체</SelectItem>
                  {level.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )
          })}
          <Select
            items={[
              { value: 'ALL', label: '전체 상태' },
              { value: 'ACTIVE', label: '진행중' },
              { value: 'ENDED', label: '종료' },
            ]}
            value={statusFilter}
            onValueChange={(value) => { if (value) setStatusFilter(value as StatusFilter) }}
          >
            <SelectTrigger aria-label="적용 상태" className="w-full lg:w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 상태</SelectItem>
              <SelectItem value="ACTIVE">진행중</SelectItem>
              <SelectItem value="ENDED">종료</SelectItem>
            </SelectContent>
          </Select>
          <PageSizeSelector value={pageSize} onChange={handlePageSizeChange} />
        </div>
        <Button type="button" size="sm" className="gap-1.5" onClick={() => setFormTarget({ mode: 'create' })}>
          <Plus className="size-4" />
          예산 추가
        </Button>
      </div>

      {budgets.length === 0 ? (
        <EmptyState variant="text" message="등록된 예산이 없습니다." />
      ) : filtered.length === 0 ? (
        <EmptyState variant="text" message="조건에 맞는 예산이 없습니다." />
      ) : (
        <>
          <ul className="m-0 list-none divide-y rounded-[var(--r-lg)] border border-border p-0" aria-label="예산 목록">
            {paged.map((budget) => {
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
                    <BudgetRowActions
                      onEdit={() => setFormTarget({ mode: 'edit', budget })}
                      onDuplicate={() => setFormTarget({ mode: 'duplicate', budget })}
                      onShare={() => handleShare(budget.id)}
                      onUnshare={() => handleUnshare(budget.id)}
                      onDelete={() => deleteDialog.request(budget)}
                      canShare={canShare}
                      hasGroupId={!!budget.groupId}
                      sharePending={shareMutation.isPending}
                      unsharePending={unshareMutation.isPending}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
          {totalPages > 1 && <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}

      {formTarget && (
        <BudgetFormDialog
          open
          onOpenChange={(next) => { if (!next) setFormTarget(null) }}
          categoryTree={categories}
          initial={formTarget.mode === 'edit' ? formTarget.budget : undefined}
          duplicateFrom={formTarget.mode === 'duplicate' ? formTarget.budget : undefined}
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

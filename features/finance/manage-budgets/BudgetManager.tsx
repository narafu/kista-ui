'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { buttonVariants } from '@/components/ui/button-variants'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { ConfirmDeleteDialog } from '@shared/ui/ConfirmDeleteDialog'
import { ShareableRowActions } from '@shared/ui/ShareableRowActions'
import { GroupSharedBadge } from '@shared/ui/GroupSharedBadge'
import { ALL_FILTER_VALUE, CascadingCategorySelect } from '@shared/ui/CascadingCategorySelect'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { fmtKrw, todayKst } from '@shared/lib/format'
import { useConfirmDialog } from '@shared/lib/hooks/use-confirm-dialog'
import { cn } from '@shared/lib/utils'
import {
  collectSubtreeIds,
  editBudgetHref,
  getCascadeLevels,
  getCategoryPath,
  newBudgetHref,
  useCanShareToGroup,
  useDeleteFinanceBudgetMutation,
  useFinanceBudgetsQuery,
  useFinanceCategoriesQuery,
  useShareFinanceBudgetMutation,
  useUnshareFinanceBudgetMutation,
} from '@entities/finance'
import type { FinanceBudget, FlowType } from '@entities/finance'

interface Props {
  type: FlowType
}

type BudgetStatus = 'UPCOMING' | 'ACTIVE' | 'ENDED'
type StatusFilter = 'ALL' | BudgetStatus

const STATUS_VALUES: StatusFilter[] = ['ALL', 'UPCOMING', 'ACTIVE', 'ENDED']
const PAGE_SIZES = [10, 30, 50, 100]
const DEFAULT_SIZE = 10

function positiveInt(raw: string | null): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

// 시작 전(예정)을 따로 둔다 — 진행중이 아니면 전부 종료로 묶으면 시작일이 미래인 예산이 "종료"에 섞인다.
function budgetStatus(budget: FinanceBudget, today: string): BudgetStatus {
  if (budget.applyStartDate > today) return 'UPCOMING'
  if (budget.applyEndDate && budget.applyEndDate < today) return 'ENDED'
  return 'ACTIVE'
}

// 예산 유형은 이 컴포넌트가 스스로 고르지 않는다 — 호출 라우트(/finance/budgets/[type])가
// 경로에서 고정된 type을 넘긴다(설정 화면의 독립 세그먼트 UI는 폐기).
export function BudgetManager({ type }: Props) {
  const { data: categories = [] } = useFinanceCategoriesQuery(type)
  const { data: allBudgets = [] } = useFinanceBudgetsQuery()
  // 여러 하위 위젯이 공유하는 값이 아니라 이 컴포넌트 하나만 쓰므로 직접 호출한다.
  const today = todayKst()

  const budgets = allBudgets.filter((b) => getCategoryPath(categories, b.categoryId).length > 0)

  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status') as StatusFilter | null
  const statusFilter: StatusFilter = statusParam && STATUS_VALUES.includes(statusParam) ? statusParam : 'ACTIVE'
  const categoryParam = searchParams.get('category')
  // 경로는 URL에 마지막 id 하나만 두고 트리에서 복원한다 — 트리에 없는 id면 빈 경로(전체)로 폴백
  const categoryPath = useMemo(
    () => (categoryParam ? getCategoryPath(categories, categoryParam).map((c) => c.id) : []),
    [categories, categoryParam],
  )
  const sizeParam = positiveInt(searchParams.get('size'))
  const size = sizeParam && PAGE_SIZES.includes(sizeParam) ? sizeParam : DEFAULT_SIZE
  const pageParam = positiveInt(searchParams.get('page')) ?? 1

  // 목록 모달이 폼 라우트로 교체됐다가 돌아와도 필터가 남도록 URL에 둔다. replaceState는 서버 왕복·
  // 인터셉트 재평가 없이 useSearchParams와 동기화된다(Next.js 네이티브 history 지원). 기본값은 생략한다.
  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    const qs = next.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }

  // 필터 변경은 결과 집합을 바꾸므로 page를 지워 1페이지로 돌아간다.
  function setCategoryPath(path: string[]) {
    updateParams({ category: path.at(-1) ?? null, page: null })
  }
  function setStatusFilter(value: StatusFilter) {
    updateParams({ status: value === 'ACTIVE' ? null : value, page: null })
  }
  function setPage(next: number) {
    updateParams({ page: next === 1 ? null : String(next) })
  }
  function handlePageSizeChange(next: string) {
    updateParams({ size: next === String(DEFAULT_SIZE) ? null : next, page: null })
  }

  // 계단식 카테고리 필터: 특정 depth에서 멈추면 그 하위 전부를 포함해 매칭한다(AssetRecordList와 동일 패턴).
  const cascadeLevels = useMemo(() => getCascadeLevels(categories, categoryPath), [categories, categoryPath])
  const categorySubtreeIds = useMemo(() => {
    if (categoryPath.length === 0) return null
    return new Set(collectSubtreeIds(categories, categoryPath[categoryPath.length - 1]))
  }, [categories, categoryPath])

  const filtered = useMemo(() => budgets.filter((b) =>
    (categorySubtreeIds === null || categorySubtreeIds.has(b.categoryId)) &&
    (statusFilter === ALL_FILTER_VALUE || budgetStatus(b, today) === statusFilter),
  ), [budgets, categorySubtreeIds, statusFilter, today])

  // 범위를 벗어난 page(삭제·필터로 결과가 줄어든 경우)는 마지막 페이지로 클램프한다
  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const currentPage = Math.min(pageParam, totalPages)
  const paged = filtered.slice((currentPage - 1) * size, currentPage * size)

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
      <div className="flex flex-wrap items-center gap-2">
        <CascadingCategorySelect levels={cascadeLevels} path={categoryPath} onPathChange={setCategoryPath} className="min-w-0 grow basis-[calc(50%-0.25rem)] sm:w-32 sm:grow-0 sm:basis-auto" />
        <Select
          items={[
            { value: 'ALL', label: '전체 상태' },
            { value: 'UPCOMING', label: '예정' },
            { value: 'ACTIVE', label: '진행중' },
            { value: 'ENDED', label: '종료' },
          ]}
          value={statusFilter}
          onValueChange={(value) => { if (value) setStatusFilter(value as StatusFilter) }}
        >
          <SelectTrigger aria-label="적용 상태" className="min-w-0 grow basis-[calc(50%-0.25rem)] sm:w-28 sm:grow-0 sm:basis-auto"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 상태</SelectItem>
            <SelectItem value="UPCOMING">예정</SelectItem>
            <SelectItem value="ACTIVE">진행중</SelectItem>
            <SelectItem value="ENDED">종료</SelectItem>
          </SelectContent>
        </Select>
        <PageSizeSelector value={String(size)} onChange={handlePageSizeChange} />
        <Link href={newBudgetHref(type)} className={cn(buttonVariants({ variant: 'brand-soft', size: 'sm' }), 'ml-auto gap-1.5')}>
          <Plus className="size-4" />
          예산 추가
        </Link>
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
              const status = budgetStatus(budget, today)
              return (
                <li key={budget.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <p className="min-w-0 truncate text-sm font-medium">{categoryName}</p>
                      {/* 기본 필터가 진행중이라 진행중 배지는 생략 — 예외 상태만 표시 */}
                      {status === 'UPCOMING' && <Badge tone="brand">예정</Badge>}
                      {status === 'ENDED' && <Badge tone="neutral">종료</Badge>}
                      <GroupSharedBadge groupId={budget.groupId} />
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-sm font-medium tabular-nums">{fmtKrw(budget.amount)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                      {/* 좁은 화면에서 날짜 중간이 끊기지 않게 날짜 단위로만 줄바꿈 */}
                      <span className="whitespace-nowrap">{budget.applyStartDate}</span>{' '}
                      <span className="whitespace-nowrap">~ {budget.applyEndDate ?? '무기한'}</span>
                    </p>
                    <ShareableRowActions
                      editHref={editBudgetHref(type, budget.id)}
                      duplicateHref={newBudgetHref(type, { duplicateFrom: budget.id })}
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

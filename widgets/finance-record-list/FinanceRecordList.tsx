'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { EmptyState } from '@shared/ui/EmptyState'
import { SectionError } from '@shared/ui/SectionError'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { ShareableRowActions } from '@shared/ui/ShareableRowActions'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { ConfirmDeleteDialog } from '@shared/ui/ConfirmDeleteDialog'
import { cn } from '@shared/lib/utils'
import { fmtDate, fmtKrw } from '@shared/lib/format'
import { useConfirmDialog } from '@shared/lib/hooks/use-confirm-dialog'
import {
  collectSubtreeIds,
  filterByType,
  flowCategoryColor,
  isMonthClosed,
  periodRange,
  sortCategoryTree,
  unclassifiedTransactions,
  useActiveGroupId,
  useCanShareToGroup,
  useDeleteFinanceTransactionMutation,
  useMonthlyClosingsQuery,
  useShareFinanceTransactionMutation,
  useUnshareFinanceTransactionMutation,
} from '@entities/finance'
import type { CategoryIndex, FinanceCategory, FinanceCategoryType, FinanceTransaction, Period } from '@entities/finance'
import { TransactionFormDialog } from '@features/finance/save-transaction'
import { FinanceRecordFilters } from './FinanceRecordFilters'

type SortKey = 'transactionDate' | 'category' | 'amount'
type SortDirection = 'asc' | 'desc'

interface Props {
  type: FinanceCategoryType
  transactions: FinanceTransaction[]
  categoryTree: FinanceCategory[]
  index: CategoryIndex
  period: Period
  isLoading: boolean
  isError: boolean
  // 복제 시 새로 등록될 거래의 날짜 제약(하한 없음, 상한은 이번 달 말일 — "오늘 기준" 독립 창) —
  // useFinanceFlowData.ts의 registerWindow와 동일한 값. 수정용 window(조회 윈도우)와는 의도적으로 분리한다.
  registerWindowFrom?: string
  registerWindowTo?: string
  // useFinanceFlowData.ts가 한 번만 계산해 내려주는 "오늘" — 위젯마다 todayKst()를 각자 호출하지 않는다.
  today: string
}

export function FinanceRecordList({ type, transactions, categoryTree, index, period, isLoading, isError, registerWindowFrom, registerWindowTo, today }: Props) {
  const deleteMutation = useDeleteFinanceTransactionMutation()
  const shareMutation = useShareFinanceTransactionMutation()
  const unshareMutation = useUnshareFinanceTransactionMutation()
  const canShare = useCanShareToGroup()
  const { data: monthlyClosings = [] } = useMonthlyClosingsQuery()
  const activeGroupId = useActiveGroupId()
  // 기록 점검이 완료된 달의 거래는 서버가 등록·수정·삭제·공유를 전면 차단한다 — 행 작업 버튼을 미리 잠근다.
  const closedMonthTitle = '기록 점검이 완료된 달입니다 · 자산탭에서 완료를 해제하면 편집할 수 있습니다'
  const isClosed = (date: string) => isMonthClosed(monthlyClosings, date.slice(0, 7), activeGroupId)

  function handleShare(id: string) {
    shareMutation.mutate(id, { onSuccess: () => toast.success('그룹에 공유했습니다') })
  }

  function handleUnshare(id: string) {
    unshareMutation.mutate(id, { onSuccess: () => toast.success('개인 소유로 되돌렸습니다') })
  }

  const [categoryPath, setCategoryPath] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('transactionDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState('10')

  const editDialog = useConfirmDialog<FinanceTransaction>()
  const deleteDialog = useConfirmDialog<string>()
  const duplicateDialog = useConfirmDialog<FinanceTransaction>()

  const orderedRootIds = useMemo(() => sortCategoryTree(categoryTree).map((c) => c.id), [categoryTree])

  const { from, to } = periodRange(period, today)
  const typed = useMemo(() => filterByType(transactions, index, type), [transactions, index, type])
  const inPeriod = useMemo(
    () => typed.filter((t) => t.transactionDate >= from && t.transactionDate <= to),
    [typed, from, to],
  )

  const categorySubtreeIds = useMemo(() => {
    if (categoryPath.length === 0) return null
    return new Set(collectSubtreeIds(categoryTree, categoryPath[categoryPath.length - 1]))
  }, [categoryTree, categoryPath])

  const filtered = useMemo(
    () => (categorySubtreeIds === null ? inPeriod : inPeriod.filter((t) => categorySubtreeIds.has(t.categoryId))),
    [inPeriod, categorySubtreeIds],
  )

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      let diff = 0
      if (sortKey === 'transactionDate') diff = a.transactionDate.localeCompare(b.transactionDate)
      else if (sortKey === 'category') diff = (index.get(a.categoryId)?.name ?? '').localeCompare(index.get(b.categoryId)?.name ?? '')
      else diff = a.amount - b.amount
      return sortDirection === 'asc' ? diff : -diff
    })
    return copy
  }, [filtered, sortKey, sortDirection, index])

  // 카테고리 필터·기간 변경은 결과 집합 자체를 바꾸므로 페이지를 1로 리셋한다(AssetRecordList와 동일 이유).
  useEffect(() => {
    setPage(1)
  }, [categoryPath, period.month, period.mode])

  function handlePageSizeChange(nextSize: string) {
    setPageSize(nextSize)
    setPage(1)
  }

  const size = Number(pageSize)
  const totalPages = Math.max(1, Math.ceil(sorted.length / size))
  const currentPage = Math.min(page, totalPages)
  const paged = sorted.slice((currentPage - 1) * size, currentPage * size)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <ArrowUpDown className="size-3.5 inline ml-1 text-muted-foreground/50" />
    return sortDirection === 'asc'
      ? <ArrowUp className="size-3.5 inline ml-1" />
      : <ArrowDown className="size-3.5 inline ml-1" />
  }

  // 카테고리가 삭제돼 이 타입 어디에도 속하지 못하는 거래 — 필터링해 숨기지 않고 존재만 알린다.
  const unclassifiedCount = useMemo(() => {
    const uc = unclassifiedTransactions(transactions, index)
    return uc.filter((t) => t.transactionDate >= from && t.transactionDate <= to).length
  }, [transactions, index, from, to])

  function handleDelete() {
    if (!deleteDialog.target) return
    deleteMutation.mutate(deleteDialog.target, {
      onSuccess: () => {
        toast.success('거래내역을 삭제했습니다')
        deleteDialog.close()
      },
    })
  }

  if (isLoading) {
    return <LoadingRow />
  }
  if (isError) {
    return <SectionError message="거래내역을 불러오지 못했습니다" />
  }

  return (
    <div className="space-y-4">
      {inPeriod.length === 0 ? (
        <EmptyState message="이 기간에 등록된 거래내역이 없습니다." />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FinanceRecordFilters
              categoryTree={categoryTree}
              categoryPath={categoryPath}
              onCategoryPathChange={setCategoryPath}
            />
            <PageSizeSelector value={pageSize} onChange={handlePageSizeChange} />
          </div>

          {sorted.length === 0 ? (
            <EmptyState variant="text" message="조건에 맞는 거래내역이 없습니다." />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block rounded-[var(--r-lg)] border border-border">
                <table className="w-full min-w-[720px] text-sm" aria-label="거래내역">
                  <thead className="bg-muted/50">
                    <tr>
                      <TableHeadCell aria-sort={sortKey === 'transactionDate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" onClick={() => handleSort('transactionDate')}>
                          날짜{sortIcon('transactionDate')}
                        </button>
                      </TableHeadCell>
                      <TableHeadCell aria-sort={sortKey === 'category' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" onClick={() => handleSort('category')}>
                          카테고리{sortIcon('category')}
                        </button>
                      </TableHeadCell>
                      <TableHeadCell aria-sort={sortKey === 'amount' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" onClick={() => handleSort('amount')}>
                          금액{sortIcon('amount')}
                        </button>
                      </TableHeadCell>
                      <TableHeadCell>메모</TableHeadCell>
                      <TableHeadCell className="whitespace-nowrap">작업</TableHeadCell>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((t) => {
                      const entry = index.get(t.categoryId)
                      return (
                        <tr key={t.id} className="border-t hover:bg-muted/30 transition-colors">
                          <TableDataCell className="text-muted-foreground whitespace-nowrap">{fmtDate(t.transactionDate)}</TableDataCell>
                          <TableDataCell>
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="inline-block size-2 rounded-full"
                                style={{ backgroundColor: flowCategoryColor(orderedRootIds, entry?.rootId ?? '') }}
                              />
                              {entry?.name ?? '(알 수 없음)'}
                            </span>
                          </TableDataCell>
                          <TableDataCell className="tabular-nums whitespace-nowrap">{fmtKrw(t.amount)}</TableDataCell>
                          <TableDataCell className={cn(!t.memo && 'text-muted-foreground')}>{t.memo ?? '—'}</TableDataCell>
                          <TableDataCell>
                            <div className="flex items-center justify-center">
                              <ShareableRowActions
                                onEdit={() => editDialog.request(t)}
                                onDuplicate={() => duplicateDialog.request(t)}
                                onShare={() => handleShare(t.id)}
                                onUnshare={() => handleUnshare(t.id)}
                                onDelete={() => deleteDialog.request(t.id)}
                                canShare={canShare}
                                hasGroupId={!!t.groupId}
                                sharePending={shareMutation.isPending}
                                unsharePending={unshareMutation.isPending}
                                readOnly={isClosed(t.transactionDate)}
                                lockTitle={closedMonthTitle}
                              />
                            </div>
                          </TableDataCell>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="m-0 list-none divide-y rounded-[var(--r-lg)] border border-border p-0 lg:hidden" aria-label="거래내역 모바일">
                {paged.map((t) => {
                  const entry = index.get(t.categoryId)
                  return (
                    <li key={t.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-1.5">
                            <span
                              className="inline-block size-2 rounded-full"
                              style={{ backgroundColor: flowCategoryColor(orderedRootIds, entry?.rootId ?? '') }}
                            />
                            <span className="truncate text-sm font-medium">{entry?.name ?? '(알 수 없음)'}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(t.transactionDate)}</span>
                          </div>
                        </div>
                        <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums">{fmtKrw(t.amount)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{t.memo ?? '—'}</p>
                        <ShareableRowActions
                          onEdit={() => editDialog.request(t)}
                          onDuplicate={() => duplicateDialog.request(t)}
                          onShare={() => handleShare(t.id)}
                          onUnshare={() => handleUnshare(t.id)}
                          onDelete={() => deleteDialog.request(t.id)}
                          canShare={canShare}
                          hasGroupId={!!t.groupId}
                          sharePending={shareMutation.isPending}
                          unsharePending={unshareMutation.isPending}
                          readOnly={isClosed(t.transactionDate)}
                          lockTitle={closedMonthTitle}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>

              {totalPages > 1 && <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={setPage} />}
            </>
          )}
        </>
      )}

      {unclassifiedCount > 0 && (
        <p className="text-xs text-muted-foreground">분류할 수 없는 내역 {unclassifiedCount}건 (카테고리가 삭제됨)</p>
      )}

      {editDialog.target && (
        <TransactionFormDialog
          open
          onOpenChange={editDialog.onOpenChange}
          type={type}
          initial={editDialog.target}
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
      <ConfirmDeleteDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.onOpenChange}
        title="거래내역을 삭제하시겠습니까?"
        description="삭제한 내역은 복구할 수 없습니다."
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}

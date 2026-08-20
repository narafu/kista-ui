'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { EmptyState } from '@shared/ui/EmptyState'
import { SectionError } from '@shared/ui/SectionError'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { cn } from '@shared/lib/utils'
import { fmtDate, fmtKrw } from '@shared/lib/format'
import { useConfirmDialog } from '@shared/lib/hooks/use-confirm-dialog'
import {
  collectSubtreeIds,
  filterByType,
  flowCategoryColor,
  periodRange,
  unclassifiedTransactions,
  useDeleteFinanceTransactionMutation,
  windowRange,
} from '@entities/finance'
import type { CategoryIndex, FinanceCategory, FinanceCategoryType, FinanceTransaction, Period } from '@entities/finance'
import { TransactionFormDialog } from '@features/finance/save-transaction'
import { DeleteTransactionDialog } from '@features/finance/delete-transaction'
import { ALL_FILTER_VALUE, FinanceRecordFilters } from './FinanceRecordFilters'

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
}

export function FinanceRecordList({ type, transactions, categoryTree, index, period, isLoading, isError }: Props) {
  const deleteMutation = useDeleteFinanceTransactionMutation()

  const [categoryPath, setCategoryPath] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('transactionDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState('10')

  const editDialog = useConfirmDialog<FinanceTransaction>()
  const deleteDialog = useConfirmDialog<string>()

  const orderedRootIds = useMemo(() => [...categoryTree].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.id), [categoryTree])

  const { from, to } = periodRange(period)
  // 수정 다이얼로그의 날짜 min/max는 표시 중인 period(월간이면 그 달만)가 아니라 실제로 조회된
  // 12개월 윈도우 전체다 — periodRange보다 넓게 허용해야 "다른 날짜로 옮기고 싶다"는 정상적인
  // 수정 요청까지 막지 않는다.
  const window = windowRange(period.month)
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
    () => inPeriod.filter((t) => categorySubtreeIds === null || categorySubtreeIds.has(t.categoryId)),
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
    return <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">불러오는 중…</div>
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
            <FinanceRecordFilters categoryTree={categoryTree} categoryPath={categoryPath} onCategoryPathChange={setCategoryPath} />
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
                      <TableHeadCell className="w-24">작업</TableHeadCell>
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
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" onClick={() => editDialog.request(t)} className="text-xs font-semibold text-foreground hover:text-[var(--brand-fg-soft)]">수정</button>
                              <span className="text-muted-foreground/40">·</span>
                              <button type="button" onClick={() => deleteDialog.request(t.id)} className="text-xs font-semibold text-destructive hover:text-destructive/80">삭제</button>
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
                          <p className="truncate text-xs text-muted-foreground">{t.memo ?? '—'}</p>
                        </div>
                        <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums">{fmtKrw(t.amount)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-3 border-t pt-3">
                        <button type="button" onClick={() => editDialog.request(t)} className="px-1 py-2 text-xs font-semibold text-foreground">수정</button>
                        <button type="button" onClick={() => deleteDialog.request(t.id)} className="px-1 py-2 text-xs font-semibold text-destructive">삭제</button>
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
          windowFrom={window.from}
          windowTo={window.to}
          onSuccess={() => editDialog.close()}
        />
      )}
      <DeleteTransactionDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.onOpenChange}
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}

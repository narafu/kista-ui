'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { SectionError } from '@shared/ui/SectionError'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { cn } from '@shared/lib/utils'
import { fmtDate, fmtKrw } from '@shared/lib/format'
import { useConfirmDialog } from '@shared/lib/hooks/use-confirm-dialog'
import { useMeta } from '@entities/meta'
import {
  ASSET_L1_CATEGORY_IDS,
  SYSTEM_INVESTMENT_CATEGORY_ID,
  SYSTEM_LOAN_CATEGORY_ID,
  SYSTEM_REAL_ESTATE_CATEGORY_ID,
  SYSTEM_SAVINGS_CATEGORY_ID,
  collectSubtreeIds,
  isLiability,
  listAvailableMonths,
  useAssetSnapshotsQuery,
  useDeleteManyAssetSnapshotsMutation,
  useFinanceCategoriesQuery,
} from '@entities/finance'
import type { AssetSnapshot } from '@entities/finance'
import { DeleteAssetDialog } from '@features/asset/delete-asset'
import { AssetRecordFilters, ALL_FILTER_VALUE } from './AssetRecordFilters'
import type { AssetFilterValue } from './AssetRecordFilters'

type SortKey = 'entryDate' | 'category' | 'amount'
type SortDirection = 'asc' | 'desc'

const CATEGORY_TONE: Record<string, 'brand' | 'error' | 'neutral'> = {
  [SYSTEM_INVESTMENT_CATEGORY_ID]: 'brand',
  [SYSTEM_SAVINGS_CATEGORY_ID]: 'neutral',
  [SYSTEM_LOAN_CATEGORY_ID]: 'error',
  [SYSTEM_REAL_ESTATE_CATEGORY_ID]: 'neutral',
}

// 체크박스 aria-label 전용 — 컬럼 분리 이후 화면에는 이 조합 문자열이 그대로 보이지 않지만,
// 카테고리명을 먼저 말해 화면(왼쪽 카테고리·오른쪽 계좌 등) 순서와 맞춘다.
function accountLabel(snapshot: AssetSnapshot): string {
  return snapshot.accountName ? `${snapshot.categoryName} · ${snapshot.accountName}` : snapshot.categoryName
}

export function AssetRecordList() {
  const { data: snapshots = [], isLoading, isError } = useAssetSnapshotsQuery()
  const { data: categories = [] } = useFinanceCategoriesQuery('ASSET')
  const { meta, labelOf } = useMeta()
  const deleteManyMutation = useDeleteManyAssetSnapshotsMutation()

  const [month, setMonth] = useState<AssetFilterValue>(ALL_FILTER_VALUE)
  const [categoryPath, setCategoryPath] = useState<string[]>([])
  const [assetClass, setAssetClass] = useState<AssetFilterValue>(ALL_FILTER_VALUE)
  const [market, setMarket] = useState<AssetFilterValue>(ALL_FILTER_VALUE)
  const [sortKey, setSortKey] = useState<SortKey>('entryDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState('10')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const deleteDialog = useConfirmDialog<string[]>()

  const months = useMemo(() => listAvailableMonths(snapshots), [snapshots])
  // 계단식 필터가 중간 depth에서 멈추면 그 하위 카테고리 전부를 포함해 매칭한다.
  const categorySubtreeIds = useMemo(() => {
    if (categoryPath.length === 0) return null
    return new Set(collectSubtreeIds(categories, categoryPath[categoryPath.length - 1]))
  }, [categories, categoryPath])

  const filtered = useMemo(() => snapshots.filter((snapshot) =>
    (month === ALL_FILTER_VALUE || snapshot.entryDate.startsWith(month)) &&
    (categorySubtreeIds === null || categorySubtreeIds.has(snapshot.categoryId)) &&
    (assetClass === ALL_FILTER_VALUE || snapshot.assetClass === assetClass) &&
    (market === ALL_FILTER_VALUE || snapshot.market === market),
  ), [snapshots, month, categorySubtreeIds, assetClass, market])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      let diff = 0
      if (sortKey === 'entryDate') diff = a.entryDate.localeCompare(b.entryDate)
      else if (sortKey === 'category') diff = ASSET_L1_CATEGORY_IDS.indexOf(a.rootCategoryId) - ASSET_L1_CATEGORY_IDS.indexOf(b.rootCategoryId)
      else diff = a.amount - b.amount
      return sortDirection === 'asc' ? diff : -diff
    })
    return copy
  }, [filtered, sortKey, sortDirection])

  // 필터 변경은 결과 집합 자체를 바꾸므로 페이지를 1로 리셋하고 선택도 초기화한다(선택 유지 시
  // 필터를 바꾼 뒤 화면에 없는 레코드가 실수로 함께 삭제될 수 있다). 정렬·페이지 이동은 같은 결과
  // 집합 안에서의 보기 방식만 바꿀 뿐이므로 선택을 유지한다 — 여러 페이지에 걸친 선택 삭제(다건
  // 선택 후 페이지를 넘겨가며 추가 선택)를 의도적으로 허용한다. 페이지 크기 변경은 handlePageSizeChange가 처리한다.
  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [month, categoryPath, assetClass, market])

  function handlePageSizeChange(nextSize: string) {
    setPageSize(nextSize)
    setPage(1)
  }

  const size = Number(pageSize)
  const totalPages = Math.max(1, Math.ceil(sorted.length / size))
  const currentPage = Math.min(page, totalPages)
  const paged = sorted.slice((currentPage - 1) * size, currentPage * size)

  const pagedIds = useMemo(() => paged.map((snapshot) => snapshot.id), [paged])
  const allPagedSelected = pagedIds.length > 0 && pagedIds.every((id) => selectedIds.has(id))
  const somePagedSelected = pagedIds.some((id) => selectedIds.has(id))
  const headerCheckboxRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = somePagedSelected && !allPagedSelected
    }
  }, [somePagedSelected, allPagedSelected])

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPagedSelected) {
        pagedIds.forEach((id) => next.delete(id))
      } else {
        pagedIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

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

  function confirmDelete() {
    if (!deleteDialog.target) return
    deleteManyMutation.mutate(deleteDialog.target, {
      onSuccess: ({ succeededIds, failedCount }) => {
        deleteDialog.close()
        // 전체 실패 시 succeededIds가 비어있고, 이 경우 에러 toast는 useDeleteManyAssetSnapshotsMutation이 이미 띄운다
        if (succeededIds.length === 0) return

        setSelectedIds((prev) => {
          const next = new Set(prev)
          succeededIds.forEach((id) => next.delete(id))
          return next
        })

        if (failedCount === 0) {
          toast.success(succeededIds.length > 1 ? `자산 기록 ${succeededIds.length}건을 삭제했습니다` : '자산 기록을 삭제했습니다')
        } else {
          toast.warning(`${succeededIds.length}건 삭제, ${failedCount}건 실패`)
        }
      },
    })
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">불러오는 중…</div>
  }
  if (isError) {
    return <SectionError message="자산 기록을 불러오지 못했습니다" />
  }
  if (snapshots.length === 0) {
    return <EmptyState message="등록된 자산 기록이 없습니다. 자산 등록 버튼으로 첫 기록을 추가해보세요." />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <AssetRecordFilters
          month={month}
          categoryTree={categories}
          categoryPath={categoryPath}
          assetClass={assetClass}
          market={market}
          months={months}
          assetClasses={meta.assetClasses}
          markets={meta.markets}
          onMonthChange={setMonth}
          onCategoryPathChange={setCategoryPath}
          onAssetClassChange={setAssetClass}
          onMarketChange={setMarket}
        />
        <PageSizeSelector value={pageSize} onChange={handlePageSizeChange} />
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-[var(--r-md)] border border-border bg-muted/40 px-4 py-2.5">
          <span className="text-sm font-medium">{selectedIds.size}건 선택됨</span>
          <button
            type="button"
            onClick={() => deleteDialog.request(Array.from(selectedIds))}
            className="text-sm font-semibold text-destructive hover:text-destructive/80"
          >
            선택 삭제
          </button>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState variant="text" message="조건에 맞는 자산 기록이 없습니다." />
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block rounded-[var(--r-lg)] border border-border">
            <table className="w-full min-w-[1080px] text-sm" aria-label="자산 기록">
              <thead className="bg-muted/50">
                <tr>
                  <TableHeadCell className="w-10">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      aria-label="현재 페이지 전체 선택"
                      checked={allPagedSelected}
                      onChange={toggleAllOnPage}
                      className="size-4"
                    />
                  </TableHeadCell>
                  <TableHeadCell aria-sort={sortKey === 'entryDate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => handleSort('entryDate')}>
                      기준일{sortIcon('entryDate')}
                    </button>
                  </TableHeadCell>
                  <TableHeadCell aria-sort={sortKey === 'category' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => handleSort('category')}>
                      카테고리{sortIcon('category')}
                    </button>
                  </TableHeadCell>
                  <TableHeadCell>자산군</TableHeadCell>
                  <TableHeadCell>시장</TableHeadCell>
                  <TableHeadCell>운용전략</TableHeadCell>
                  <TableHeadCell>계좌</TableHeadCell>
                  <TableHeadCell aria-sort={sortKey === 'amount' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => handleSort('amount')}>
                      금액{sortIcon('amount')}
                    </button>
                  </TableHeadCell>
                  <TableHeadCell className="w-32">작업</TableHeadCell>
                </tr>
              </thead>
              <tbody>
                {paged.map((snapshot) => (
                  <tr key={snapshot.id} className="border-t hover:bg-muted/30 transition-colors">
                    <TableDataCell>
                      <input
                        type="checkbox"
                        aria-label={`${fmtDate(snapshot.entryDate)} ${accountLabel(snapshot)} 선택`}
                        checked={selectedIds.has(snapshot.id)}
                        onChange={() => toggleRow(snapshot.id)}
                        className="size-4"
                      />
                    </TableDataCell>
                    <TableDataCell className="text-muted-foreground whitespace-nowrap">{fmtDate(snapshot.entryDate)}</TableDataCell>
                    <TableDataCell>
                      <Badge tone={CATEGORY_TONE[snapshot.rootCategoryId] ?? 'neutral'} size="sm">{snapshot.categoryName}</Badge>
                    </TableDataCell>
                    <TableDataCell>{labelOf('assetClasses', snapshot.assetClass)}</TableDataCell>
                    <TableDataCell>{labelOf('markets', snapshot.market)}</TableDataCell>
                    <TableDataCell className={cn(!snapshot.strategy && 'text-muted-foreground')}>{snapshot.strategy ?? '—'}</TableDataCell>
                    <TableDataCell className={cn(!snapshot.accountName && 'text-muted-foreground')}>{snapshot.accountName ?? '—'}</TableDataCell>
                    <TableDataCell className={cn('tabular-nums whitespace-nowrap', isLiability(snapshot) && 'text-destructive')}>
                      {fmtKrw(snapshot.amount)}
                    </TableDataCell>
                    <TableDataCell>
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/finance/new?duplicateFrom=${snapshot.id}`} className="text-xs font-semibold text-foreground hover:text-[var(--brand-fg-soft)]">복제</Link>
                        <span className="text-muted-foreground/40">·</span>
                        <Link href={`/finance/${snapshot.id}/edit`} className="text-xs font-semibold text-foreground hover:text-[var(--brand-fg-soft)]">수정</Link>
                        <span className="text-muted-foreground/40">·</span>
                        <button type="button" onClick={() => deleteDialog.request([snapshot.id])} className="text-xs font-semibold text-destructive hover:text-destructive/80">삭제</button>
                      </div>
                    </TableDataCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="m-0 list-none divide-y rounded-[var(--r-lg)] border border-border p-0 lg:hidden" aria-label="자산 기록 모바일">
            {paged.map((snapshot) => (
              <li key={snapshot.id} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`${fmtDate(snapshot.entryDate)} ${accountLabel(snapshot)} 선택`}
                    checked={selectedIds.has(snapshot.id)}
                    onChange={() => toggleRow(snapshot.id)}
                    className="size-4 mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <Badge tone={CATEGORY_TONE[snapshot.rootCategoryId] ?? 'neutral'} size="sm">{snapshot.categoryName}</Badge>
                      <span className="text-xs text-muted-foreground">{fmtDate(snapshot.entryDate)}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium">{labelOf('assetClasses', snapshot.assetClass)}</p>
                      <span className={cn('shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums', isLiability(snapshot) && 'text-destructive')}>
                        {fmtKrw(snapshot.amount)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {[labelOf('markets', snapshot.market), snapshot.strategy, snapshot.accountName].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-3 border-t pt-3">
                  <Link href={`/finance/new?duplicateFrom=${snapshot.id}`} className="px-1 py-2 text-xs font-semibold text-foreground">복제</Link>
                  <Link href={`/finance/${snapshot.id}/edit`} className="px-1 py-2 text-xs font-semibold text-foreground">수정</Link>
                  <button type="button" onClick={() => deleteDialog.request([snapshot.id])} className="px-1 py-2 text-xs font-semibold text-destructive">삭제</button>
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <DeleteAssetDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.onOpenChange}
        count={deleteDialog.target?.length ?? 0}
        onConfirm={confirmDelete}
        isPending={deleteManyMutation.isPending}
      />
    </div>
  )
}

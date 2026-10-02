'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { SectionError } from '@shared/ui/SectionError'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { ConfirmDeleteDialog } from '@shared/ui/ConfirmDeleteDialog'
import { useConfirmDialog } from '@shared/lib/hooks/use-confirm-dialog'
import { useClientPagination } from '@shared/lib/hooks/use-client-pagination'
import { useTableSort } from '@shared/lib/hooks/use-table-sort'
import { useMeta } from '@entities/meta'
import {
  ASSET_L1_CATEGORY_IDS,
  collectSubtreeIds,
  isMonthClosed,
  useMonthlyClosingScopeGroupId,
  useAssetSnapshotsQuery,
  useCanShareToGroup,
  useDeleteManyAssetSnapshotsMutation,
  useFinanceCategoriesQuery,
  useMonthlyClosingsQuery,
  useShareAssetSnapshotMutation,
  useUnshareAssetSnapshotMutation,
} from '@entities/finance'
import { AssetRecordFilters, ALL_FILTER_VALUE } from './AssetRecordFilters'
import type { AssetFilterValue } from './AssetRecordFilters'
import { AssetRecordTable, AssetRecordMobileList } from './AssetRecordRows'
import type { AssetRowContext, SortKey } from './AssetRecordRows'

interface Props {
  month: string
}

export function AssetRecordList({ month }: Props) {
  const { data: snapshots = [], isLoading, isError } = useAssetSnapshotsQuery()
  const { data: categories = [] } = useFinanceCategoriesQuery('ASSET')
  const { data: monthlyClosings = [] } = useMonthlyClosingsQuery()
  const closingScopeGroupId = useMonthlyClosingScopeGroupId()
  const monthClosed = isMonthClosed(monthlyClosings, month, closingScopeGroupId)
  const closedMonthTitle = '기록 점검이 완료된 달입니다 · 기록 점검에서 완료를 해제하면 편집할 수 있습니다'
  const { meta, labelOf } = useMeta()
  const deleteManyMutation = useDeleteManyAssetSnapshotsMutation()
  const shareMutation = useShareAssetSnapshotMutation()
  const unshareMutation = useUnshareAssetSnapshotMutation()
  const canShare = useCanShareToGroup()

  function handleShare(id: string) {
    shareMutation.mutate(id, { onSuccess: () => toast.success('그룹에 공유했습니다') })
  }

  function handleUnshare(id: string) {
    unshareMutation.mutate(id, { onSuccess: () => toast.success('개인 소유로 되돌렸습니다') })
  }

  const [categoryPath, setCategoryPath] = useState<string[]>([])
  const [assetClass, setAssetClass] = useState<AssetFilterValue>(ALL_FILTER_VALUE)
  const [market, setMarket] = useState<AssetFilterValue>(ALL_FILTER_VALUE)
  const { sortKey, sortDirection, handleSort } = useTableSort<SortKey>('entryDate')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const deleteDialog = useConfirmDialog<string[]>()

  // 계단식 필터가 중간 depth에서 멈추면 그 하위 카테고리 전부를 포함해 매칭한다.
  const categorySubtreeIds = useMemo(() => {
    if (categoryPath.length === 0) return null
    return new Set(collectSubtreeIds(categories, categoryPath[categoryPath.length - 1]))
  }, [categories, categoryPath])

  const filtered = useMemo(() => snapshots.filter((snapshot) =>
    snapshot.entryDate.startsWith(month) &&
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

  const { page: currentPage, setPage, size, totalPages, paged, handlePageSizeChange } = useClientPagination(sorted)

  // 필터 변경은 결과 집합 자체를 바꾸므로 페이지를 1로 리셋하고 선택도 초기화한다(선택 유지 시
  // 필터를 바꾼 뒤 화면에 없는 레코드가 실수로 함께 삭제될 수 있다). 정렬·페이지 이동은 같은 결과
  // 집합 안에서의 보기 방식만 바꿀 뿐이므로 선택을 유지한다 — 여러 페이지에 걸친 선택 삭제(다건
  // 선택 후 페이지를 넘겨가며 추가 선택)를 의도적으로 허용한다. 페이지 크기 변경은 handlePageSizeChange가 처리한다.
  useEffect(() => {
    setPage(1)
    // eslint-disable-next-line react-doctor/no-adjust-state-on-prop-change -- key 리마운트는 필터 상태까지 날려 의도와 다름, 1프레임 지연만 감수
    setSelectedIds(new Set())
  }, [month, categoryPath, assetClass, market, setPage])

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

  const rowCtx: AssetRowContext = {
    selectedIds,
    monthClosed,
    closedMonthTitle,
    canShare,
    sharePending: shareMutation.isPending,
    unsharePending: unshareMutation.isPending,
    labelOf,
    onToggleRow: toggleRow,
    onShare: handleShare,
    onUnshare: handleUnshare,
    onDelete: (id) => deleteDialog.request([id]),
  }

  if (isLoading) {
    return <LoadingRow />
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
          categoryTree={categories}
          categoryPath={categoryPath}
          assetClass={assetClass}
          market={market}
          assetClasses={meta.assetClasses}
          markets={meta.markets}
          onCategoryPathChange={setCategoryPath}
          onAssetClassChange={setAssetClass}
          onMarketChange={setMarket}
        />
        <PageSizeSelector value={String(size)} onChange={handlePageSizeChange} />
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-[var(--r-md)] border border-border bg-muted/40 px-4 py-2.5">
          <span className="text-sm font-medium">{selectedIds.size}건 선택됨</span>
          <Button type="button" variant="destructive" size="sm" onClick={() => deleteDialog.request(Array.from(selectedIds))}>
            선택 삭제
          </Button>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState variant="text" message="조건에 맞는 자산 기록이 없습니다." />
      ) : (
        <>
          <AssetRecordTable
            paged={paged}
            row={rowCtx}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            headerCheckboxRef={headerCheckboxRef}
            allPagedSelected={allPagedSelected}
            onToggleAll={toggleAllOnPage}
          />
          <AssetRecordMobileList paged={paged} row={rowCtx} />

          {totalPages > 1 && (
            <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <ConfirmDeleteDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.onOpenChange}
        title={
          (deleteDialog.target?.length ?? 0) > 1
            ? `자산 기록 ${deleteDialog.target?.length}건을 삭제하시겠습니까?`
            : '자산 기록을 삭제하시겠습니까?'
        }
        description="삭제한 기록은 복구할 수 없습니다."
        onConfirm={confirmDelete}
        isPending={deleteManyMutation.isPending}
      />
    </div>
  )
}

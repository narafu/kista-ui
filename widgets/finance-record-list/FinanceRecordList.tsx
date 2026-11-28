'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@shared/ui/EmptyState'
import { SectionError } from '@shared/ui/SectionError'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { ShareableRowActions } from '@shared/ui/ShareableRowActions'
import { GroupSharedBadge } from '@shared/ui/GroupSharedBadge'
import { CascadingCategorySelect } from '@shared/ui/CascadingCategorySelect'
import { TableHeadCell, evenColumnsClass } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { SortableHeadCell } from '@shared/ui/SortableHeadCell'
import { MobileSortControl } from '@shared/ui/MobileSortControl'
import { LoadMoreButton } from '@shared/ui/data-list/LoadMoreButton'
import { ConfirmDialog } from '@shared/ui/ConfirmDialog'
import { cn } from '@shared/lib/utils'
import { fmtDate, fmtKrw } from '@shared/lib/format'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'
import { useConfirmDialog } from '@shared/lib/hooks/use-confirm-dialog'
import { useDebouncedValue } from '@shared/lib/hooks/use-debounced-value'
import { useTableSort } from '@shared/lib/hooks/use-table-sort'
import {
  flowCategoryColor,
  getCascadeLevels,
  isMonthClosed,
  periodRange,
  sortCategoryTree,
  useFinanceTransactionsInfiniteQuery,
  useMonthlyClosingScopeGroupId,
  useCanShareToGroup,
  useDeleteFinanceTransactionMutation,
  useMonthlyClosingsQuery,
  useShareFinanceTransactionMutation,
  useUnshareFinanceTransactionMutation,
} from '@entities/finance'
import type { CategoryIndex, FinanceCategory, FinanceCategoryType, FinanceTransaction, Period } from '@entities/finance'
import { TransactionFormDialog } from '@features/finance/save-transaction'

type SortKey = 'transactionDate' | 'category' | 'amount' | 'memo'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'transactionDate', label: '날짜' },
  { key: 'category', label: '카테고리' },
  { key: 'amount', label: '금액' },
  { key: 'memo', label: '메모' },
]

interface Props {
  type: FinanceCategoryType
  categoryTree: FinanceCategory[]
  index: CategoryIndex
  period: Period
  // 카테고리 트리 로딩·실패(+자동 월 보정 대기) — 거래 목록의 로딩·실패는 위젯이 직접 조회해 판정한다.
  isLoading: boolean
  isError: boolean
  // 복제 시 새로 등록될 거래의 날짜 제약(하한 없음, 상한은 이번 달 말일 — "오늘 기준" 독립 창) —
  // useFinanceFlowData.ts의 registerWindow와 동일한 값. 수정용 window(조회 윈도우)와는 의도적으로 분리한다.
  registerWindowFrom?: string
  registerWindowTo?: string
  // useFinanceFlowData.ts가 한 번만 계산해 내려주는 "오늘" — 위젯마다 todayKst()를 각자 호출하지 않는다.
  today: string
  // 카테고리 필터 경로 — 예산 대비 카드의 행 클릭으로도 바뀌어 FlowPageView(app)가 소유한다.
  categoryPath: string[]
  onCategoryPathChange: (path: string[]) => void
}

export function FinanceRecordList({ type, categoryTree, index, period, isLoading, isError, registerWindowFrom, registerWindowTo, today, categoryPath, onCategoryPathChange }: Props) {
  const deleteMutation = useDeleteFinanceTransactionMutation()
  const shareMutation = useShareFinanceTransactionMutation()
  const unshareMutation = useUnshareFinanceTransactionMutation()
  const canShare = useCanShareToGroup()
  const { maskIfHidden } = useAmountHiddenPreference()
  const { data: monthlyClosings = [] } = useMonthlyClosingsQuery()
  const closingScopeGroupId = useMonthlyClosingScopeGroupId()
  // 기록 점검이 완료된 달의 거래는 서버가 등록·수정·삭제·공유를 전면 차단한다 — 행 작업 버튼을 미리 잠근다.
  const closedMonthTitle = '기록 점검이 완료된 달입니다 · 자산 탭의 기록 점검에서 완료를 해제하면 편집할 수 있습니다'
  const isClosed = (date: string) => isMonthClosed(monthlyClosings, date.slice(0, 7), closingScopeGroupId)

  function handleShare(id: string) {
    shareMutation.mutate(id, { onSuccess: () => toast.success('그룹에 공유했습니다') })
  }

  function handleUnshare(id: string) {
    unshareMutation.mutate(id, { onSuccess: () => toast.success('개인 소유로 되돌렸습니다') })
  }

  const [memoQuery, setMemoQuery] = useState('')
  const { sortKey, sortDirection, handleSort } = useTableSort<SortKey>('transactionDate')

  const editDialog = useConfirmDialog<FinanceTransaction>()
  const deleteDialog = useConfirmDialog<string>()
  const duplicateDialog = useConfirmDialog<FinanceTransaction>()

  const orderedRootIds = useMemo(() => sortCategoryTree(categoryTree).map((c) => c.id), [categoryTree])

  const { from, to } = periodRange(period, today)
  const trimmedMemo = memoQuery.trim()
  // 필터·정렬은 전부 서버 파라미터다(카테고리는 서버가 하위 트리까지 포함). 메모는 타이핑마다 재조회하지 않게 디바운스한다.
  const memo = useDebouncedValue(trimmedMemo, 300)
  const categoryId = categoryPath.at(-1)
  const {
    transactions,
    isLoading: isTransactionsLoading,
    isError: isTransactionsError,
    isPlaceholderData,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = useFinanceTransactionsInfiniteQuery(
    { from, to, type, categoryId, memo: memo || undefined, sort: `${sortKey},${sortDirection}` },
    { enabled: !isLoading && !isError },
  )

  const cascadeLevels = useMemo(() => getCascadeLevels(categoryTree, categoryPath), [categoryTree, categoryPath])

  // 정렬·필터가 바뀐 새 키의 첫 응답 전엔 이전 목록을 보이고(placeholder), 커서는 다른 sort와 섞이면 서버가 400이라
  // 그동안 "더 보기"를 막는다.
  const hasMore = hasNextPage && !isPlaceholderData
  // 필터 입력창이 타이핑 중 사라지면 포커스를 잃으므로, 필터가 하나라도 걸려 있거나 걸리는 중이면 빈 결과에도 필터 UI를 유지한다.
  const hasFilter = categoryPath.length > 0 || memo !== '' || trimmedMemo !== '' || isPlaceholderData

  function handleDelete() {
    if (!deleteDialog.target) return
    deleteMutation.mutate(deleteDialog.target, {
      onSuccess: () => {
        toast.success('거래내역을 삭제했습니다')
        deleteDialog.close()
      },
    })
  }

  if (isLoading || isTransactionsLoading) {
    return <LoadingRow />
  }
  if (isError || isTransactionsError) {
    return <SectionError message="거래내역을 불러오지 못했습니다." />
  }

  return (
    <div className="space-y-4">
      {transactions.length === 0 && !hasFilter ? (
        <EmptyState message="이 기간에 등록된 거래내역이 없습니다. 거래내역 등록 버튼으로 내역을 추가해보세요." />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <CascadingCategorySelect levels={cascadeLevels} path={categoryPath} onPathChange={onCategoryPathChange} className="w-full lg:w-32" />
              <Input
                type="search"
                value={memoQuery}
                onChange={(e) => setMemoQuery(e.target.value)}
                placeholder="메모 검색"
                aria-label="메모 검색"
                className="w-full lg:w-48"
              />
            </div>
          </div>

          {transactions.length === 0 ? (
            <EmptyState variant="text" message="조건에 맞는 거래내역이 없습니다." />
          ) : (
            <div className="space-y-4" aria-busy={isPlaceholderData || undefined}>
              <div className="hidden overflow-x-auto lg:block rounded-xl border border-border" role="region" aria-label="거래내역 표" tabIndex={0}>
                <table className={cn('w-full min-w-[720px] text-sm', evenColumnsClass(4))} aria-label="거래내역">
                  <thead className="bg-muted/50">
                    <tr>
                      <SortableHeadCell sortKey="transactionDate" activeKey={sortKey} direction={sortDirection} onSort={handleSort}>날짜</SortableHeadCell>
                      <SortableHeadCell sortKey="category" activeKey={sortKey} direction={sortDirection} onSort={handleSort}>카테고리</SortableHeadCell>
                      <SortableHeadCell numeric sortKey="amount" activeKey={sortKey} direction={sortDirection} onSort={handleSort}>금액</SortableHeadCell>
                      <SortableHeadCell sortKey="memo" activeKey={sortKey} direction={sortDirection} onSort={handleSort}>메모</SortableHeadCell>
                      <TableHeadCell className="w-px whitespace-nowrap">작업</TableHeadCell>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => {
                      const entry = index.get(t.categoryId)
                      const closed = isClosed(t.transactionDate)
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
                              <GroupSharedBadge groupId={t.groupId} />
                            </span>
                          </TableDataCell>
                          <TableDataCell className="tabular-nums whitespace-nowrap">{maskIfHidden(fmtKrw(t.amount))}</TableDataCell>
                          <TableDataCell className={cn(!t.memo && 'text-muted-foreground')}>{t.memo ?? '-'}</TableDataCell>
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
                                locked={closed}
                                lockShare={closed}
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

              <MobileSortControl options={SORT_OPTIONS} activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <ul className="m-0 list-none divide-y rounded-xl border border-border p-0 lg:hidden" aria-label="거래내역">
                {transactions.map((t) => {
                  const entry = index.get(t.categoryId)
                  const closed = isClosed(t.transactionDate)
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
                            <GroupSharedBadge groupId={t.groupId} />
                            <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(t.transactionDate)}</span>
                          </div>
                        </div>
                        <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums">{maskIfHidden(fmtKrw(t.amount))}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{t.memo ?? '-'}</p>
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
                          locked={closed}
                          lockShare={closed}
                          lockTitle={closedMonthTitle}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>

              <LoadMoreButton hasMore={hasMore} isFetching={isFetchingNextPage} isError={isFetchNextPageError} onLoadMore={fetchNextPage} />
            </div>
          )}
        </>
      )}

      {editDialog.target && (
        <TransactionFormDialog
          open
          onClose={editDialog.close}
          type={type}
          initial={editDialog.target}
        />
      )}

      {duplicateDialog.target && (
        <TransactionFormDialog
          open
          onClose={duplicateDialog.close}
          type={type}
          duplicateFrom={duplicateDialog.target}
          windowFrom={registerWindowFrom}
          windowTo={registerWindowTo}
        />
      )}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.onOpenChange}
        title="거래내역을 삭제하시겠습니까?"
        description="삭제한 거래내역은 복구할 수 없습니다."
        pending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}

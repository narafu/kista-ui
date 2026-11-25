'use client'

import { Surface } from '@shared/ui/Surface'
import { SectionTitle } from '@shared/ui/SectionTitle'
import { fmtUsd, fmtDate, fmtShares } from '@shared/lib/format'
import type { CycleHistoryItem } from '@entities/trade'
import type { DateParams } from '@entities/trade/hooks/useCycleHistory'
import { EmptyState } from '@shared/ui/EmptyState'
import { DataList, type DataListColumn } from '@shared/ui/data-list/DataList'
import { RangeFilterControls } from '@shared/ui/range-filter/RangeFilterControls'
import { useRangeFilterState } from '@shared/lib/hooks/use-range-filter-state'
import { resolveRangeStrict } from '@shared/lib/date-range'

interface HistoryQueryResult {
  cycleHistory: CycleHistoryItem[]
  isLoading: boolean
  isError?: boolean
  isFetchNextPageError?: boolean
  fetchNextPage: () => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
}

interface Props {
  title: string
  id: string | undefined
  useHistoryQuery: (id: string | undefined, params: DateParams) => HistoryQueryResult
  emptyIdMessage?: string
}

// 계좌 단위 이력은 한 배치에서 찍힌 여러 전략 스냅샷이 같은 createdAt을 가진다 — 응답에 id가 없고 생성 타입상 종목·유형도
// optional이라 그룹 안 순번까지 붙인다(목록은 뒤에 이어 붙기만 해 순번이 바뀌지 않는다)
function entryKey(entry: CycleHistoryItem, index: number) {
  return `${entry.createdAt}-${entry.strategyType}-${entry.ticker}-${index}`
}

const usd = (value: number | null | undefined) => (value != null ? `$${fmtUsd(value)}` : '-')

const COLUMNS: DataListColumn<CycleHistoryItem>[] = [
  { key: 'ticker', header: '티커', mobile: 'titleBadge', className: 'font-medium', cell: (e) => e.ticker ?? '-' },
  { key: 'holdings', header: '수량', mobile: 'badge', numeric: true, cell: (e) => fmtShares(e.holdings) },
  { key: 'avgPrice', header: '평단가', numeric: true, cell: (e) => usd(e.avgPrice) },
  // DCA는 시드를 두지 않아 예수금이 항상 0 — PC는 '-', 모바일은 항목을 뺀다
  {
    key: 'deposit',
    header: '예수금',
    numeric: true,
    className: 'font-medium',
    mobileHiddenWhen: (e) => e.strategyType === 'DCA',
    cell: (e) => (e.strategyType === 'DCA' ? '-' : usd(e.deposit ?? 0)),
  },
  {
    key: 'evalAmount',
    header: '평가금액',
    mobile: 'hidden',
    numeric: true,
    className: 'font-medium',
    cell: (e) => usd(e.avgPrice != null && e.holdings > 0 ? e.avgPrice * e.holdings : null),
  },
]

export function CycleHistoryTable({ title, id, useHistoryQuery, emptyIdMessage }: Props) {
  const { rangeType, customFrom, customTo, pageSize, setRangeType, setCustomFrom, setCustomTo, setPageSize } =
    useRangeFilterState()
  const baseParams = resolveRangeStrict(rangeType, customFrom, customTo)
  const params = baseParams !== null ? { ...baseParams, size: Number(pageSize) } : null
  const { cycleHistory, isLoading, isError, isFetchNextPageError, fetchNextPage, hasNextPage, isFetchingNextPage } = useHistoryQuery(id, params)

  if (!id && emptyIdMessage) {
    return (
      <Surface size="compact" className="flex flex-col gap-4 overflow-hidden text-sm">
        <SectionTitle className="pb-3">{title}</SectionTitle>
        <EmptyState variant="text" message={emptyIdMessage} />
      </Surface>
    )
  }

  return (
    <Surface size="flush" className="flex flex-col gap-4 overflow-hidden py-4 text-sm">
      <div className="px-4 pb-3">
        <div className="space-y-2">
          <SectionTitle>{title}</SectionTitle>
          <RangeFilterControls
            rangeType={rangeType}
            onRangeChange={setRangeType}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
        </div>
      </div>

      <div>
        {/* 날짜(fmtDate 결과)별 그룹 — 입력 순서(최신순) 유지 */}
        <DataList
          label={title}
          rows={cycleHistory}
          columns={COLUMNS}
          rowKey={entryKey}
          isLoading={isLoading}
          isError={isError}
          errorMessage="잔고 이력을 불러오지 못했습니다."
          empty="잔고 이력이 없습니다."
          groupBy={{ header: '날짜', key: (item) => fmtDate(item.createdAt) }}
          loadMore={{ hasMore: hasNextPage, isFetching: isFetchingNextPage, isError: isFetchNextPageError, onLoadMore: fetchNextPage }}
          tableClassName="xl:[&_td]:px-1.5 xl:[&_th]:px-1.5 xl:[&_th]:tracking-normal"
        />
      </div>
    </Surface>
  )
}

'use client'

import { Fragment } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtUsd, fmtDate } from '@shared/lib/format'
import type { CycleHistoryItem } from '@entities/trade'
import type { DateParams } from '@entities/trade/hooks/useCycleHistory'
import { EmptyState } from '@shared/ui/EmptyState'
import { Badge } from '@shared/ui/Badge'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { RangeFilterControls } from '@shared/ui/range-filter/RangeFilterControls'
import { useRangeFilterState } from '@shared/lib/hooks/use-range-filter-state'
import { resolveRangeStrict } from '@shared/lib/date-range'
import { SectionError } from '@shared/ui/SectionError'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { Button } from '@/components/ui/button'

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

export function CycleHistoryTable({ title, id, useHistoryQuery, emptyIdMessage }: Props) {
  const { rangeType, customFrom, customTo, pageSize, setRangeType, setCustomFrom, setCustomTo, setPageSize } =
    useRangeFilterState()
  const baseParams = resolveRangeStrict(rangeType, customFrom, customTo)
  const params = baseParams !== null ? { ...baseParams, size: Number(pageSize) } : null
  const { cycleHistory, isLoading, isError, isFetchNextPageError, fetchNextPage, hasNextPage, isFetchingNextPage } = useHistoryQuery(id, params)

  if (!id && emptyIdMessage) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState variant="text" message={emptyIdMessage} />
        </CardContent>
      </Card>
    )
  }

  // 날짜(fmtDate 결과)별 그룹 — 입력 순서(최신순) 유지
  const groups = cycleHistory.reduce<{ date: string; items: CycleHistoryItem[] }[]>((acc, item) => {
    const date = fmtDate(item.createdAt)
    const last = acc[acc.length - 1]
    if (last && last.date === date) last.items.push(item)
    else acc.push({ date, items: [item] })
    return acc
  }, [])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">{title}</CardTitle>
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
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <LoadingRow />
        ) : isError ? (
          <SectionError message="잔고 이력을 불러오지 못했습니다." />
        ) : cycleHistory.length === 0 ? (
          <EmptyState variant="text" message="잔고 이력이 없습니다." />
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <div className="space-y-2 p-4 lg:hidden">
              {groups.map((g) => (
                <div key={g.date} className="space-y-1.5">
                  <div className="px-1 pt-2 text-sm uppercase tracking-widest text-muted-foreground">{g.date}</div>
                  {g.items.map((entry, i) => (
                    <div key={entryKey(entry, i)} className="rounded-[var(--r-md)] border border-border bg-card px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Badge tone="brand" size="sm" className="px-2.5 font-bold">
                          {entry.ticker ?? '-'}
                        </Badge>
                        <span className="text-sm font-semibold">{entry.holdings}주</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          평단 <span className="font-semibold text-foreground">{entry.avgPrice != null ? `$${fmtUsd(entry.avgPrice)}` : '-'}</span>
                        </span>
                        {/* DCA는 시드를 두지 않아 예수금이 항상 0 — 표시하지 않는다 */}
                        {entry.strategyType !== 'DCA' && (
                          <span className="text-muted-foreground">
                            예수금 <span className="font-semibold text-foreground">${fmtUsd(entry.usdDeposit ?? 0)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {/* 데스크탑: 테이블 */}
            <div className="hidden lg:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <TableHeadCell>티커</TableHeadCell>
                    <TableHeadCell numeric>수량</TableHeadCell>
                    <TableHeadCell numeric>평단가</TableHeadCell>
                    <TableHeadCell numeric>예수금</TableHeadCell>
                    <TableHeadCell numeric>평가금액</TableHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <Fragment key={g.date}>
                      <tr>
                        <td colSpan={5} className="bg-muted/30 px-4 py-2 text-xs lg:text-sm uppercase tracking-widest text-muted-foreground">{g.date}</td>
                      </tr>
                      {g.items.map((entry, i) => {
                        const evalAmount = entry.avgPrice != null && entry.holdings > 0
                          ? entry.avgPrice * entry.holdings
                          : null
                        return (
                          <tr key={entryKey(entry, i)} className="border-t hover:bg-muted/30 transition-colors">
                            <TableDataCell className="font-medium">{entry.ticker ?? '-'}</TableDataCell>
                            <TableDataCell className="text-right tabular-nums whitespace-nowrap">{entry.holdings}주</TableDataCell>
                            <TableDataCell className="text-right tabular-nums whitespace-nowrap">{entry.avgPrice != null ? `$${fmtUsd(entry.avgPrice)}` : '-'}</TableDataCell>
                            <TableDataCell className="text-right tabular-nums whitespace-nowrap font-medium">{entry.strategyType === 'DCA' ? '-' : `$${fmtUsd(entry.usdDeposit ?? 0)}`}</TableDataCell>
                            <TableDataCell className="text-right tabular-nums whitespace-nowrap font-medium">{evalAmount != null ? `$${fmtUsd(evalAmount)}` : '-'}</TableDataCell>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 더 보기 버튼 — 모바일·데스크탑 공통 */}
            {(hasNextPage || isFetchingNextPage) && (
              <div className="flex flex-col items-center gap-1 py-4 border-t">
                {isFetchNextPageError && !isFetchingNextPage && (
                  <p role="alert" className="text-sm text-[var(--status-error)]">다음 내역을 불러오지 못했습니다. 다시 시도해주세요.</p>
                )}
                <Button type="button" variant="outline" onClick={fetchNextPage} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? '불러오는 중…' : '더 보기'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

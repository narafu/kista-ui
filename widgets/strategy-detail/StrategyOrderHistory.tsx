'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStrategyOrdersQuery, orderStatusBadgeClass, type StrategyOrder } from '@entities/order'
import { directionBadgeClass } from '@entities/trade'
import { useMeta } from '@entities/meta'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { Badge } from '@shared/ui/Badge'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { RangeFilterControls } from '@shared/ui/range-filter/RangeFilterControls'
import { fmtDate, fmtQuantity, fmtUsd } from '@shared/lib/format'
import { toNum } from '@shared/lib/utils'
import { resolveRangeStrict } from '@shared/lib/date-range'
import { useRangeFilterState } from '@shared/lib/hooks/use-range-filter-state'
import { ALL_FILTER_VALUE, OrderHistoryFilters, type OrderHistoryFilterValue } from './OrderHistoryFilters'

interface Props {
  strategyId: string
}

// 체결 수량이 있으면 체결/주문 수량, 없으면 주문 수량
function OrderQuantity({ o }: { o: StrategyOrder }) {
  if (o.filledQuantity == null) return <>{fmtQuantity(o.quantity)}</>
  return (
    <span>
      <span className="font-medium">{fmtQuantity(o.filledQuantity)}</span>
      {o.filledQuantity !== o.quantity && <span className="text-muted-foreground text-xs">/{fmtQuantity(o.quantity)}</span>}
    </span>
  )
}

export function StrategyOrderHistory({ strategyId }: Props) {
  const { labelOf } = useMeta()
  const { rangeType, customFrom, customTo, pageSize, setRangeType, setCustomFrom, setCustomTo, setPageSize } = useRangeFilterState()
  const [page, setPage] = useState(1)
  const [directionFilter, setDirectionFilter] = useState<OrderHistoryFilterValue>(ALL_FILTER_VALUE)
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderHistoryFilterValue>(ALL_FILTER_VALUE)
  const [statusFilter, setStatusFilter] = useState<OrderHistoryFilterValue>('FILLED')
  // 기간/커스텀 날짜/페이지 크기 변경 시 페이지를 1로 리셋 (기존 로컬 reducer 동작 재현)
  useEffect(() => setPage(1), [rangeType, customFrom, customTo, pageSize, directionFilter, orderTypeFilter, statusFilter])

  const range = resolveRangeStrict(rangeType, customFrom, customTo)
  const { data, isLoading, isError, error } = useStrategyOrdersQuery(strategyId, range?.from, range?.to, { enabled: range !== null })
  const orders = data ?? []

  const size = Number(pageSize)
  const filteredOrders = orders.filter((order) =>
    (directionFilter === ALL_FILTER_VALUE || order.direction === directionFilter) &&
    (orderTypeFilter === ALL_FILTER_VALUE || order.orderType === orderTypeFilter) &&
    (statusFilter === ALL_FILTER_VALUE || order.status === statusFilter)
  )
  const totalPages = Math.ceil(filteredOrders.length / size)
  const pageOrders = filteredOrders.slice((page - 1) * size, page * size)
  // 날짜(fmtDate 결과)별 그룹 — 입력 순서 유지
  const groups = pageOrders.reduce<{ date: string; items: StrategyOrder[] }[]>((acc, o) => {
    const date = fmtDate(o.tradeDate)
    const last = acc[acc.length - 1]
    if (last && last.date === date) last.items.push(o)
    else acc.push({ date, items: [o] })
    return acc
  }, [])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">주문 내역</CardTitle>
          <RangeFilterControls
            rangeType={rangeType}
            onRangeChange={setRangeType}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            extraFilters={
              <OrderHistoryFilters
                direction={directionFilter}
                orderType={orderTypeFilter}
                status={statusFilter}
                onDirectionChange={setDirectionFilter}
                onOrderTypeChange={setOrderTypeFilter}
                onStatusChange={setStatusFilter}
              />
            }
          />
          <div className="lg:hidden">
            <OrderHistoryFilters
              direction={directionFilter}
              orderType={orderTypeFilter}
              status={statusFilter}
              onDirectionChange={setDirectionFilter}
              onOrderTypeChange={setOrderTypeFilter}
              onStatusChange={setStatusFilter}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <LoadingRow />
        ) : isError && !data ? (
          <p className="text-sm text-destructive text-center py-8 px-6">주문 내역 조회 실패: {error instanceof Error ? error.message : String(error)}</p>
        ) : orders.length === 0 ? (
          <EmptyState variant="text" message="주문 내역이 없습니다." />
        ) : filteredOrders.length === 0 ? (
          <EmptyState variant="text" message="조건에 맞는 주문이 없습니다." />
        ) : (
          <div>
            {/* 모바일: 카드 리스트 */}
            <div className="space-y-2 p-4 lg:hidden">
              {groups.map((g, i) => (
                <div key={`${g.date}-${i}`} className="space-y-1.5">
                  <div className="px-1 pt-2 text-sm uppercase tracking-widest text-muted-foreground">{g.date}</div>
                  {g.items.map((o) => (
                    <div key={o.id} className="rounded-[var(--r-md)] border border-border bg-card px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Badge tone="none" size="sm" className={directionBadgeClass(o.direction)}>
                            {labelOf('orderDirections', o.direction)}
                          </Badge>
                          <Badge tone="neutral" size="sm">
                            {labelOf('orderTypes', o.orderType)}
                          </Badge>
                        </div>
                        <Badge tone="none" size="sm" className={orderStatusBadgeClass(o.status)}>
                          {labelOf('orderStatuses', o.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          주문가 <span className="font-semibold text-foreground">${fmtUsd(toNum(o.price))}</span> · 수량 <span className="font-semibold text-foreground"><OrderQuantity o={o} /></span>
                        </span>
                        <span className="text-muted-foreground">
                          체결가 <span className="font-semibold text-foreground">{o.filledPrice != null ? `$${fmtUsd(toNum(o.filledPrice))}` : '-'}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto lg:block" role="region" aria-label="주문 내역" tabIndex={0}>
              {/* PC 2단(xl)에서는 반 폭에 7열이 들어가도록 셀 여백·머리글 자간을 줄인다 */}
              <table className="w-full text-sm xl:[&_td]:px-1.5 xl:[&_th]:px-1.5 xl:[&_th]:tracking-normal">
                <thead className="bg-muted/50">
                  <tr>
                    <TableHeadCell className="whitespace-nowrap">날짜</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">방향</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">유형</TableHeadCell>
                    <TableHeadCell numeric className="whitespace-nowrap">주문가</TableHeadCell>
                    <TableHeadCell numeric className="whitespace-nowrap">수량</TableHeadCell>
                    <TableHeadCell numeric className="whitespace-nowrap">체결가</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">상태</TableHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {pageOrders.map((o) => (
                    <tr key={o.id} className="border-t hover:bg-muted/30 transition-colors">
                      <TableDataCell className="text-muted-foreground whitespace-nowrap">{fmtDate(o.tradeDate)}</TableDataCell>
                      <TableDataCell className="whitespace-nowrap">
                        <Badge tone="none" size="sm" className={directionBadgeClass(o.direction)}>
                          {labelOf('orderDirections', o.direction)}
                        </Badge>
                      </TableDataCell>
                      <TableDataCell className="whitespace-nowrap">
                        <Badge tone="neutral" size="sm">
                          {labelOf('orderTypes', o.orderType)}
                        </Badge>
                      </TableDataCell>
                      <TableDataCell className="text-right tabular-nums whitespace-nowrap">${fmtUsd(toNum(o.price))}</TableDataCell>
                      <TableDataCell className="text-right tabular-nums whitespace-nowrap">
                        <OrderQuantity o={o} />
                      </TableDataCell>
                      <TableDataCell className="text-right tabular-nums whitespace-nowrap">
                        {o.filledPrice != null ? `$${fmtUsd(toNum(o.filledPrice))}` : <span className="text-muted-foreground">-</span>}
                      </TableDataCell>
                      <TableDataCell className="whitespace-nowrap">
                        <Badge tone="none" size="sm" className={orderStatusBadgeClass(o.status)}>
                          {labelOf('orderStatuses', o.status)}
                        </Badge>
                      </TableDataCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 pb-4">
                <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

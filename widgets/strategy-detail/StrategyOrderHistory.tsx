'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStrategyOrdersQuery, orderStatusBadgeClass, orderTypeBadgeClass, ORDER_STATUS_LABEL } from '@entities/order'
import { DIRECTION_LABEL, directionTextClass } from '@entities/trade'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { Badge } from '@shared/ui/Badge'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { RangeFilterControls } from '@shared/ui/range-filter/RangeFilterControls'
import { fmtUsd } from '@shared/lib/format'
import { toNum } from '@shared/lib/utils'
import { resolveRangeStrict } from '@shared/lib/date-range'
import { useRangeFilterState } from '@shared/lib/hooks/use-range-filter-state'

interface Props {
  strategyId: string
}

export function StrategyOrderHistory({ strategyId }: Props) {
  const { rangeType, customFrom, customTo, pageSize, setRangeType, setCustomFrom, setCustomTo, setPageSize } = useRangeFilterState()
  const [page, setPage] = useState(1)
  // 기간/커스텀 날짜/페이지 크기 변경 시 페이지를 1로 리셋 (기존 로컬 reducer 동작 재현)
  useEffect(() => setPage(1), [rangeType, customFrom, customTo, pageSize])

  const range = resolveRangeStrict(rangeType, customFrom, customTo)
  const { data: orders = [], isLoading, isError, error } = useStrategyOrdersQuery(strategyId, range?.from, range?.to, { enabled: range !== null })

  const size = Number(pageSize)
  const totalPages = Math.ceil(orders.length / size)
  const pageOrders = orders.slice((page - 1) * size, page * size)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <CardTitle className="text-base lg:text-lg">주문 내역</CardTitle>
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
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">불러오는 중…</div>
        ) : isError ? (
          <p className="text-sm text-destructive text-center py-8 px-6">주문 내역 조회 실패: {error instanceof Error ? error.message : String(error)}</p>
        ) : orders.length === 0 ? (
          <EmptyState variant="text" message="주문 내역이 없습니다." />
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">날짜</TableHeadCell>
                    <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">방향</TableHeadCell>
                    <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">유형</TableHeadCell>
                    <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">수량</TableHeadCell>
                    <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">주문가</TableHeadCell>
                    <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">체결가</TableHeadCell>
                    <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">상태</TableHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {pageOrders.map((o) => (
                    <tr key={o.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-center text-muted-foreground text-xs whitespace-nowrap">{o.tradeDate}</td>
                      <td className={`px-4 py-3 text-center font-semibold whitespace-nowrap ${directionTextClass(o.direction)}`}>{DIRECTION_LABEL[o.direction] ?? o.direction}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <Badge tone="none" size="sm" className={orderTypeBadgeClass(o.orderType)}>
                          {o.orderType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {o.filledQuantity != null ? (
                          <span>
                            <span className="font-medium">{o.filledQuantity}</span>
                            {o.filledQuantity !== o.quantity && <span className="text-muted-foreground text-xs">/{o.quantity}</span>}
                          </span>
                        ) : (
                          o.quantity
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs whitespace-nowrap">${fmtUsd(toNum(o.price))}</td>
                      <td className="px-4 py-3 text-center font-mono text-xs whitespace-nowrap">
                        {o.filledPrice != null ? `$${fmtUsd(toNum(o.filledPrice))}` : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <Badge tone="none" size="sm" className={orderStatusBadgeClass(o.status)}>
                          {ORDER_STATUS_LABEL[o.status] ?? o.status}
                        </Badge>
                      </td>
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

'use client'

import { useReducer } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStrategyOrdersQuery, orderStatusBadgeClass, ORDER_STATUS_LABEL } from '@entities/order'
import { DIRECTION_LABEL, directionTextClass } from '@entities/trade'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { Badge } from '@shared/ui/Badge'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { fmtUsd } from '@shared/lib/format'
import { toNum } from '@shared/lib/utils'

type RangeType = 'all' | '7d' | '30d' | 'custom'

const RANGE_LABELS: Record<RangeType, string> = {
  all: '전체',
  '7d': '7일',
  '30d': '30일',
  custom: '직접입력',
}

const ORDER_TYPE_STYLE: Record<string, string> = {
  LIMIT: 'bg-muted text-muted-foreground',
  LOC: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
  MOC: 'bg-warn-bg text-warn',
}

function resolveRange(rangeType: RangeType, customFrom: string, customTo: string): { from?: string; to?: string } | null {
  const today = new Date().toISOString().split('T')[0]
  if (rangeType === 'all') return {}
  if (rangeType === '7d') {
    const from = new Date()
    from.setDate(from.getDate() - 7)
    return { from: from.toISOString().split('T')[0], to: today }
  }
  if (rangeType === '30d') {
    const from = new Date()
    from.setDate(from.getDate() - 30)
    return { from: from.toISOString().split('T')[0], to: today }
  }
  if (!customFrom || !customTo) return null
  return { from: customFrom, to: customTo }
}

type FilterState = { rangeType: RangeType; customFrom: string; customTo: string; pageSize: string; page: number }
type FilterAction =
  | { type: 'range'; rangeType: RangeType }
  | { type: 'custom'; from: string; to: string }
  | { type: 'pageSize'; size: string }
  | { type: 'page'; page: number }

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'range': return { ...state, rangeType: action.rangeType, page: 1 }
    case 'custom': return { ...state, rangeType: 'custom', customFrom: action.from, customTo: action.to, page: 1 }
    case 'pageSize': return { ...state, pageSize: action.size, page: 1 }
    case 'page': return { ...state, page: action.page }
  }
}

interface Props {
  strategyId: string
}

export function StrategyOrderHistory({ strategyId }: Props) {
  const [{ rangeType, customFrom, customTo, pageSize, page }, dispatch] = useReducer(filterReducer, {
    rangeType: '7d',
    customFrom: '',
    customTo: '',
    pageSize: '10',
    page: 1,
  })

  const range = resolveRange(rangeType, customFrom, customTo)
  const { data: orders = [], isLoading, isError, error } = useStrategyOrdersQuery(strategyId, range?.from, range?.to, { enabled: range !== null })

  const size = Number(pageSize)
  const totalPages = Math.ceil(orders.length / size)
  const pageOrders = orders.slice((page - 1) * size, page * size)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <CardTitle className="text-base lg:text-lg">주문 내역</CardTitle>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-0.5 rounded-lg bg-muted p-1">
              {(['7d', '30d', 'all', 'custom'] as RangeType[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => dispatch({ type: 'range', rangeType: r })}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all whitespace-nowrap ${
                    rangeType === r ? 'bg-background text-rose-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
            <PageSizeSelector value={pageSize} onChange={(s) => dispatch({ type: 'pageSize', size: s })} />
          </div>
          {rangeType === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                aria-label="시작 날짜"
                value={customFrom}
                onChange={(e) => dispatch({ type: 'custom', from: e.target.value, to: customTo })}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">~</span>
              <input
                type="date"
                aria-label="종료 날짜"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => dispatch({ type: 'custom', from: customFrom, to: e.target.value })}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
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
                        <Badge tone="none" size="sm" className={ORDER_TYPE_STYLE[o.orderType] ?? 'bg-muted text-muted-foreground'}>
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
                <PaginationBar page={page} totalPages={totalPages} onPageChange={(p) => dispatch({ type: 'page', page: p })} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

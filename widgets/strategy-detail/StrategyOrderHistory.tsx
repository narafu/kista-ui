'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStrategyOrdersQuery } from '@entities/order'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { fmtUsd } from '@shared/lib/format'
import { toNum } from '@shared/lib/utils'

type RangeType = 'all' | '7d' | '30d' | 'custom'

const RANGE_LABELS: Record<RangeType, string> = {
  all: '전체',
  '7d': '7일',
  '30d': '30일',
  custom: '직접입력',
}

const DIRECTION_LABEL: Record<string, string> = { BUY: '매수', SELL: '매도' }

const ORDER_TYPE_STYLE: Record<string, string> = {
  LIMIT: 'bg-muted text-muted-foreground',
  LOC: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
  MOC: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
}

const STATUS_STYLE: Record<string, string> = {
  PLACED: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  FILLED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  PARTIALLY_FILLED: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  CANCELLED: 'bg-muted text-muted-foreground',
  PLANNED: 'bg-muted text-muted-foreground',
}

const STATUS_LABEL: Record<string, string> = {
  PLACED: '접수',
  FILLED: '체결',
  PARTIALLY_FILLED: '부분체결',
  FAILED: '실패',
  CANCELLED: '취소',
  PLANNED: '예정',
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

interface Props {
  strategyId: string
}

export function StrategyOrderHistory({ strategyId }: Props) {
  const [rangeType, setRangeType] = useState<RangeType>('7d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [pageSize, setPageSize] = useState('10')
  const [page, setPage] = useState(1)

  const range = resolveRange(rangeType, customFrom, customTo)
  const { data: orders = [], isLoading, isError, error } = useStrategyOrdersQuery(strategyId, range?.from, range?.to, { enabled: range !== null })

  const size = Number(pageSize)
  const totalPages = Math.ceil(orders.length / size)
  const pageOrders = orders.slice((page - 1) * size, page * size)

  function changeRange(r: RangeType) {
    setRangeType(r)
    setPage(1)
  }

  function changePageSize(s: string) {
    setPageSize(s)
    setPage(1)
  }

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
                  onClick={() => changeRange(r)}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all whitespace-nowrap ${
                    rangeType === r ? 'bg-background text-rose-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
            <PageSizeSelector value={pageSize} onChange={changePageSize} />
          </div>
          {rangeType === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                aria-label="시작 날짜"
                value={customFrom}
                onChange={(e) => { setCustomFrom(e.target.value); setPage(1) }}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">~</span>
              <input
                type="date"
                aria-label="종료 날짜"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => { setCustomTo(e.target.value); setPage(1) }}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">로딩 중...</div>
        ) : isError ? (
          <p className="text-sm text-destructive text-center py-8 px-6">주문 내역 조회 실패: {error instanceof Error ? error.message : String(error)}</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-6">주문 내역이 없습니다.</p>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs lg:text-sm uppercase tracking-widest text-[var(--brand-fg-soft)] whitespace-nowrap">날짜</th>
                    <th className="px-4 py-3 text-center text-xs lg:text-sm uppercase tracking-widest text-[var(--brand-fg-soft)] whitespace-nowrap">방향</th>
                    <th className="px-4 py-3 text-center text-xs lg:text-sm uppercase tracking-widest text-[var(--brand-fg-soft)] whitespace-nowrap">유형</th>
                    <th className="px-4 py-3 text-center text-xs lg:text-sm uppercase tracking-widest text-[var(--brand-fg-soft)] whitespace-nowrap">수량</th>
                    <th className="px-4 py-3 text-center text-xs lg:text-sm uppercase tracking-widest text-[var(--brand-fg-soft)] whitespace-nowrap">주문가</th>
                    <th className="px-4 py-3 text-center text-xs lg:text-sm uppercase tracking-widest text-[var(--brand-fg-soft)] whitespace-nowrap">체결가</th>
                    <th className="px-4 py-3 text-center text-xs lg:text-sm uppercase tracking-widest text-[var(--brand-fg-soft)] whitespace-nowrap">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {pageOrders.map((o) => (
                    <tr key={o.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-center text-muted-foreground text-xs whitespace-nowrap">{o.tradeDate}</td>
                      <td className={`px-4 py-3 text-center font-semibold whitespace-nowrap ${o.direction === 'BUY' ? 'text-pos' : 'text-neg'}`}>{DIRECTION_LABEL[o.direction] ?? o.direction}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ORDER_TYPE_STYLE[o.orderType] ?? 'bg-muted text-muted-foreground'}`}>
                          {o.orderType}
                        </span>
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
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[o.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {STATUS_LABEL[o.status] ?? o.status}
                        </span>
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

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStrategyOrdersQuery } from '@entities/order'
import { fmtUsd } from '@shared/lib/format'
import { toNum } from '@shared/lib/utils'

type RangePreset = '7d' | '30d' | 'all'

const RANGE_OPTIONS: { label: string; value: RangePreset }[] = [
  { label: '7일', value: '7d' },
  { label: '30일', value: '30d' },
  { label: '전체', value: 'all' },
]

const DIRECTION_LABEL: Record<string, string> = { BUY: '매수', SELL: '매도' }

const STATUS_STYLE: Record<string, string> = {
  PLACED:           'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  FILLED:           'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  PARTIALLY_FILLED: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  FAILED:           'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  CANCELLED:        'bg-muted text-muted-foreground',
  PLANNED:          'bg-muted text-muted-foreground',
}

const STATUS_LABEL: Record<string, string> = {
  PLACED:           '접수',
  FILLED:           '체결',
  PARTIALLY_FILLED: '부분체결',
  FAILED:           '실패',
  CANCELLED:        '취소',
  PLANNED:          '예정',
}

function resolveRange(preset: RangePreset): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  if (preset === '7d') from.setDate(from.getDate() - 7)
  else if (preset === '30d') from.setDate(from.getDate() - 30)
  else from.setFullYear(2020, 0, 1)
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}

interface Props {
  strategyId: string
}

export function StrategyOrderHistory({ strategyId }: Props) {
  const [range, setRange] = useState<RangePreset>('30d')
  const { from, to } = resolveRange(range)

  const { data: orders = [], isLoading } = useStrategyOrdersQuery(strategyId, from, to)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base lg:text-lg">주문내역</CardTitle>
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRange(opt.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  range === opt.value
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center px-6 py-4">로딩 중...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center px-6 py-4">주문 내역이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-y border-border">
                <tr>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">날짜</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">방향</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">유형</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">수량</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">주문가</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">체결가</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-center text-muted-foreground text-xs whitespace-nowrap">{o.tradeDate}</td>
                    <td className={`px-4 py-3 text-center font-semibold whitespace-nowrap ${o.direction === 'BUY' ? 'text-pos' : 'text-neg'}`}>
                      {DIRECTION_LABEL[o.direction] ?? o.direction}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground whitespace-nowrap">{o.orderType}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {o.filledQuantity != null ? (
                        <span>
                          <span className="font-medium">{o.filledQuantity}</span>
                          {o.filledQuantity !== o.quantity && (
                            <span className="text-muted-foreground text-xs">/{o.quantity}</span>
                          )}
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
        )}
      </CardContent>
    </Card>
  )
}

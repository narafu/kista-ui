'use client'

import { cn } from '@shared/lib/utils'
import { fmtUsd } from '@shared/lib/format'
import { toNum } from '@shared/lib/utils'
import { Badge } from '@shared/ui/Badge'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'

export interface OrderRowData {
  id?: string
  ticker: string
  direction: string
  quantity: number
  price: string
  status?: string
}

interface Props {
  orders: OrderRowData[]
  onCancelOne?: (id: string) => void
  cancellingId?: string | null
  cancelPending?: boolean
}

const directionBadgeCls = (direction: string) =>
  direction === 'BUY' ? 'bg-pos-bg text-pos' : 'bg-neg-bg text-neg'

const directionLabel = (direction: string) => direction === 'BUY' ? '매수' : '매도'

export function OrderRows({ orders, onCancelOne, cancellingId, cancelPending }: Props) {
  const hasCancel = !!onCancelOne

  return (
    <>
      {/* 모바일 리스트 */}
      <ul className="lg:hidden">
        <li className={cn(
          'grid items-center px-6 py-2 border-b border-border bg-muted/50 text-xs text-muted-foreground text-center',
          hasCancel ? 'grid-cols-5' : 'grid-cols-4',
        )}>
          <span>구분</span>
          <span>종목</span>
          <span>수량</span>
          <span>주문가</span>
          {hasCancel && <span>취소</span>}
        </li>
        {orders.map((o, i) => (
          <li key={o.id ?? `${o.ticker}-${o.direction}-${i}`} className={cn(
            'grid items-center text-sm px-6 py-3 border-b border-border last:border-b-0 text-center',
            hasCancel ? 'grid-cols-5' : 'grid-cols-4',
          )}>
            <div className="flex justify-center">
              <Badge tone="none" size="sm" className={directionBadgeCls(o.direction)}>
                {directionLabel(o.direction)}
              </Badge>
            </div>
            <span className="font-medium">{o.ticker}</span>
            <span className="text-muted-foreground">{o.quantity}</span>
            <span className="font-semibold">${fmtUsd(toNum(o.price))}</span>
            {hasCancel && (
              <div className="flex justify-center">
                {o.id ? (
                  <button
                    type="button"
                    onClick={() => onCancelOne(o.id!)}
                    disabled={cancelPending}
                    className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-rose-600 disabled:opacity-50"
                  >
                    {cancelPending && cancellingId === o.id ? '취소 중...' : '취소'}
                  </button>
                ) : <span />}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* PC 테이블 */}
      <table className="hidden lg:table w-full">
        <thead>
          <tr>
            <TableHeadCell className="px-5 py-2.5 bg-muted/50 border-b border-border">구분</TableHeadCell>
            <TableHeadCell className="px-5 py-2.5 bg-muted/50 border-b border-border">종목</TableHeadCell>
            <TableHeadCell className="px-5 py-2.5 bg-muted/50 border-b border-border">수량</TableHeadCell>
            <TableHeadCell className="px-5 py-2.5 bg-muted/50 border-b border-border">주문가</TableHeadCell>
            {hasCancel && (
              <TableHeadCell className="px-5 py-2.5 bg-muted/50 border-b border-border">취소</TableHeadCell>
            )}
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => (
            <tr key={o.id ?? `${o.ticker}-${o.direction}-${i}`} className="border-b border-border last:border-b-0">
              <TableDataCell className="px-5 py-3">
                <Badge tone="none" size="sm" className={cn('lg:h-[24px] lg:text-sm', directionBadgeCls(o.direction))}>
                  {directionLabel(o.direction)}
                </Badge>
              </TableDataCell>
              <TableDataCell className="px-5 py-3 text-sm lg:text-base font-semibold">{o.ticker}</TableDataCell>
              <TableDataCell className="px-5 py-3 text-sm lg:text-base text-muted-foreground">{o.quantity}</TableDataCell>
              <TableDataCell className="px-5 py-3 text-sm lg:text-base font-semibold">${fmtUsd(toNum(o.price))}</TableDataCell>
              {hasCancel && (
                <TableDataCell className="px-5 py-3">
                  {o.id && (
                    <button
                      type="button"
                      onClick={() => onCancelOne(o.id!)}
                      disabled={cancelPending}
                      className="text-sm lg:text-base px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-rose-600 disabled:opacity-50"
                    >
                      {cancelPending && cancellingId === o.id ? '취소 중...' : '취소'}
                    </button>
                  )}
                </TableDataCell>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

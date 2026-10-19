'use client'

import { cn } from '@shared/lib/utils'
import { fmtQuantity, fmtUsd } from '@shared/lib/format'
import { toNum } from '@shared/lib/utils'
import { DIRECTION_LABEL, directionBadgeClass } from '@entities/trade'
import { Badge } from '@shared/ui/Badge'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { Button } from '@/components/ui/button'

interface OrderRowData {
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
          // eslint-disable-next-line react-doctor/no-array-index-as-key -- id 없는 주문의 fallback 키(재정렬 없는 읽기 전용 목록)
          <li key={o.id ?? `${o.ticker}-${o.direction}-${i}`} className={cn(
            'grid items-center text-sm px-6 py-3 border-b border-border last:border-b-0 text-center',
            hasCancel ? 'grid-cols-5' : 'grid-cols-4',
          )}>
            <div className="flex justify-center">
              <Badge tone="none" size="sm" className={directionBadgeClass(o.direction)}>
                {DIRECTION_LABEL[o.direction] ?? o.direction}
              </Badge>
            </div>
            <span className="font-medium">{o.ticker}</span>
            <span className="text-muted-foreground">{fmtQuantity(o.quantity)}</span>
            <span className="font-semibold">${fmtUsd(toNum(o.price))}</span>
            {hasCancel && (
              <div className="flex justify-center">
                {o.id ? (
                  <Button variant="destructive" size="xs" onClick={() => onCancelOne(o.id!)} disabled={cancelPending}>
                    {cancelPending && cancellingId === o.id ? '취소 중...' : '취소'}
                  </Button>
                ) : <span />}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* PC 테이블 */}
      <table className="hidden lg:table w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <TableHeadCell>구분</TableHeadCell>
            <TableHeadCell>종목</TableHeadCell>
            <TableHeadCell className="text-right">수량</TableHeadCell>
            <TableHeadCell className="text-right">주문가</TableHeadCell>
            {hasCancel && (
              <TableHeadCell>취소</TableHeadCell>
            )}
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => (
            // eslint-disable-next-line react-doctor/no-array-index-as-key -- id 없는 주문의 fallback 키(재정렬 없는 읽기 전용 목록)
            <tr key={o.id ?? `${o.ticker}-${o.direction}-${i}`} className="border-t hover:bg-muted/30 transition-colors">
              <TableDataCell>
                <Badge tone="none" size="sm" className={cn('lg:h-[24px] lg:text-sm', directionBadgeClass(o.direction))}>
                  {DIRECTION_LABEL[o.direction] ?? o.direction}
                </Badge>
              </TableDataCell>
              <TableDataCell className="font-semibold">{o.ticker}</TableDataCell>
              <TableDataCell className="text-right tabular-nums text-muted-foreground">{fmtQuantity(o.quantity)}</TableDataCell>
              <TableDataCell className="text-right tabular-nums font-semibold">${fmtUsd(toNum(o.price))}</TableDataCell>
              {hasCancel && (
                <TableDataCell>
                  {o.id && (
                    <Button variant="destructive" size="xs" onClick={() => onCancelOne(o.id!)} disabled={cancelPending}>
                      {cancelPending && cancellingId === o.id ? '취소 중...' : '취소'}
                    </Button>
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

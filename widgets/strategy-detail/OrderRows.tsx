'use client'

import { cn } from '@shared/lib/utils'
import { fmtQuantity, fmtUsd } from '@shared/lib/format'
import { toNum } from '@shared/lib/utils'
import { directionBadgeClass } from '@entities/trade'
import { useMeta } from '@entities/meta'
import { Badge } from '@shared/ui/Badge'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { Button } from '@/components/ui/button'

interface OrderRowData {
  id?: string
  ticker: string
  direction: string
  orderType: string
  timing?: string
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

// 기본값인 마감 접수(AT_CLOSE)는 생략 — 같은 LIMIT라도 INFINITE는 개장 선접수, PRIVACY는 마감 접수라 다를 때만 표시
function TimingNote({ timing }: { timing?: string }) {
  const { labelOf } = useMeta()
  if (!timing || timing === 'AT_CLOSE') return null
  return <span className="block break-keep text-xs text-muted-foreground mt-0.5">{labelOf('orderTimings', timing)}</span>
}

export function OrderRows({ orders, onCancelOne, cancellingId, cancelPending }: Props) {
  const { labelOf } = useMeta()
  const hasCancel = !!onCancelOne

  return (
    <>
      {/* 모바일 리스트 */}
      <ul className="lg:hidden">
        <li className={cn(
          'grid items-center px-6 py-2 border-b border-border bg-muted/50 text-xs text-muted-foreground text-center',
          hasCancel ? 'grid-cols-6' : 'grid-cols-5',
        )}>
          <span>구분</span>
          <span>유형</span>
          <span>종목</span>
          <span>수량</span>
          <span>주문가</span>
          {hasCancel && <span>취소</span>}
        </li>
        {orders.map((o, i) => (
          // eslint-disable-next-line react-doctor/no-array-index-as-key -- id 없는 주문의 fallback 키(재정렬 없는 읽기 전용 목록)
          <li key={o.id ?? `${o.ticker}-${o.direction}-${i}`} className={cn(
            'grid items-center text-sm px-6 py-3 border-b border-border last:border-b-0 text-center',
            hasCancel ? 'grid-cols-6' : 'grid-cols-5',
          )}>
            <div className="flex justify-center">
              <Badge tone="none" size="sm" className={directionBadgeClass(o.direction)}>
                {labelOf('orderDirections', o.direction)}
              </Badge>
            </div>
            {/* 모바일은 열 폭이 좁아 "LOC(장마감지정가)" 라벨 대신 코드만 표시 */}
            <span className="text-muted-foreground">
              {o.orderType}
              <TimingNote timing={o.timing} />
            </span>
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
            <TableHeadCell>유형</TableHeadCell>
            <TableHeadCell>종목</TableHeadCell>
            {/* 숫자 열은 폭을 고정해 가운데 헤더와 오른쪽 정렬 값이 벌어지지 않게 한다 — 남는 폭은 유형·종목 열이 가진다 */}
            <TableHeadCell className="w-28">수량</TableHeadCell>
            <TableHeadCell className="w-32">주문가</TableHeadCell>
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
                  {labelOf('orderDirections', o.direction)}
                </Badge>
              </TableDataCell>
              <TableDataCell>
                <Badge tone="neutral" size="sm" className="lg:h-[24px] lg:text-sm">
                  {labelOf('orderTypes', o.orderType)}
                </Badge>
                <TimingNote timing={o.timing} />
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

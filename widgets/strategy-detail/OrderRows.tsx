'use client'

import { cn } from '@shared/lib/utils'
import { fmtQuantity, fmtUsd } from '@shared/lib/format'
import { toNum } from '@shared/lib/utils'
import { directionBadgeClass } from '@entities/trade'
import { useMeta } from '@entities/meta'
import { Badge } from '@shared/ui/Badge'
import { TABLE_HEAD_TEXT_CLASS, TableHeadCell } from '@shared/ui/TableHeadCell'
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

// 접수 시점은 LIMIT에서만 체결 기회가 달라진다(LOC·MOC·MOO는 언제 접수해도 결과가 같다).
// LIMIT는 대개 개장 선접수라 그 외(PRIVACY의 장마감 30분 전 접수 등)만 표시한다
function TimingNote({ orderType, timing }: { orderType: string; timing?: string }) {
  const { labelOf } = useMeta()
  if (orderType !== 'LIMIT' || !timing || timing === 'AT_OPEN') return null
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
          'grid items-center px-6 py-3 border-b border-border bg-muted/50 text-center',
          TABLE_HEAD_TEXT_CLASS,
          hasCancel ? 'grid-cols-6' : 'grid-cols-5',
        )}>
          <span>방향</span>
          <span>유형</span>
          <span>종목</span>
          <span>주문가</span>
          <span>수량</span>
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
              <TimingNote orderType={o.orderType} timing={o.timing} />
            </span>
            <span className="font-medium">{o.ticker}</span>
            <span className="font-semibold">${fmtUsd(toNum(o.price))}</span>
            <span className="text-muted-foreground">{fmtQuantity(o.quantity)}</span>
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
        {/* PC 2단에서 카드 안 스크롤 시 열 이름을 고정한다 — 반투명 행 배경 아래에 카드 배경을 깔아 비침을 막는다 */}
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="bg-muted/50">
            <TableHeadCell>방향</TableHeadCell>
            <TableHeadCell>유형</TableHeadCell>
            <TableHeadCell>종목</TableHeadCell>
            <TableHeadCell numeric>주문가</TableHeadCell>
            <TableHeadCell numeric>수량</TableHeadCell>
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
                <TimingNote orderType={o.orderType} timing={o.timing} />
              </TableDataCell>
              <TableDataCell className="font-semibold">{o.ticker}</TableDataCell>
              <TableDataCell className="text-right tabular-nums whitespace-nowrap font-semibold">${fmtUsd(toNum(o.price))}</TableDataCell>
              <TableDataCell className="text-right tabular-nums whitespace-nowrap text-muted-foreground">{fmtQuantity(o.quantity)}</TableDataCell>
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

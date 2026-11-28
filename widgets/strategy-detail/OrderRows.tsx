'use client'

import { cn } from '@shared/lib/utils'
import { fmtShares, fmtUsd } from '@shared/lib/format'
import { toNum } from '@shared/lib/utils'
import { directionBadgeClass } from '@entities/trade'
import { useMeta } from '@entities/meta'
import { Badge } from '@shared/ui/Badge'
import { evenColumnsClass, TableHeadCell } from '@shared/ui/TableHeadCell'
import { SortableHeadCell } from '@shared/ui/SortableHeadCell'
import { MobileSortControl } from '@shared/ui/MobileSortControl'
import { useTableSort } from '@shared/lib/hooks/use-table-sort'
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

// 접수 시점은 LIMIT·LIMIT_VWAP에서만 체결 기회가 달라진다(LOC·MOC·MOO는 언제 접수해도 결과가 같다).
// 대개 개장 선접수라 그 외(PRIVACY의 장마감 30분 전 LIMIT VWAP 접수 등)만 표시한다
function TimingNote({ orderType, timing }: { orderType: string; timing?: string }) {
  const { labelOf } = useMeta()
  if ((orderType !== 'LIMIT' && orderType !== 'LIMIT_VWAP') || !timing || timing === 'AT_OPEN') return null
  return <span className="block break-keep text-xs text-muted-foreground mt-0.5">{labelOf('orderTimings', timing)}</span>
}

// 시장가(MOC·MOO)는 가격 없이 접수된다 — API가 주는 0이 "$0.00"으로 보이지 않게 "-"로 표시
function fmtOrderPrice(orderType: string, price: string) {
  return orderType === 'MOC' || orderType === 'MOO' ? '-' : `$${fmtUsd(toNum(price))}`
}

type SortKey = 'default' | 'direction' | 'orderType' | 'ticker' | 'price' | 'quantity'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'direction', label: '방향' },
  { key: 'orderType', label: '유형' },
  { key: 'ticker', label: '종목' },
  { key: 'price', label: '주문가' },
  { key: 'quantity', label: '수량' },
]

export function OrderRows({ orders, onCancelOne, cancellingId, cancelPending }: Props) {
  const { labelOf } = useMeta()
  const hasCancel = !!onCancelOne
  // 'default'는 헤더에 없는 키 — 전달받은 순서 유지
  const { sortKey, sortDirection, handleSort } = useTableSort<SortKey>('default')
  const head = { activeKey: sortKey, direction: sortDirection, onSort: handleSort }
  const sorted = sortKey === 'default' ? orders : [...orders].sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1
    if (sortKey === 'direction') return dir * labelOf('orderDirections', a.direction).localeCompare(labelOf('orderDirections', b.direction), 'ko')
    if (sortKey === 'orderType') return dir * labelOf('orderTypes', a.orderType).localeCompare(labelOf('orderTypes', b.orderType), 'ko')
    if (sortKey === 'ticker') return dir * a.ticker.localeCompare(b.ticker, 'ko')
    if (sortKey === 'quantity') return dir * (a.quantity - b.quantity)
    return dir * (toNum(a.price) - toNum(b.price))
  })

  return (
    <>
      <MobileSortControl {...head} options={SORT_OPTIONS} />
      {/* 모바일 카드 리스트 — 주문 내역과 같은 카드 패턴 */}
      <ul className="space-y-2 p-4 lg:hidden">
        {sorted.map((o, i) => (
          // id 없는 주문의 fallback 키(행 상태가 없는 읽기 전용 목록이라 정렬로 인덱스가 바뀌어도 무방)
          <li key={o.id ?? `${o.ticker}-${o.direction}-${i}`} className="rounded-lg border border-border bg-card px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="none" size="sm" className={directionBadgeClass(o.direction)}>
                    {labelOf('orderDirections', o.direction)}
                  </Badge>
                  <Badge tone="neutral" size="sm">
                    {labelOf('orderTypes', o.orderType)}
                  </Badge>
                </div>
                <TimingNote orderType={o.orderType} timing={o.timing} />
              </div>
              <span className="shrink-0 font-semibold">{o.ticker}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                주문가 <span className="whitespace-nowrap tabular-nums font-semibold text-foreground">{fmtOrderPrice(o.orderType, o.price)}</span> · 수량 <span className="whitespace-nowrap tabular-nums font-semibold text-foreground">{fmtShares(o.quantity)}</span>
              </span>
              {hasCancel && o.id && (
                <Button variant="destructive" size="xs" onClick={() => onCancelOne(o.id!)} disabled={cancelPending}>
                  {cancelPending && cancellingId === o.id ? '취소 중…' : '취소'}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* PC 테이블 */}
      <table className={cn('hidden lg:table w-full text-sm xl:[&_td]:px-1.5 xl:[&_th]:px-1.5 xl:[&_th]:tracking-normal', evenColumnsClass(5))}>
        {/* PC 2단에서 카드 안 스크롤 시 열 이름을 고정한다 — 반투명 행 배경 아래에 카드 배경을 깔아 비침을 막는다 */}
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="bg-muted/50">
            <SortableHeadCell sortKey="direction" {...head}>방향</SortableHeadCell>
            <SortableHeadCell sortKey="orderType" {...head}>유형</SortableHeadCell>
            <SortableHeadCell sortKey="ticker" {...head}>종목</SortableHeadCell>
            <SortableHeadCell sortKey="price" numeric {...head}>주문가</SortableHeadCell>
            <SortableHeadCell sortKey="quantity" numeric {...head}>수량</SortableHeadCell>
            {hasCancel && (
              <TableHeadCell className="w-px">취소</TableHeadCell>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((o, i) => (
            // id 없는 주문의 fallback 키(행 상태가 없는 읽기 전용 목록이라 정렬로 인덱스가 바뀌어도 무방)
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
              <TableDataCell className="tabular-nums whitespace-nowrap font-semibold">{fmtOrderPrice(o.orderType, o.price)}</TableDataCell>
              <TableDataCell className="tabular-nums whitespace-nowrap text-muted-foreground">{fmtShares(o.quantity)}</TableDataCell>
              {hasCancel && (
                <TableDataCell>
                  {o.id && (
                    <Button variant="destructive" size="xs" onClick={() => onCancelOne(o.id!)} disabled={cancelPending}>
                      {cancelPending && cancellingId === o.id ? '취소 중…' : '취소'}
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

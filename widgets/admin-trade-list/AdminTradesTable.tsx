import { useMeta } from '@entities/meta'
import { fmtDate, fmtMoney, fmtQuantity } from '@shared/lib/format'
import { isCryptoMarket, toCurrency, type Currency } from '@shared/lib/api-schema'
import { directionBadgeClass } from '@entities/trade'
import { orderStatusBadgeClass } from '@entities/order'
import { EmptyState } from '@shared/ui/EmptyState'
import { Badge } from '@shared/ui/Badge'
import { SortableHeadCell } from '@shared/ui/SortableHeadCell'
import { useTableSort, type SortDirection } from '@shared/lib/hooks/use-table-sort'
import { TableDataCell } from '@shared/ui/TableDataCell'
import type { AdminTrade } from '@entities/admin'

// 통화는 계좌 기준(BTC는 KRW·USDT 시장 공유) — 계좌를 못 찾아 null이면 코인은 단위 없이 숫자만, 주식은 USD
function fmtTradePrice(price: number, currency: Currency | undefined, isCryptoTicker: boolean): string {
  if (currency) return fmtMoney(price, currency)
  return isCryptoTicker ? price.toLocaleString('en-US', { maximumFractionDigits: 8 }) : fmtMoney(price, 'USD')
}

type SortKey = 'default' | 'tradeDate' | 'owner' | 'strategy' | 'ticker' | 'direction' | 'orderType' | 'price' | 'quantity' | 'status'

export interface TradeSort {
  activeKey: SortKey
  direction: SortDirection
  onSort: (key: SortKey) => void
}

// 정렬은 페이지네이션 이전 전량 배열에 적용해야 하므로 상위(Workbench)가 호출한다. 'default'는 헤더에 없는 키 — API 응답 순서 유지
export function useTradeSort(trades: AdminTrade[]): { sorted: AdminTrade[]; sort: TradeSort } {
  const { labelOf } = useMeta()
  const { sortKey, sortDirection, handleSort } = useTableSort<SortKey>('default')
  const dir = sortDirection === 'asc' ? 1 : -1
  const text = (t: AdminTrade): string | null => {
    switch (sortKey) {
      case 'tradeDate': return t.tradeDate
      case 'owner': return t.ownerNickname
      case 'strategy': return t.strategyType ? labelOf('strategyTypes', t.strategyType) : null
      case 'ticker': return t.ticker
      case 'direction': return labelOf('orderDirections', t.direction)
      case 'orderType': return labelOf('orderTypes', t.orderType)
      case 'status': return labelOf('orderStatuses', t.status)
      default: return null
    }
  }
  const sorted = sortKey === 'default' ? trades : [...trades].sort((a, b) => {
    if (sortKey === 'price' || sortKey === 'quantity') return dir * (a[sortKey] - b[sortKey])
    const av = text(a), bv = text(b)
    if (av == null) return bv == null ? 0 : 1 // null은 방향과 무관하게 맨 아래
    if (bv == null) return -1
    return dir * av.localeCompare(bv, 'ko')
  })
  return { sorted, sort: { activeKey: sortKey, direction: sortDirection, onSort: handleSort } }
}

interface Props {
  trades: AdminTrade[]
  sort: TradeSort
}

export function AdminTradesTable({ trades, sort }: Props) {
  const { labelOf, findTicker } = useMeta()

  if (trades.length === 0) {
    return (
      <EmptyState message="거래 내역이 없습니다." />
    )
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-border overflow-x-auto" role="region" aria-label="거래 내역" tabIndex={0}>
      <table className="min-w-[960px] w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <SortableHeadCell sortKey="tradeDate" {...sort} className="whitespace-nowrap">날짜</SortableHeadCell>
            <SortableHeadCell sortKey="owner" {...sort} className="whitespace-nowrap">소유자</SortableHeadCell>
            <SortableHeadCell sortKey="strategy" {...sort} className="whitespace-nowrap">전략</SortableHeadCell>
            <SortableHeadCell sortKey="ticker" {...sort} className="whitespace-nowrap">종목</SortableHeadCell>
            <SortableHeadCell sortKey="direction" {...sort} className="whitespace-nowrap">방향</SortableHeadCell>
            <SortableHeadCell sortKey="orderType" {...sort} className="whitespace-nowrap">유형</SortableHeadCell>
            <SortableHeadCell sortKey="price" numeric {...sort} className="whitespace-nowrap">가격</SortableHeadCell>
            <SortableHeadCell sortKey="quantity" numeric {...sort} className="whitespace-nowrap">수량</SortableHeadCell>
            <SortableHeadCell sortKey="status" {...sort} className="whitespace-nowrap">상태</SortableHeadCell>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {trades.map((trade) => {
            return (
              <tr
                key={trade.id}
                className="hover:bg-muted/30 transition-colors"
              >
                <TableDataCell className="text-muted-foreground whitespace-nowrap">{fmtDate(trade.tradeDate)}</TableDataCell>
                <TableDataCell className="font-medium whitespace-nowrap">{trade.ownerNickname}</TableDataCell>
                <TableDataCell className="text-muted-foreground whitespace-nowrap">{trade.strategyType ? labelOf('strategyTypes', trade.strategyType) : '-'}</TableDataCell>
                <TableDataCell className="whitespace-nowrap">{trade.ticker}</TableDataCell>
                <TableDataCell className="whitespace-nowrap">
                  <Badge tone="none" size="sm" className={directionBadgeClass(trade.direction)}>{labelOf('orderDirections', trade.direction)}</Badge>
                </TableDataCell>
                <TableDataCell className="text-muted-foreground whitespace-nowrap">{labelOf('orderTypes', trade.orderType)}</TableDataCell>
                <TableDataCell className="text-right tabular-nums whitespace-nowrap">{fmtTradePrice(trade.price, toCurrency(trade.currency), isCryptoMarket(findTicker(trade.ticker)?.market))}</TableDataCell>
                <TableDataCell className="text-right tabular-nums whitespace-nowrap">{fmtQuantity(trade.quantity)}</TableDataCell>
                <TableDataCell className="whitespace-nowrap">
                  <Badge tone="none" className={orderStatusBadgeClass(trade.status)}>
                    {labelOf('orderStatuses', trade.status)}
                  </Badge>
                </TableDataCell>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

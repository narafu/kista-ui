import { useMeta } from '@entities/meta'
import { fmtDate, fmtMoney, fmtQuantity } from '@shared/lib/format'
import { isCryptoMarket, toCurrency, type Currency } from '@shared/lib/api-schema'
import { directionBadgeClass } from '@entities/trade'
import { orderStatusBadgeClass } from '@entities/order'
import { EmptyState } from '@shared/ui/EmptyState'
import { Badge } from '@shared/ui/Badge'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import type { AdminTrade } from '@entities/admin'

// 통화는 계좌 기준(BTC는 KRW·USDT 시장 공유) — 계좌를 못 찾아 null이면 코인은 단위 없이 숫자만, 주식은 USD
function fmtTradePrice(price: number, currency: Currency | undefined, isCryptoTicker: boolean): string {
  if (currency) return fmtMoney(price, currency)
  return isCryptoTicker ? price.toLocaleString('en-US', { maximumFractionDigits: 8 }) : fmtMoney(price, 'USD')
}

interface Props {
  trades: AdminTrade[]
}

export function AdminTradesTable({ trades }: Props) {
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
            <TableHeadCell className="whitespace-nowrap">날짜</TableHeadCell>
            <TableHeadCell className="whitespace-nowrap">소유자</TableHeadCell>
            <TableHeadCell className="whitespace-nowrap">전략</TableHeadCell>
            <TableHeadCell className="whitespace-nowrap">종목</TableHeadCell>
            <TableHeadCell className="whitespace-nowrap">방향</TableHeadCell>
            <TableHeadCell className="whitespace-nowrap">유형</TableHeadCell>
            <TableHeadCell numeric className="whitespace-nowrap">가격</TableHeadCell>
            <TableHeadCell numeric className="whitespace-nowrap">수량</TableHeadCell>
            <TableHeadCell className="whitespace-nowrap">상태</TableHeadCell>
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

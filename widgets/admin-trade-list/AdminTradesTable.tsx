import { fmtUsd } from '@shared/lib/format'
import { DIRECTION_LABEL, directionTextClass } from '@entities/trade'
import { orderStatusBadgeClass } from '@entities/order'
import { EmptyState } from '@shared/ui/EmptyState'
import { Badge } from '@shared/ui/Badge'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import type { AdminTrade } from '@entities/user'

interface Props {
  trades: AdminTrade[]
}

export function AdminTradesTable({ trades }: Props) {
  if (trades.length === 0) {
    return (
      <EmptyState message="거래 내역이 없습니다." />
    )
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-border overflow-x-auto">
      <table className="min-w-[960px] w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">날짜</TableHeadCell>
            <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">소유자</TableHeadCell>
            <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">전략</TableHeadCell>
            <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">종목</TableHeadCell>
            <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">방향</TableHeadCell>
            <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">유형</TableHeadCell>
            <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">수량</TableHeadCell>
            <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">가격</TableHeadCell>
            <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">상태</TableHeadCell>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {trades.map((trade) => {
            return (
              <tr
                key={trade.id}
                className="hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-3 text-center text-muted-foreground text-xs whitespace-nowrap">{trade.tradeDate}</td>
                <td className="px-4 py-3 text-center font-medium whitespace-nowrap">{trade.ownerNickname}</td>
                <td className="px-4 py-3 text-center text-xs text-muted-foreground whitespace-nowrap">{trade.strategyType ?? '-'}</td>
                <td className="px-4 py-3 text-center whitespace-nowrap">{trade.ticker}</td>
                <td className={`px-4 py-3 text-center font-semibold whitespace-nowrap ${directionTextClass(trade.direction)}`}>
                  {DIRECTION_LABEL[trade.direction] ?? trade.direction}
                </td>
                <td className="px-4 py-3 text-center text-xs text-muted-foreground whitespace-nowrap">{trade.orderType}</td>
                <td className="px-4 py-3 text-center whitespace-nowrap">{trade.quantity}</td>
                <td className="px-4 py-3 text-center font-mono text-xs whitespace-nowrap">${fmtUsd(trade.price)}</td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <Badge tone="none" className={orderStatusBadgeClass(trade.status)}>
                    {trade.status}
                  </Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

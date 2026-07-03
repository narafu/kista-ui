import { fmtUsd } from '@shared/lib/format'
import { DIRECTION_LABEL, directionTextClass } from '@entities/trade'
import { orderStatusBadgeClass } from '@entities/order'
import type { AdminTrade } from '@entities/user'

interface Props {
  trades: AdminTrade[]
}

export function AdminTradesTable({ trades }: Props) {
  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
        거래 내역이 없습니다
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="min-w-[960px] w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">날짜</th>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">소유자</th>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">전략</th>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">종목</th>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">방향</th>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">유형</th>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">수량</th>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">가격</th>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">상태</th>
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
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${orderStatusBadgeClass(trade.status)}`}>
                    {trade.status}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

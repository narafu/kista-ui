import { fmtUsd } from '@shared/lib/format'
import type { AdminTrade } from '@entities/user'

const DIRECTION_LABEL: Record<string, string> = { BUY: '매수', SELL: '매도' }
const STATUS_STYLE: Record<string, string> = {
  PLACED: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200',
  FILLED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-200',
}

interface Props {
  trades: AdminTrade[]
  selectedTradeIds: string[]
  onToggleTrade: (tradeId: string) => void
}

export function AdminTradesTable({ trades, selectedTradeIds, onToggleTrade }: Props) {
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
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">선택</th>
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
            const isSelected = selectedTradeIds.includes(trade.id)

            return (
              <tr
                key={trade.id}
                className={isSelected ? 'bg-muted/30 transition-colors' : 'hover:bg-muted/20 transition-colors'}
              >
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <input
                    type="checkbox"
                    aria-label={`${trade.ticker} 거래 선택`}
                    checked={isSelected}
                    onChange={() => onToggleTrade(trade.id)}
                    className="size-4 rounded border-border accent-foreground"
                  />
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground text-xs whitespace-nowrap">{trade.tradeDate}</td>
                <td className="px-4 py-3 text-center font-medium whitespace-nowrap">{trade.ownerNickname}</td>
                <td className="px-4 py-3 text-center text-xs text-muted-foreground whitespace-nowrap">{trade.strategyType ?? '-'}</td>
                <td className="px-4 py-3 text-center whitespace-nowrap">{trade.ticker}</td>
                <td className={`px-4 py-3 text-center font-semibold whitespace-nowrap ${trade.direction === 'BUY' ? 'text-pos' : 'text-neg'}`}>
                  {DIRECTION_LABEL[trade.direction] ?? trade.direction}
                </td>
                <td className="px-4 py-3 text-center text-xs text-muted-foreground whitespace-nowrap">{trade.orderType}</td>
                <td className="px-4 py-3 text-center whitespace-nowrap">{trade.quantity}</td>
                <td className="px-4 py-3 text-center font-mono text-xs whitespace-nowrap">${fmtUsd(trade.price)}</td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[trade.status] ?? 'bg-muted text-muted-foreground'}`}>
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

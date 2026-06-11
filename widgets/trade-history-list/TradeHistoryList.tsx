import type { TradeHistory } from '@entities/trade'
import { fmtUsd, fmtDate } from '@shared/lib/format'
import { TradeDirectionBadge } from './TradeDirectionBadge'

interface Props {
  trades: TradeHistory[]
}

export function TradeHistoryList({ trades }: Props) {
  if (trades.length === 0) {
    return <p className="text-[13px] text-muted-foreground py-4">거래 내역이 없습니다.</p>
  }

  return (
    <>
      {/* 모바일: 카드 리스트 */}
      <div className="space-y-2 lg:hidden">
        {trades.map((trade) => (
          <div key={trade.id} className="rounded-xl p-3 shadow-[var(--sh-card)] border border-border" style={{ background: 'var(--card)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TradeDirectionBadge direction={trade.direction} />
                <span className="font-medium text-sm">{trade.ticker}</span>
              </div>
              <span className="text-sm font-semibold">${fmtUsd(trade.price * trade.quantity)}</span>
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>
                {trade.quantity}주 × ${fmtUsd(trade.price)}
              </span>
              <span>{fmtDate(trade.tradeDate)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 데스크탑: 테이블 */}
      <div className="hidden lg:block rounded-[var(--r-lg)] border border-border overflow-hidden shadow-[var(--sh-card)]" style={{ background: 'var(--card)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'var(--muted)' }}>
            <tr>
              {['구분', '종목', '수량', '단가', '금액', '체결일'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-rose-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <TradeDirectionBadge direction={trade.direction} />
                </td>
                <td className="px-4 py-3 font-bold">{trade.ticker}</td>
                <td className="px-4 py-3 tabular-nums">{trade.quantity}주</td>
                <td className="px-4 py-3 tabular-nums">${fmtUsd(trade.price)}</td>
                <td className="px-4 py-3 font-bold tabular-nums">${fmtUsd(trade.price * trade.quantity)}</td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">{fmtDate(trade.tradeDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

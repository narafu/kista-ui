import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminTrades } from '@entities/user'
import type { AdminTrade } from '@entities/user'

const DIRECTION_LABEL: Record<string, string> = { BUY: '매수', SELL: '매도' }
const STATUS_STYLE: Record<string, string> = {
  PLACED:  'bg-blue-100 text-blue-700',
  FILLED:  'bg-emerald-100 text-emerald-700',
  FAILED:  'bg-red-100 text-red-700',
}

export default async function AdminTradesPage() {
  const token = await getAuthToken()
  const trades: AdminTrade[] = token
    ? await listAdminTrades(token).catch(() => [])
    : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">거래 내역</h1>
        <p className="text-sm text-muted-foreground mt-1">최근 30일 전체 거래 ({trades.length}건)</p>
      </div>

      {trades.length === 0 ? (
        <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
          거래 내역이 없습니다
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">날짜</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">소유자</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">종목</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">방향</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">유형</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">수량</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">가격</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trades.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs">{t.tradeDate}</td>
                  <td className="px-4 py-3 font-medium">{t.ownerNickname}</td>
                  <td className="px-4 py-3">{t.ticker}</td>
                  <td className={`px-4 py-3 font-semibold ${t.direction === 'BUY' ? 'text-blue-600' : 'text-red-500'}`}>
                    {DIRECTION_LABEL[t.direction] ?? t.direction}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.orderType}</td>
                  <td className="px-4 py-3 text-right">{t.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">${t.price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[t.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

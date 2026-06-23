import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminTrades } from '@entities/user'
import { fmtUsd } from '@shared/lib/format'
import type { AdminTrade } from '@entities/user'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'

const DIRECTION_LABEL: Record<string, string> = { BUY: '매수', SELL: '매도' }
const STATUS_STYLE: Record<string, string> = {
  PLACED:  'bg-blue-100 text-blue-700',
  FILLED:  'bg-emerald-100 text-emerald-700',
  FAILED:  'bg-red-100 text-red-700',
}

const VALID_SIZES = ['10', '30', '50', '100'] as const

function parseSize(raw: string | undefined): number {
  return VALID_SIZES.includes(raw as (typeof VALID_SIZES)[number]) ? Number(raw) : 10
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

export default async function AdminTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ size?: string; page?: string }>
}) {
  const { size: rawSize, page: rawPage } = await searchParams
  const size = parseSize(rawSize)
  const token = await getAuthToken()
  const all: AdminTrade[] = token ? await listAdminTrades(token).catch(() => []) : []

  const totalPages = Math.max(1, Math.ceil(all.length / size))
  const page = Math.min(parsePage(rawPage), totalPages)
  const trades = all.slice((page - 1) * size, page * size)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">거래 내역</h1>
        <p className="text-sm text-muted-foreground mt-1">최근 30일 전체 거래 (총 {all.length}건)</p>
      </div>

      <div className="flex justify-end mb-4">
        <PageSizeSelector value={String(size)} />
      </div>

      {trades.length === 0 ? (
        <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
          거래 내역이 없습니다
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">날짜</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">소유자</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">종목</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">방향</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">유형</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">수량</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">가격</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trades.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{t.tradeDate}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{t.ownerNickname}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{t.ticker}</td>
                  <td className={`px-4 py-3 font-semibold whitespace-nowrap ${t.direction === 'BUY' ? 'text-pos' : 'text-neg'}`}>
                    {DIRECTION_LABEL[t.direction] ?? t.direction}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{t.orderType}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{t.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">${fmtUsd(t.price)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
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

      <PaginationBar page={page} totalPages={totalPages} />
    </div>
  )
}

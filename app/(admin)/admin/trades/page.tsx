import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminTrades } from '@entities/admin'
import type { AdminTrade } from '@entities/admin'
import { RangeFilterBar } from '@shared/ui/RangeFilterBar'
import { AdminTradesWorkbench } from '@widgets/admin-trade-list'
import { parsePage, parseRangePreset, parseSize, resolveRange } from '@shared/lib/date-range'

export default async function AdminTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; size?: string; page?: string; from?: string; to?: string }>
}) {
  const { range: rawRange, size: rawSize, page: rawPage, from, to } = await searchParams
  const range = parseRangePreset(rawRange, '7d')
  const size = parseSize(rawSize)
  const { from: resolvedFrom, to: resolvedTo } = resolveRange(range, from, to)

  const token = await getAuthToken()
  const all: AdminTrade[] = token ? await listAdminTrades(token, resolvedFrom, resolvedTo).catch(() => []) : []

  const totalPages = Math.max(1, Math.ceil(all.length / size))
  const page = Math.min(parsePage(rawPage), totalPages)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">주문 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 {all.length}건</p>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <RangeFilterBar current={range} from={from} to={to} />
      </div>

      <AdminTradesWorkbench
        initialTrades={all}
        initialPage={page}
        initialSize={size}
      />
    </div>
  )
}

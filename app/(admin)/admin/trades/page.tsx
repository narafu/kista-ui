import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminTrades } from '@entities/user'
import type { AdminTrade } from '@entities/user'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'
import { AdminTradesWorkbench } from '@widgets/admin-trade-list'

const VALID_SIZES = ['10', '30', '50', '100'] as const

function parseRangePreset(raw: string | undefined): RangePreset {
  if (raw === '30d' || raw === 'all' || raw === 'custom') return raw
  return '7d'
}

function parseSize(raw: string | undefined): number {
  return VALID_SIZES.includes(raw as (typeof VALID_SIZES)[number]) ? Number(raw) : 10
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

function resolveFromTo(range: RangePreset, from?: string, to?: string): { from?: string; to?: string } {
  if (range === 'all') return {}
  if (range === 'custom') return { from, to }
  const days = range === '7d' ? 7 : 30
  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  return {
    from: fromDate.toISOString().split('T')[0],
    to: toDate.toISOString().split('T')[0],
  }
}

export default async function AdminTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; size?: string; page?: string; from?: string; to?: string }>
}) {
  const { range: rawRange, size: rawSize, page: rawPage, from, to } = await searchParams
  const range = parseRangePreset(rawRange)
  const size = parseSize(rawSize)
  const { from: resolvedFrom, to: resolvedTo } = resolveFromTo(range, from, to)

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

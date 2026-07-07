import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminPrivacyBases } from '@entities/privacy'
import { AdminPrivacyBaseTable } from '@widgets/admin-privacy-trade-list/AdminPrivacyBaseTable'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'
import type { AdminPrivacyBase } from '@entities/privacy'

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

function filterByRange(bases: AdminPrivacyBase[], range: RangePreset, from?: string, to?: string): AdminPrivacyBase[] {
  if (range === 'all') return bases

  if (range === '7d') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return bases.filter((b) => b.tradeDate >= cutoffStr)
  }
  if (range === '30d') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return bases.filter((b) => b.tradeDate >= cutoffStr)
  }
  if (range === 'custom' && from && to) {
    return bases.filter((b) => b.tradeDate >= from && b.tradeDate <= to)
  }
  return bases
}

export default async function AdminPrivacyTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; size?: string; page?: string; from?: string; to?: string }>
}) {
  const { range: rawRange, size: rawSize, page: rawPage, from, to } = await searchParams
  const range = parseRangePreset(rawRange)
  const size = parseSize(rawSize)
  const page = parsePage(rawPage)
  const sizeStr = String(size)

  const token = await getAuthToken()
  const all: AdminPrivacyBase[] = token
    ? await listAdminPrivacyBases(token).catch(() => [])
    : []

  const filtered = filterByRange(all, range, from, to)
  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const currentPage = Math.min(page, totalPages)
  const bases = filtered.slice((currentPage - 1) * size, currentPage * size)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">P 매매표</h1>
        <p className="text-sm text-muted-foreground mt-1">
          PRIVACY 전략 P 매매표 및 주문 명세 (총 {filtered.length}건)
        </p>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <RangeFilterBar current={range} from={from} to={to} />
        <PageSizeSelector value={sizeStr} />
      </div>

      <AdminPrivacyBaseTable bases={bases} />
      <PaginationBar page={currentPage} totalPages={totalPages} />
    </div>
  )
}

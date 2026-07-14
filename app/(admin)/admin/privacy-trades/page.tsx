import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminPrivacyBases } from '@entities/privacy'
import { AdminPrivacyBaseTable } from '@widgets/admin-privacy-trade-list/AdminPrivacyBaseTable'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { UrlRangeFilterBar } from '@shared/ui/UrlRangeFilterBar'
import type { AdminPrivacyBase } from '@entities/privacy'
import { parsePage, parseRangePreset, parseSize, resolveRange, type RangePreset } from '@shared/lib/date-range'

function filterByRange(bases: AdminPrivacyBase[], range: RangePreset, from?: string, to?: string): AdminPrivacyBase[] {
  const { from: f, to: t } = resolveRange(range, from, to)
  if (!f && !t) return bases
  return bases.filter((b) => (!f || b.releaseDate >= f) && (!t || b.releaseDate <= t))
}

export default async function AdminPrivacyTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; size?: string; page?: string; from?: string; to?: string }>
}) {
  const { range: rawRange, size: rawSize, page: rawPage, from, to } = await searchParams
  const range = parseRangePreset(rawRange, '7d')
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
        <UrlRangeFilterBar current={range} from={from} to={to} />
        <PageSizeSelector value={sizeStr} />
      </div>

      <AdminPrivacyBaseTable bases={bases} />
      <PaginationBar page={currentPage} totalPages={totalPages} />
    </div>
  )
}

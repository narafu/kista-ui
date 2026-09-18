import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminPrivacyBases } from '@entities/privacy'
import { AdminPrivacyBaseTable } from '@widgets/admin-privacy-trade-list/AdminPrivacyBaseTable'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { UrlRangeFilterBar } from '@shared/ui/UrlRangeFilterBar'
import type { AdminPrivacyBase } from '@entities/privacy'
import { parsePage, parseRangePreset, parseSize, resolveRange } from '@shared/lib/date-range'

function filterByRange(bases: AdminPrivacyBase[], from?: string, to?: string): AdminPrivacyBase[] {
  if (!from && !to) return bases
  return bases.filter((b) => (!from || b.releaseDate >= from) && (!to || b.releaseDate <= to))
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

  const { from: windowFrom, to: windowTo } = resolveRange(range, from, to)
  const filtered = filterByRange(all, windowFrom, windowTo)
  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const currentPage = Math.min(page, totalPages)
  const bases = filtered.slice((currentPage - 1) * size, currentPage * size)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">P 매매표</h1>
        <p className="text-sm text-muted-foreground mt-1">PRIVACY 전략 P 매매표 및 주문 명세</p>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <UrlRangeFilterBar current={range} from={from} to={to} />
        <PageSizeSelector value={sizeStr} />
      </div>

      <AdminPrivacyBaseTable
        // 필터·페이지 변경은 router.push(soft navigation)라 컴포넌트가 리마운트되지 않는다 —
        // 로컬 state(bases/totalCount)가 새 서버 props와 동기화되도록 조회 조건을 key로 강제 리마운트한다.
        key={`${range}-${size}-${currentPage}-${from ?? ''}-${to ?? ''}`}
        bases={bases}
        totalCount={filtered.length}
        windowFrom={windowFrom}
        windowTo={windowTo}
        pageSize={size}
        isFirstPage={currentPage === 1}
      />
      <PaginationBar page={currentPage} totalPages={totalPages} />
    </div>
  )
}

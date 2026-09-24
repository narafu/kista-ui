import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { adminPrivacyBasesQueryOptions, filterAdminPrivacyBasesByRange, privacyKeys } from '@entities/privacy'
import { AdminPrivacyBaseTable } from '@widgets/admin-privacy-trade-list/AdminPrivacyBaseTable'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { UrlRangeFilterBar } from '@shared/ui/UrlRangeFilterBar'
import type { AdminPrivacyBase } from '@entities/privacy'
import { parsePage, parseRangePreset, parseSize, resolveRange } from '@shared/lib/date-range'
import { createQueryClient } from '@shared/lib/query'

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
  const queryClient = createQueryClient()
  if (token) await queryClient.prefetchQuery(adminPrivacyBasesQueryOptions(token))
  const all = queryClient.getQueryData<AdminPrivacyBase[]>(privacyKeys.list()) ?? []

  const { from: windowFrom, to: windowTo } = resolveRange(range, from, to)
  const filtered = filterAdminPrivacyBasesByRange(all, windowFrom, windowTo)
  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const currentPage = Math.min(page, totalPages)

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

      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminPrivacyBaseTable windowFrom={windowFrom} windowTo={windowTo} pageSize={size} currentPage={currentPage} />
      </HydrationBoundary>
      <PaginationBar page={currentPage} totalPages={totalPages} />
    </div>
  )
}

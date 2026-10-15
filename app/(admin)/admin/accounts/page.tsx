import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminAccounts } from '@entities/admin'
import type { AdminAccount } from '@entities/admin'
import { AdminAccountsTable } from '@widgets/admin-account-list'
import { SectionError } from '@shared/ui/SectionError'
import { EmptyState } from '@shared/ui/EmptyState'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { UrlRangeFilterBar } from '@shared/ui/UrlRangeFilterBar'
import { PageHeader } from '@widgets/page-header'
import { parsePage, parseRangePreset, parseSize, resolveRange } from '@shared/lib/date-range'
import { AdminAccountsFilterBar } from './AdminAccountsFilterBar'

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string; size?: string; page?: string; from?: string; to?: string
    owner?: string; broker?: string; strategyType?: string
  }>
}) {
  const { range: rawRange, size: rawSize, page: rawPage, from, to, owner, broker, strategyType } = await searchParams
  const range = parseRangePreset(rawRange, 'all')
  const size = parseSize(rawSize)
  const { from: resolvedFrom, to: resolvedTo } = resolveRange(range, from, to)

  const token = await getAuthToken()
  // 조회 실패를 빈 목록으로 삼키면 "등록된 계좌가 없습니다"로 오인된다 — null로 구분해 오류 화면을 보인다
  const loaded: AdminAccount[] | null = token ? await listAdminAccounts(token, resolvedFrom, resolvedTo).catch(() => null) : []
  const all = loaded ?? []
  // 닉네임은 유저 간 중복 가능 — 필터 식별자는 반드시 userId로 구분한다(ownerNickname은 표시용 라벨만).
  const owners = [...new Map(all.map((a) => [a.userId, a.ownerNickname])).entries()]
    .map(([userId, label]) => ({ userId, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ko'))

  const filtered = all.filter((acc) => {
    if (owner && acc.userId !== owner) return false
    if (broker && acc.broker !== broker) return false
    if (strategyType && !acc.strategies.some((s) => s.type === strategyType)) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const page = Math.min(parsePage(rawPage), totalPages)
  const accounts = filtered.slice((page - 1) * size, page * size)

  return (
    <div>
      <PageHeader title="계좌 현황" description={loaded === null ? '전체 사용자 계좌 목록' : `전체 사용자 계좌 목록 (조건에 맞는 ${filtered.length}개 / 전체 ${all.length}개)`} />

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <UrlRangeFilterBar current={range} from={from} to={to} />
        <PageSizeSelector value={String(size)} />
      </div>

      <div className="mb-4">
        <AdminAccountsFilterBar owners={owners} />
      </div>

      {loaded === null ? (
        <SectionError message="계좌 목록을 불러오지 못했습니다." serverRetry />
      ) : all.length === 0 ? (
        <EmptyState message="등록된 계좌가 없습니다." />
      ) : accounts.length === 0 ? (
        <EmptyState message="조건에 맞는 계좌가 없습니다." />
      ) : (
        <AdminAccountsTable accounts={accounts} />
      )}

      {loaded !== null && <PaginationBar page={page} totalPages={totalPages} />}
    </div>
  )
}

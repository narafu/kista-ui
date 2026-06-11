import Link from 'next/link'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminPrivacyBases } from '@entities/privacy'
import { AdminPrivacyBaseTable } from '@widgets/admin-privacy-trade-list/AdminPrivacyBaseTable'
import type { AdminPrivacyBase, PrivacyRange } from '@entities/privacy'

const RANGES: { value: PrivacyRange; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: '30', label: '최근 30일' },
  { value: '90', label: '최근 90일' },
]

function parseRange(raw: string | undefined): PrivacyRange {
  return raw === '30' || raw === '90' ? raw : 'ALL'
}

export default async function AdminPrivacyTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const range = parseRange((await searchParams).range)
  const token = await getAuthToken()
  const bases: AdminPrivacyBase[] = token
    ? await listAdminPrivacyBases(token, range).catch(() => [])
    : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">기준 매매표</h1>
        <p className="text-sm text-muted-foreground mt-1">PRIVACY 전략 기준 매매표 및 주문 명세 ({bases.length}건)</p>
      </div>

      {/* 조회 범위 필터 */}
      <div className="flex gap-2 mb-4">
        {RANGES.map((r) => (
          <Link
            key={r.value}
            href={`/admin/privacy-trades?range=${r.value}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              range === r.value
                ? 'bg-rose-50 text-rose-600'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <AdminPrivacyBaseTable bases={bases} />
    </div>
  )
}

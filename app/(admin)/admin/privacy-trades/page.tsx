import Link from 'next/link'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminPrivacyBases } from '@entities/privacy'
import { AdminPrivacyBaseTable } from '@widgets/admin-privacy-trade-list/AdminPrivacyBaseTable'
import { PageSizeSelector } from '@widgets/admin-privacy-trade-list/PageSizeSelector'
import type { AdminPrivacyBase, PrivacyRange } from '@entities/privacy'

const RANGES: { value: PrivacyRange; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: '30', label: '최근 30일' },
  { value: '90', label: '최근 90일' },
]

const VALID_SIZES = ['10', '30', '50', '100'] as const

function parseRange(raw: string | undefined): PrivacyRange {
  return raw === '30' || raw === '90' ? raw : 'ALL'
}

function parseSize(raw: string | undefined): number {
  return VALID_SIZES.includes(raw as (typeof VALID_SIZES)[number]) ? Number(raw) : 10
}

export default async function AdminPrivacyTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; size?: string }>
}) {
  const { range: rawRange, size: rawSize } = await searchParams
  const range = parseRange(rawRange)
  const size = parseSize(rawSize)
  const sizeStr = String(size)

  const token = await getAuthToken()
  const all: AdminPrivacyBase[] = token
    ? await listAdminPrivacyBases(token, range).catch(() => [])
    : []
  const bases = all.slice(0, size)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">기준 매매표</h1>
        <p className="text-sm text-muted-foreground mt-1">
          PRIVACY 전략 기준 매매표 및 주문 명세 ({bases.length}/{all.length}건)
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        {/* 조회 범위 필터 */}
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Link
              key={r.value}
              href={`/admin/privacy-trades?range=${r.value}&size=${sizeStr}`}
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

        <PageSizeSelector value={sizeStr} />
      </div>

      <AdminPrivacyBaseTable bases={bases} />
    </div>
  )
}

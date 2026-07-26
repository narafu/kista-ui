import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { adminUsersQueryOptions, getAdminStats } from '@entities/admin'
import { AdminPendingList } from '@widgets/admin-user-list'
import { Users, Clock, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { createQueryClient } from '@shared/lib/query'

export default async function AdminOverviewPage() {
  const token = await getAuthToken()
  const stats = token ? await getAdminStats(token).catch(() => null) : null
  const queryClient = createQueryClient()
  if (token) await queryClient.prefetchQuery(adminUsersQueryOptions('PENDING', token))

  return (
    <div className="reveal-stagger">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">개요</h1>
        <p className="text-sm text-muted-foreground mt-1">사용자 현황 및 최근 대기 목록</p>
      </div>

      {/* Hero 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard icon={<Users className="size-5 text-[var(--brand-fg-soft)]" />} label="전체" value={stats?.totalUsers ?? '-'} />
        <StatCard icon={<Clock className="size-5 text-warn" />} label="승인 대기" value={stats?.pendingCount ?? '-'} />
        <StatCard icon={<CheckCircle className="size-5 text-emerald-500" />} label="승인됨" value={stats?.activeCount ?? '-'} />
        <StatCard icon={<XCircle className="size-5 text-slate-400" />} label="거절됨" value={stats?.rejectedCount ?? '-'} />
      </div>

      {/* 최근 대기 사용자 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">
            승인 대기
            {stats?.pendingCount ? (
              <span className="ml-2 text-xs font-semibold bg-warn-bg text-warn px-2 py-0.5 rounded-full">
                {stats.pendingCount}명
              </span>
            ) : null}
          </h2>
          <Link href="/admin/pending" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            전체 보기 →
          </Link>
        </div>

        <HydrationBoundary state={dehydrate(queryClient)}><AdminPendingList max={5} /></HydrationBoundary>
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-xl border border-border p-4 bg-muted/40">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-3xl font-extrabold">{value}</p>
    </div>
  )
}

import { getAuthToken } from '@lib/auth/token'
import { getAdminStats, listAdminUsers } from '@lib/api/admin'
import { ApproveRejectButtons } from '@components/admin/ApproveRejectButtons'
import { Users, Clock, CheckCircle, XCircle } from 'lucide-react'

export default async function AdminOverviewPage() {
  const token = await getAuthToken()
  const [stats, pendingUsers] = await Promise.all([
    token ? getAdminStats(token).catch(() => null) : null,
    token ? listAdminUsers(token, 'PENDING').catch(() => []) : [],
  ])

  const recentPending = pendingUsers.slice(0, 5) // 최대 5명만 표시

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">사용자 현황 및 최근 대기 목록</p>
      </div>

      {/* Hero 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard icon={<Users className="size-5 text-rose-500" />} label="전체" value={stats?.totalUsers ?? '-'} />
        <StatCard icon={<Clock className="size-5 text-amber-500" />} label="승인 대기" value={stats?.pendingCount ?? '-'} />
        <StatCard icon={<CheckCircle className="size-5 text-emerald-500" />} label="승인됨" value={stats?.activeCount ?? '-'} />
        <StatCard icon={<XCircle className="size-5 text-slate-400" />} label="거절됨" value={stats?.rejectedCount ?? '-'} />
      </div>

      {/* 최근 대기 사용자 */}
      <section>
        <h2 className="text-base font-bold mb-4">
          승인 대기
          {stats?.pendingCount ? (
            <span className="ml-2 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {stats.pendingCount}명
            </span>
          ) : null}
        </h2>

        {recentPending.length === 0 ? (
          <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
            대기 중인 사용자가 없습니다
          </div>
        ) : (
          <div className="rounded-xl border border-border divide-y divide-border">
            {recentPending.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{user.nickname}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <ApproveRejectButtons userId={user.id} nickname={user.nickname} />
              </div>
            ))}
          </div>
        )}
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
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-3xl font-extrabold">{value}</p>
    </div>
  )
}

'use client'

import { CheckCircle, Clock, Users, XCircle } from 'lucide-react'
import Link from 'next/link'

import { useAdminStatsQuery } from '@entities/admin'
import { AdminPendingList } from './AdminPendingList'

export function AdminOverviewContent() {
  const { data: stats } = useAdminStatsQuery()

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard icon={<Users className="size-5 text-[var(--brand-fg-soft)]" />} label="전체" value={stats?.totalUsers ?? '-'} />
        <StatCard icon={<Clock className="size-5 text-warn" />} label="승인 대기" value={stats?.pendingCount ?? '-'} />
        <StatCard icon={<CheckCircle className="size-5 text-emerald-500" />} label="승인됨" value={stats?.activeCount ?? '-'} />
        <StatCard icon={<XCircle className="size-5 text-slate-400" />} label="거절됨" value={stats?.rejectedCount ?? '-'} />
      </div>
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">
            승인 대기
            {stats?.pendingCount ? <span className="ml-2 text-xs font-semibold bg-warn-bg text-warn px-2 py-0.5 rounded-full">{stats.pendingCount}명</span> : null}
          </h2>
          <Link href="/admin/pending" className="text-xs text-muted-foreground hover:text-foreground transition-colors">전체 보기 →</Link>
        </div>
        <AdminPendingList max={5} />
      </section>
    </>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
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

'use client'

import { CheckCircle, Clock, Users, XCircle } from 'lucide-react'
import Link from 'next/link'

import { useAdminStatsQuery } from '@entities/admin'
import { ADMIN_USER_STATUS_LABEL } from '@entities/user'
import { Badge } from '@shared/ui/Badge'
import { SectionError } from '@shared/ui/SectionError'
import { AdminPendingList } from './AdminPendingList'

export function AdminOverviewContent() {
  const { data: stats, isError } = useAdminStatsQuery()

  return (
    <>
      {!stats && isError ? (
        <div className="mb-10">
          <SectionError message="사용자 현황을 불러오지 못했습니다." />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={<Users className="size-5 text-[var(--brand-fg-soft)]" />} label="전체" value={stats?.totalUsers ?? '-'} />
          <StatCard icon={<Clock className="size-5 text-warn" />} label={ADMIN_USER_STATUS_LABEL.PENDING} value={stats?.pendingCount ?? '-'} />
          <StatCard icon={<CheckCircle className="size-5 text-status-ok" />} label={ADMIN_USER_STATUS_LABEL.ACTIVE} value={stats?.activeCount ?? '-'} />
          <StatCard icon={<XCircle className="size-5 text-[var(--status-error)]" />} label={ADMIN_USER_STATUS_LABEL.REJECTED} value={stats?.rejectedCount ?? '-'} />
        </div>
      )}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">
            승인 대기
            {stats?.pendingCount ? <Badge tone="warn" size="sm" className="ml-2">{stats.pendingCount}명</Badge> : null}
          </h2>
          <Link href="/admin/pending" className="inline-block py-2 -my-2 text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors">전체 보기 →</Link>
        </div>
        <AdminPendingList max={5} />
      </section>
    </>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-border p-4 bg-muted/40">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-3xl font-extrabold">{value}</p>
    </div>
  )
}

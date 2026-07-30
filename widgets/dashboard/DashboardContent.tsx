'use client'

import { useAccountsQuery } from '@entities/account'
import { DashboardEmpty } from './DashboardEmpty'
import { DashboardOverview } from './DashboardOverview'

interface Props {
  holidays?: string[]
  initialWeekStartDate: string
}

export function DashboardContent({ holidays, initialWeekStartDate }: Props) {
  const query = useAccountsQuery()
  const accounts = query.data

  if (!accounts && query.isPending) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-48 rounded-[var(--r-lg)] border border-border bg-card animate-pulse" />
        ))}
      </div>
    )
  }

  if (!accounts && query.isError) {
    throw query.error
  }

  if (!accounts || accounts.length === 0) {
    return <DashboardEmpty holidays={holidays} initialWeekStartDate={initialWeekStartDate} />
  }

  return (
    <DashboardOverview
      holidays={holidays}
      initialWeekStartDate={initialWeekStartDate}
      accountIds={accounts.map((account) => account.id)}
    />
  )
}

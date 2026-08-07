'use client'

import type { ReactNode } from 'react'
import { useAccountsQuery } from '@entities/account'
import { DashboardEmpty } from './DashboardEmpty'
import { DashboardOverview } from './DashboardOverview'

interface Props {
  marketPanels: ReactNode
  isAuthenticated: boolean
}

export function DashboardContent({ marketPanels, isAuthenticated }: Props) {
  const query = useAccountsQuery({ enabled: isAuthenticated })
  const accounts = query.data

  if (!isAuthenticated) {
    return <DashboardEmpty marketPanels={marketPanels} />
  }

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
    return <DashboardEmpty marketPanels={marketPanels} />
  }

  return <DashboardOverview marketPanels={marketPanels} />
}

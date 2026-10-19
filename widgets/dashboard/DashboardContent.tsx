'use client'

import type { ReactNode } from 'react'
import { useAccountsQuery } from '@entities/account'
import { DashboardEmpty } from './DashboardEmpty'
import { DashboardOverview } from './DashboardOverview'
import { DashboardSkeleton } from './DashboardSkeleton'

interface Props {
  marketPanels: ReactNode
  bottomPanels?: ReactNode
  isAuthenticated: boolean
}

export function DashboardContent({ marketPanels, bottomPanels, isAuthenticated }: Props) {
  const query = useAccountsQuery({ enabled: isAuthenticated })
  const accounts = query.data

  if (!isAuthenticated) {
    return <DashboardEmpty marketPanels={marketPanels} bottomPanels={bottomPanels} />
  }

  if (!accounts && query.isPending) {
    return <DashboardSkeleton />
  }

  // 계좌 조회 실패는 계좌와 무관한 공개 시장 패널까지 가리지 않는다. Empty로 떨어지면 기존 사용자에게
  // "첫 계좌 등록"을 권하게 되므로 Overview에 안내만 얹는다
  if (!accounts && query.isError) {
    return (
      <DashboardOverview
        marketPanels={marketPanels}
        bottomPanels={bottomPanels}
        notice={<p className="mb-4 text-sm text-warn">계좌 정보를 불러오지 못했습니다.</p>}
      />
    )
  }

  if (!accounts || accounts.length === 0) {
    return <DashboardEmpty marketPanels={marketPanels} bottomPanels={bottomPanels} />
  }

  return <DashboardOverview marketPanels={marketPanels} bottomPanels={bottomPanels} />
}

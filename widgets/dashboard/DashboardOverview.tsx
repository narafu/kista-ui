import type { ReactNode } from 'react'
import { PageHeader } from '@widgets/page-header'
import { NewAccountButton } from '@features/account/create-account'
import { DashboardMarkets } from '@widgets/dashboard/DashboardMarkets'

interface Props {
  marketPanels: ReactNode
  bottomPanels?: ReactNode
  notice?: ReactNode
}

export function DashboardOverview({ marketPanels, bottomPanels, notice }: Props) {
  return (
    <div className="reveal-stagger">
      <div className="hidden lg:block">
        <PageHeader
          eyebrow="대시보드"
          title="개요"
          actions={
            <NewAccountButton>계좌 등록</NewAccountButton>
          }
        />
      </div>
      <h1 className="sr-only lg:hidden">개요</h1>
      {notice}
      <DashboardMarkets marketPanels={marketPanels} bottomPanels={bottomPanels} />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { NextOrderPreviewCard } from '@components/common/NextOrderPreviewCard'
import { StrategyList } from '@components/strategies/StrategyList'
import { useMeta } from '@components/providers/MetaProvider'
import { AccountSummaryCard } from './AccountSummaryCard'
import { TradesTab } from './TradesTab'
import { StrategyTradesTab } from './StrategyTradesTab'
import type { Account } from '@entities/account'
import type { PortfolioSnapshot } from '@entities/trade'
import type { Strategy } from '@entities/strategy'

type Tab = 'summary' | 'strategy' | 'preview'

interface Props {
  account: Account
  portfolio: PortfolioSnapshot | null
  strategies: Strategy[]
  usdDeposit: number
}

export function AccountDetailTabs({ account, portfolio, strategies, usdDeposit }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('summary')
  const { findStrategyType } = useMeta()
  const activeStrategy = strategies.find((s) => s.status === 'ACTIVE') ?? strategies[0]
  const activeTypeMeta = activeStrategy ? findStrategyType(activeStrategy.type) : null
  const isInfiniteActive =
    activeStrategy?.status === 'ACTIVE' && (activeTypeMeta?.availableTickers?.length ?? 0) > 1
  const executeStrategyId = isInfiniteActive ? activeStrategy!.id : undefined

  return (
    <div className="space-y-4">
      {/* 모바일 탭 헤더 */}
      <div className="flex lg:hidden gap-1 border-b overflow-x-auto">
        {(['summary', 'strategy', 'preview'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            {tab === 'summary' ? '계좌' : tab === 'strategy' ? '전략' : '다음 주문'}
          </button>
        ))}
      </div>

      {/* 모바일: 탭 콘텐츠 */}
      <div className="lg:hidden">
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <AccountSummaryCard account={account} portfolio={portfolio} usdDeposit={usdDeposit} hasStrategy={strategies.length > 0} />
            <TradesTab accountId={account.id} />
          </div>
        )}
        {activeTab === 'strategy' && (
          <div className="space-y-4">
            <StrategyList accountId={account.id} strategies={strategies} />
            <StrategyTradesTab strategyId={activeStrategy?.id} />
          </div>
        )}
        {activeTab === 'preview' && (
          <NextOrderPreviewCard accountId={account.id} strategyType={activeStrategy?.type} strategyId={executeStrategyId} />
        )}
      </div>

      {/* 데스크탑: 전체 레이아웃 */}
      <div className="hidden lg:block space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <AccountSummaryCard account={account} portfolio={portfolio} usdDeposit={usdDeposit} hasStrategy={strategies.length > 0} />
          <TradesTab accountId={account.id} />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <StrategyList accountId={account.id} strategies={strategies} />
          <StrategyTradesTab strategyId={activeStrategy?.id} />
        </div>
        <NextOrderPreviewCard accountId={account.id} strategyType={activeStrategy?.type} strategyId={executeStrategyId} />
      </div>
    </div>
  )
}

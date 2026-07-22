'use client'

import { useState } from 'react'
import { StrategyList } from '@widgets/strategy-list'
import { useStrategiesQuery } from '@entities/strategy'
import { AccountSummaryCard } from './AccountSummaryCard'
import { TradesTab } from './TradesTab'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPreview } from '@entities/order'

type Tab = 'summary' | 'strategy'

const TAB_LABELS: Record<Tab, string> = {
  summary: '계좌',
  strategy: '전략',
}

interface Props {
  account: Account
  strategies: Strategy[]
  usdDeposit: number
  posEvalUsd: number
  previewsByStrategyId?: Record<string, NextOrderPreview>
}

export function AccountDetailTabs({ account, strategies: initialStrategies, usdDeposit, posEvalUsd, previewsByStrategyId }: Props) {
  const { data: strategies = initialStrategies } = useStrategiesQuery(account.id, initialStrategies)
  const [activeTab, setActiveTab] = useState<Tab>('summary')

  return (
    <div className="space-y-4">
      {/* 모바일 탭 헤더 */}
      <div className="flex lg:hidden gap-1 border-b overflow-x-auto">
        {(['summary', 'strategy'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* 모바일: 탭 콘텐츠 */}
      <div className="lg:hidden">
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <AccountSummaryCard account={account} usdDeposit={usdDeposit} posEvalUsd={posEvalUsd} />
            <TradesTab accountId={account.id} />
          </div>
        )}
        {activeTab === 'strategy' && (
          <StrategyList accountId={account.id} strategies={strategies} previewsByStrategyId={previewsByStrategyId} />
        )}
      </div>

      {/* 데스크탑: 전체 레이아웃 */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
        <div className="space-y-6">
          <AccountSummaryCard account={account} usdDeposit={usdDeposit} posEvalUsd={posEvalUsd} />
          <StrategyList accountId={account.id} strategies={strategies} previewsByStrategyId={previewsByStrategyId} />
        </div>
        <TradesTab accountId={account.id} />
      </div>
    </div>
  )
}

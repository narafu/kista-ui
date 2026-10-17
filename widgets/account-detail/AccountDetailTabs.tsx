'use client'

import { useState } from 'react'
import { StrategyList } from '@widgets/strategy-list'
import { useStrategiesQuery } from '@entities/strategy'
import { AccountSummaryCard } from './AccountSummaryCard'
import { TradesTab } from './TradesTab'
import { CryptoHoldingsCard } from './CryptoHoldingsCard'
import { isCryptoBroker } from '@shared/lib/api-schema'
import type { Account } from '@entities/account'
import type { CryptoPortfolio } from '@entities/trade'

type Tab = 'summary' | 'strategy'

const TAB_LABELS: Record<Tab, string> = {
  summary: '계좌',
  strategy: '전략',
}

interface Props {
  account: Account
  usdDeposit: number
  posEvalUsd: number
  cryptoPortfolio?: CryptoPortfolio
  cryptoPortfolioError?: boolean
}

export function AccountDetailTabs({ account, usdDeposit, posEvalUsd, cryptoPortfolio, cryptoPortfolioError }: Props) {
  const { data: strategies, isError: strategiesError } = useStrategiesQuery(account.id)
  const [activeTab, setActiveTab] = useState<Tab>('summary')
  // 코인 계좌는 사이클 이력(USD 예수금 열) 대신 보유 코인을 보여준다
  const rightPanel = isCryptoBroker(account.broker)
    ? <CryptoHoldingsCard portfolio={cryptoPortfolio} isError={cryptoPortfolioError ?? false} />
    : <TradesTab accountId={account.id} />

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
            <AccountSummaryCard account={account} usdDeposit={usdDeposit} posEvalUsd={posEvalUsd} cryptoPortfolio={cryptoPortfolio} />
            {rightPanel}
          </div>
        )}
        {activeTab === 'strategy' && (
          <StrategyList accountId={account.id} strategies={strategies} isError={strategiesError} />
        )}
      </div>

      {/* 데스크탑: 전체 레이아웃 */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
        <div className="space-y-6">
          <AccountSummaryCard account={account} usdDeposit={usdDeposit} posEvalUsd={posEvalUsd} cryptoPortfolio={cryptoPortfolio} />
          <StrategyList accountId={account.id} strategies={strategies} isError={strategiesError} />
        </div>
        {rightPanel}
      </div>
    </div>
  )
}

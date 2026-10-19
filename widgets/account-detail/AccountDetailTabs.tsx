'use client'

import { useState } from 'react'
import { StrategyList } from '@widgets/strategy-list'
import { useStrategiesQuery } from '@entities/strategy'
import { AccountSummaryCard } from './AccountSummaryCard'
import { TradesTab } from './TradesTab'
import { CryptoHoldingsCard } from './CryptoHoldingsCard'
import { isCryptoBroker } from '@shared/lib/api-schema'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
import type { Account } from '@entities/account'
import type { CryptoPortfolio } from '@entities/trade'

type Tab = 'summary' | 'strategy'

// 통계·가계부 탭바(SectionTabBar)와 같은 세그먼트 형태 — 라우트가 아닌 화면 내 상태 탭이라 SegmentedToggle
const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'summary', label: '계좌' },
  { value: 'strategy', label: '전략' },
]

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
      <SegmentedToggle
        aria-label="계좌 상세 탭"
        options={TAB_OPTIONS}
        value={activeTab}
        onChange={setActiveTab}
        className="grid w-full grid-cols-2 lg:hidden"
        itemClassName="text-sm"
      />

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

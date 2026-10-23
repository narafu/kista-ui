'use client'

import { StrategyList } from '@widgets/strategy-list'
import { useStrategiesQuery } from '@entities/strategy'
import { AccountSummaryCard } from './AccountSummaryCard'
import { TradesTab } from './TradesTab'
import { CryptoHoldingsCard } from './CryptoHoldingsCard'
import { isCryptoBroker } from '@shared/lib/api-schema'
import { SegmentedTabs } from '@shared/ui/SegmentedTabs'
import type { Account } from '@entities/account'
import type { CryptoPortfolio } from '@entities/trade'

interface Props {
  account: Account
  usdDeposit: number
  posEvalUsd: number
  cryptoPortfolio?: CryptoPortfolio
  cryptoPortfolioError?: boolean
}

export function AccountDetailTabs({ account, usdDeposit, posEvalUsd, cryptoPortfolio, cryptoPortfolioError }: Props) {
  const { data: strategies, isError: strategiesError } = useStrategiesQuery(account.id)
  // 코인 계좌는 사이클 이력(USD 예수금 열) 대신 보유 코인을 보여준다
  const rightPanel = isCryptoBroker(account.broker)
    ? <CryptoHoldingsCard portfolio={cryptoPortfolio} isError={cryptoPortfolioError ?? false} />
    : <TradesTab accountId={account.id} />

  return (
    <div className="space-y-4">
      {/* 모바일: 계좌/전략 탭 — 데스크탑은 탭 없이 아래 그리드에 두 패널을 함께 보여준다 */}
      <SegmentedTabs
        aria-label="계좌 상세 탭"
        defaultValue="summary"
        options={[
          {
            value: 'summary',
            label: '계좌',
            content: (
              <div className="space-y-4">
                <AccountSummaryCard account={account} usdDeposit={usdDeposit} posEvalUsd={posEvalUsd} cryptoPortfolio={cryptoPortfolio} />
                {rightPanel}
              </div>
            ),
          },
          {
            value: 'strategy',
            label: '전략',
            content: <StrategyList accountId={account.id} broker={account.broker} strategies={strategies} isError={strategiesError} />,
          },
        ]}
        className="space-y-4 lg:hidden"
        listClassName="grid w-full grid-cols-2"
        itemClassName="text-sm"
      />

      {/* 데스크탑: 전체 레이아웃 */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
        <div className="space-y-6">
          <AccountSummaryCard account={account} usdDeposit={usdDeposit} posEvalUsd={posEvalUsd} cryptoPortfolio={cryptoPortfolio} />
          <StrategyList accountId={account.id} broker={account.broker} strategies={strategies} isError={strategiesError} />
        </div>
        {rightPanel}
      </div>
    </div>
  )
}

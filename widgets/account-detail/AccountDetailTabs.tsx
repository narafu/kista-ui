'use client'

import { StrategyList } from '@widgets/strategy-list'
import { useStrategiesQuery } from '@entities/strategy'
import { AccountSummaryCard } from './AccountSummaryCard'
import { TradesTab } from './TradesTab'
import { SegmentedTabs } from '@shared/ui/SegmentedTabs'
import type { Account, AccountLedgerTotals } from '@entities/account'

interface Props {
  account: Account
  deposit: number
  posEvalUsd: number
  ledgerTotals?: AccountLedgerTotals
  ledgerTotalsError?: boolean
}

export function AccountDetailTabs({ account, deposit, posEvalUsd, ledgerTotals, ledgerTotalsError }: Props) {
  const { data: strategies, isError: strategiesError } = useStrategiesQuery(account.id)
  const rightPanel = <TradesTab accountId={account.id} />

  const summary = (
    <AccountSummaryCard account={account} deposit={deposit} posEvalUsd={posEvalUsd} ledgerTotals={ledgerTotals} ledgerTotalsError={ledgerTotalsError} />
  )

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
                {summary}
                {rightPanel}
              </div>
            ),
          },
          {
            value: 'strategy',
            label: '전략',
            content: <StrategyList accountId={account.id} strategies={strategies} isError={strategiesError} />,
          },
        ]}
        className="space-y-4 lg:hidden"
        listClassName="grid w-full grid-cols-2"
        itemClassName="text-sm"
      />

      {/* 데스크탑: 전체 레이아웃 */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
        <div className="space-y-6">
          {summary}
          <StrategyList accountId={account.id} strategies={strategies} isError={strategiesError} />
        </div>
        {rightPanel}
      </div>
    </div>
  )
}

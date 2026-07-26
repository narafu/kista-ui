import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'
import { AccountDetailTabs } from './AccountDetailTabs'

const strategyListMock = vi.fn()
const useStrategiesQueryMock = vi.fn()

vi.mock('@widgets/strategy-list', () => ({
  StrategyList: (props: unknown) => {
    strategyListMock(props)
    return <div data-testid="strategy-list-stub" />
  },
}))

vi.mock('./TradesTab', () => ({
  TradesTab: ({ accountId }: { accountId: string }) => <div data-testid="trades-tab-stub">{accountId}</div>,
}))

vi.mock('@entities/strategy', () => ({
  useStrategiesQuery: (accountId: string) => useStrategiesQueryMock(accountId),
}))

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    labelOf: (_group: string, value: string) => value,
  }),
}))

const account: Account = {
  id: 'account-1',
  nickname: '메인 계좌',
  accountNoMasked: '123-45****',
  broker: 'KIS',
}

const strategy: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'TSLA',
  cycleSeedType: 'MAX',
  initialUsdDeposit: 1000,
  divisionCount: 20,
  isReverseMode: false,
}

describe('AccountDetailTabs', () => {
  it('shows the summary tab (account summary + trades) by default on mobile', () => {
    useStrategiesQueryMock.mockReturnValue({ data: [strategy] })
    render(
      <AccountDetailTabs account={account} usdDeposit={1000} posEvalUsd={2000} />,
    )

    // 모바일 영역과 데스크탑 영역 모두 항상 렌더링되므로 계좌 요약 카드가 두 번 나타난다
    expect(screen.getAllByText('계좌 요약').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('trades-tab-stub').length).toBeGreaterThan(0)
  })

  it('switches to the strategy tab on mobile and hides the summary content', async () => {
    useStrategiesQueryMock.mockReturnValue({ data: [strategy] })
    const user = userEvent.setup()
    render(
      <AccountDetailTabs account={account} usdDeposit={1000} posEvalUsd={2000} />,
    )

    await user.click(screen.getByRole('button', { name: '전략' }))

    // 모바일 탭이 전략으로 전환되면 모바일 영역에는 계좌 요약이 더 이상 없다 (데스크탑 영역은 항상 렌더링됨)
    expect(screen.getAllByText('계좌 요약')).toHaveLength(1)
  })

  it('passes hydrated strategy-query data to StrategyList', () => {
    useStrategiesQueryMock.mockReturnValue({ data: [strategy] })
    render(
      <AccountDetailTabs account={account} usdDeposit={1000} posEvalUsd={2000} />,
    )

    expect(useStrategiesQueryMock).toHaveBeenCalledWith('account-1')
    expect(strategyListMock).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'account-1', strategies: [strategy] }),
    )
  })
})

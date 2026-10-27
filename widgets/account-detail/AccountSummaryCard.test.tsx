import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Account } from '@entities/account'
import { AccountSummaryCard } from './AccountSummaryCard'

vi.mock('@entities/meta', async () => {
  const { testLabelOf } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({
    labelOf: testLabelOf,
  }) }
})

const account: Account = {
  id: 'account-1',
  nickname: '메인 계좌',
  accountNoMasked: '123-45****',
  accountNo: '123-45678901',
  broker: 'KIS',
}

describe('AccountSummaryCard', () => {
  it('shows the masked account number by default', () => {
    render(<AccountSummaryCard account={account} usdDeposit={1000} posEvalUsd={2000} />)

    expect(screen.getByText('123-45****')).toBeInTheDocument()
    expect(screen.queryByText('123-45678901')).not.toBeInTheDocument()
  })

  it('reveals the real account number and flips the toggle label on click', async () => {
    const user = userEvent.setup()
    render(<AccountSummaryCard account={account} usdDeposit={1000} posEvalUsd={2000} />)

    await user.click(screen.getByRole('button', { name: '보기' }))

    expect(screen.getByText('123-45678901')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '숨기기' })).toBeInTheDocument()
  })

  it('falls back to the masked number when revealed but accountNo is missing', async () => {
    const user = userEvent.setup()
    render(
      <AccountSummaryCard
        account={{ ...account, accountNo: undefined }}
        usdDeposit={1000}
        posEvalUsd={2000}
      />,
    )

    await user.click(screen.getByRole('button', { name: '보기' }))

    expect(screen.getByText('123-45****')).toBeInTheDocument()
  })

  it('hides deposit/eval KPIs for MOCK broker accounts', () => {
    render(
      <AccountSummaryCard
        account={{ ...account, broker: 'MOCK' }}
        usdDeposit={1000}
        posEvalUsd={2000}
      />,
    )

    expect(screen.queryByText('예수금(실계좌기준)')).not.toBeInTheDocument()
    expect(screen.queryByText('평가금(실계좌기준)')).not.toBeInTheDocument()
    expect(screen.getByText('모의계좌')).toBeInTheDocument()
  })

  it('업비트 계좌는 계좌번호 대신 예수금·총자산을 보여준다', () => {
    render(
      <AccountSummaryCard
        account={{ ...account, broker: 'UPBIT', accountNoMasked: null }}
        usdDeposit={0}
        posEvalUsd={0}
        cryptoPortfolio={{ currency: 'KRW', cash: 120000, totalAsset: 1478024, holdings: [] }}
      />,
    )
    expect(screen.queryByText('계좌번호')).not.toBeInTheDocument()
    expect(screen.getByText('거래소')).toBeInTheDocument()
    expect(screen.queryByText('증권사')).not.toBeInTheDocument()
    expect(screen.getByText('예수금')).toBeInTheDocument()
    expect(screen.getByText('120,000원')).toBeInTheDocument()
    expect(screen.getByText('1,478,024원')).toBeInTheDocument()
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/현재가 확인 불가/)).not.toBeInTheDocument()
  })

  it('바이낸스 계좌는 예수금·총자산을 USDT로 보여준다', () => {
    render(
      <AccountSummaryCard
        account={{ ...account, broker: 'BINANCE', accountNoMasked: null }}
        usdDeposit={0}
        posEvalUsd={0}
        cryptoPortfolio={{ currency: 'USDT', cash: 10.5, totalAsset: 75.25, holdings: [] }}
      />,
    )
    expect(screen.getByText('10.50 USDT')).toBeInTheDocument()
    expect(screen.getByText('75.25 USDT')).toBeInTheDocument()
    expect(screen.queryByText(/원$/)).not.toBeInTheDocument()
  })

  it('현재가 확인 불가 종목이 있으면 총자산에서 빠졌다고 알린다', () => {
    render(
      <AccountSummaryCard
        account={{ ...account, broker: 'UPBIT', accountNoMasked: null }}
        usdDeposit={0}
        posEvalUsd={0}
        cryptoPortfolio={{
          currency: 'KRW',
          cash: 120000,
          totalAsset: 120000,
          holdings: [{ ticker: 'ETH', quantity: 0.5, avgBuyPrice: 5000000, currentPrice: null, evalAmount: 0 }],
        }}
      />,
    )
    expect(screen.getByText('일부 종목은 현재가 확인 불가로 총자산에서 빠졌습니다.')).toBeInTheDocument()
  })

  it('키가 만료됐으면 재등록 필요를 보여준다', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-18T00:00:00+09:00'))
    try {
      render(
        <AccountSummaryCard
          account={{ ...account, broker: 'UPBIT', accountNoMasked: null, apiKeyExpiresAt: '2026-10-01T00:00:00+09:00' }}
          usdDeposit={0}
          posEvalUsd={0}
        />,
      )
      expect(screen.getByText('API 키 재등록 필요')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})

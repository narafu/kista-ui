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
    render(<AccountSummaryCard account={account} deposit={1000} posEvalUsd={2000} />)

    expect(screen.getByText('123-45****')).toBeInTheDocument()
    expect(screen.queryByText('123-45678901')).not.toBeInTheDocument()
  })

  it('reveals the real account number and flips the toggle label on click', async () => {
    const user = userEvent.setup()
    render(<AccountSummaryCard account={account} deposit={1000} posEvalUsd={2000} />)

    await user.click(screen.getByRole('button', { name: '보기' }))

    expect(screen.getByText('123-45678901')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '숨기기' })).toBeInTheDocument()
  })

  it('falls back to the masked number when revealed but accountNo is missing', async () => {
    const user = userEvent.setup()
    render(
      <AccountSummaryCard
        account={{ ...account, accountNo: undefined }}
        deposit={1000}
        posEvalUsd={2000}
      />,
    )

    await user.click(screen.getByRole('button', { name: '보기' }))

    expect(screen.getByText('123-45****')).toBeInTheDocument()
  })

  it('MOCK 계좌는 증권사 기준 없이 전략 합산만 보여주고 미배정 예수금은 -이다', () => {
    render(
      <AccountSummaryCard
        account={{ ...account, broker: 'MOCK' }}
        deposit={1000}
        posEvalUsd={2000}
        ledgerTotals={{ currency: 'USD', deposit: 160, evaluation: 50, unassignedCash: null }}
      />,
    )

    expect(screen.getByText('$160.00')).toBeInTheDocument()
    expect(screen.getByText('$50.00')).toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument()
    expect(screen.queryByText('증권사 기준')).not.toBeInTheDocument()
    expect(screen.queryByText('$1,000.00')).not.toBeInTheDocument()
    expect(screen.getByText('모의계좌')).toBeInTheDocument()
  })

  it('주식 계좌는 전략 합산·미배정 예수금을 먼저, 증권사 기준을 보조로 보여준다', () => {
    render(
      <AccountSummaryCard
        account={account}
        deposit={1000}
        posEvalUsd={2000}
        ledgerTotals={{ currency: 'USD', deposit: 160, evaluation: 50, unassignedCash: 7.5 }}
      />,
    )
    expect(screen.getByText('예수금 (전략 합산)')).toBeInTheDocument()
    expect(screen.getByText('$160.00')).toBeInTheDocument()
    expect(screen.getByText('평가금 (전략 합산)')).toBeInTheDocument()
    expect(screen.getByText('$50.00')).toBeInTheDocument()
    expect(screen.getByText('미배정 예수금 (주문 가능 기준)')).toBeInTheDocument()
    expect(screen.getByText('$7.50')).toBeInTheDocument()
    expect(screen.getByText('증권사 기준')).toBeInTheDocument()
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
    expect(screen.getByText('$2,000.00')).toBeInTheDocument()
  })

  it('평가금·미배정 예수금이 null이면 -로 보여준다', () => {
    render(
      <AccountSummaryCard
        account={account}
        deposit={0}
        posEvalUsd={0}
        ledgerTotals={{ currency: 'USD', deposit: 160, evaluation: null, unassignedCash: null }}
      />,
    )
    expect(screen.getAllByText('-')).toHaveLength(2)
  })

  it('전략 합산 조회가 실패하면 -와 함께 불러오지 못했다는 안내를 보여준다', () => {
    render(<AccountSummaryCard account={account} deposit={0} posEvalUsd={0} ledgerTotalsError />)
    expect(screen.getAllByText('-')).toHaveLength(3)
    expect(screen.getByText('전략 합산 금액을 불러오지 못했습니다.')).toBeInTheDocument()
  })

  it('업비트 계좌는 계좌번호 대신 예수금·총자산을 보여준다', () => {
    render(
      <AccountSummaryCard
        account={{ ...account, broker: 'UPBIT', accountNoMasked: null }}
        deposit={0}
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

  it('크립토 계좌도 전략 합산을 거래소 통화로 보여주고 거래소 기준을 보조로 둔다', () => {
    render(
      <AccountSummaryCard
        account={{ ...account, broker: 'UPBIT', accountNoMasked: null }}
        deposit={0}
        posEvalUsd={0}
        ledgerTotals={{ currency: 'KRW', deposit: 50000, evaluation: 70000, unassignedCash: 3000 }}
        cryptoPortfolio={{ currency: 'KRW', cash: 120000, totalAsset: 1478024, holdings: [] }}
      />,
    )
    expect(screen.getByText('50,000원')).toBeInTheDocument()
    expect(screen.getByText('70,000원')).toBeInTheDocument()
    expect(screen.getByText('3,000원')).toBeInTheDocument()
    expect(screen.getByText('거래소 기준')).toBeInTheDocument()
    expect(screen.getByText('120,000원')).toBeInTheDocument()
  })

  it('바이낸스 계좌는 예수금·총자산을 USDT로 보여준다', () => {
    render(
      <AccountSummaryCard
        account={{ ...account, broker: 'BINANCE', accountNoMasked: null }}
        deposit={0}
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
        deposit={0}
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
          deposit={0}
          posEvalUsd={0}
        />,
      )
      expect(screen.getByText('API 키 재등록 필요')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})

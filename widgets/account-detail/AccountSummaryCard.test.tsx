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
  broker: 'TOSS',
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

  it('MOCK 계좌는 증권사 기준 없이 전략 합산만 보여준다', () => {
    render(
      <AccountSummaryCard
        account={{ ...account, broker: 'MOCK' }}
        deposit={1000}
        posEvalUsd={2000}
        ledgerTotals={{ currency: 'USD', deposit: 160, evaluation: 50 }}
      />,
    )

    expect(screen.getByText('$160.00')).toBeInTheDocument()
    expect(screen.getByText('$50.00')).toBeInTheDocument()
    expect(screen.queryByText('증권사 기준')).not.toBeInTheDocument()
    expect(screen.queryByText('$1,000.00')).not.toBeInTheDocument()
    expect(screen.getByText('모의계좌')).toBeInTheDocument()
  })

  it('주식 계좌는 전략 합산을 먼저, 증권사 기준을 보조로 보여준다', () => {
    render(
      <AccountSummaryCard
        account={account}
        deposit={1000}
        posEvalUsd={2000}
        ledgerTotals={{ currency: 'USD', deposit: 160, evaluation: 50 }}
      />,
    )
    expect(screen.getByText('전략 기준')).toBeInTheDocument()
    expect(screen.getAllByText('예수금')).toHaveLength(2)
    expect(screen.getByText('$160.00')).toBeInTheDocument()
    expect(screen.getAllByText('평가금')).toHaveLength(2)
    expect(screen.getByText('$50.00')).toBeInTheDocument()
    expect(screen.getByText('증권사 기준')).toBeInTheDocument()
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
    expect(screen.getByText('$2,000.00')).toBeInTheDocument()
  })

  it('평가금이 null이면 -로 보여준다', () => {
    render(
      <AccountSummaryCard
        account={account}
        deposit={0}
        posEvalUsd={0}
        ledgerTotals={{ currency: 'USD', deposit: 160, evaluation: null }}
      />,
    )
    expect(screen.getAllByText('-')).toHaveLength(1)
  })

  it('전략 합산 조회가 실패하면 -와 함께 불러오지 못했다는 안내를 보여준다', () => {
    render(<AccountSummaryCard account={account} deposit={0} posEvalUsd={0} ledgerTotalsError />)
    expect(screen.getAllByText('-')).toHaveLength(2)
    expect(screen.getByText('전략 기준 금액을 불러오지 못했습니다.')).toBeInTheDocument()
  })

  it('TOSS 계좌도 apiKeyExpiresAt이 있으면 만료 배지를 보여준다', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-18T00:00:00+09:00'))
    try {
      render(<AccountSummaryCard account={{ ...account, apiKeyExpiresAt: '2026-11-01T00:00:00+09:00' }} deposit={0} posEvalUsd={0} />)
      expect(screen.getByText('API 키 만료 임박')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('키가 만료됐으면 재등록 필요를 보여준다', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-18T00:00:00+09:00'))
    try {
      render(
        <AccountSummaryCard
          account={{ ...account, broker: 'MERITZ', accountNoMasked: null, apiKeyExpiresAt: '2026-10-01T00:00:00+09:00' }}
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

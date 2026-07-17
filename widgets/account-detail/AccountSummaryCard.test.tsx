import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Account } from '@entities/account'
import { AccountSummaryCard } from './AccountSummaryCard'

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    labelOf: (_group: string, value: string) => (value === 'KIS' ? '한국투자증권' : value),
  }),
}))

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
})

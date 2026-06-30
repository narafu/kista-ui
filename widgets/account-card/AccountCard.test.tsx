import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'
import { AccountCard } from './AccountCard'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    findBroker: () => ({
      label: '한국투자',
      description: 'KIS',
    }),
  }),
}))

vi.mock('@entities/strategy', () => ({
  useStrategiesQuery: (_accountId: string, initialData: Strategy[] = []) => ({
    data: initialData,
  }),
}))

const baseAccount: Account = {
  id: 'account-1',
  nickname: '메인 계좌',
  accountNoMasked: '123-45',
  broker: 'KIS',
}

const baseStrategy: Strategy = {
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

describe('AccountCard', () => {
  it('shows an active left accent strip and no status dot label when all strategies are active', () => {
    const { container } = render(
      <AccountCard
        account={baseAccount}
        strategies={[baseStrategy]}
      />,
    )

    const accent = container.querySelector('[data-testid="account-status-accent"]')

    expect(accent).toBeInTheDocument()
    expect(accent).toHaveStyle({ background: 'var(--status-ok)' })
    expect(screen.queryByText('ACTIVE')).not.toBeInTheDocument()
  })

  it('uses the warn accent when strategy statuses are mixed', () => {
    const { container } = render(
      <AccountCard
        account={baseAccount}
        strategies={[
          baseStrategy,
          { ...baseStrategy, id: 'strategy-2', status: 'PAUSED' },
        ]}
      />,
    )

    const accent = container.querySelector('[data-testid="account-status-accent"]')

    expect(accent).toHaveStyle({ background: 'var(--warn)' })
    expect(screen.getAllByText('ACTIVE 1개')).toHaveLength(2)
  })
})

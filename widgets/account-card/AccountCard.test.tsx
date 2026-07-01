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
    expect(screen.queryByText('ACTIVE 1개')).not.toBeInTheDocument()
  })

  it('renders compact strategy badges with status-colored border and text', () => {
    const { container } = render(
      <AccountCard
        account={baseAccount}
        strategies={[
          { ...baseStrategy, id: 'strategy-1', type: 'PRIVACY', ticker: 'SOXL', status: 'PAUSED' },
          { ...baseStrategy, id: 'strategy-2', type: 'INFINITE', ticker: 'MAGX', status: 'ACTIVE' },
        ]}
      />,
    )

    expect(screen.getAllByText('P-SOXL')).toHaveLength(2)
    expect(screen.getAllByText('I-MAGX')).toHaveLength(2)
    expect(screen.queryByText('전략 2개')).not.toBeInTheDocument()

    const pausedBadge = container.querySelector('[data-testid="strategy-badge-strategy-1-mobile"]')

    expect(pausedBadge).toHaveAttribute('style', expect.stringContaining('border-color: var(--warn);'))
    expect(pausedBadge).toHaveAttribute('style', expect.stringContaining('color: var(--warn);'))
  })

  it('top-aligns wrapped mobile strategy badges so multiple rows do not collapse toward the center', () => {
    render(
      <AccountCard
        account={baseAccount}
        strategies={[
          { ...baseStrategy, id: 'strategy-1', type: 'PRIVACY', ticker: 'SOXL' },
          { ...baseStrategy, id: 'strategy-2', type: 'INFINITE', ticker: 'MAGX' },
          { ...baseStrategy, id: 'strategy-3', type: 'PRIVACY', ticker: 'TSLL' },
        ]}
      />,
    )

    const mobileMainRow = screen.getAllByText('메인 계좌')[0]?.parentElement
    const strategyBadgeGroup = mobileMainRow?.children[1]

    expect(mobileMainRow).toHaveClass('items-start')
    expect(strategyBadgeGroup).toHaveClass('items-start')
    expect(strategyBadgeGroup).toHaveClass('content-start')
  })

  it('uses fixed-height desktop strategy rows so badges stay vertically centered between dividers', () => {
    render(
      <AccountCard
        account={baseAccount}
        strategies={[
          { ...baseStrategy, id: 'strategy-1', type: 'INFINITE', ticker: 'MAGX', initialUsdDeposit: 2103 },
          { ...baseStrategy, id: 'strategy-2', type: 'PRIVACY', ticker: 'SOXL', initialUsdDeposit: 6989 },
        ]}
      />,
    )

    const desktopBadge = screen.getByTestId('strategy-badge-strategy-1-desktop')
    const desktopRow = desktopBadge.closest('li')
    const desktopAmount = screen.getByText('$2,103')

    expect(desktopRow).toHaveClass('min-h-[50px]')
    expect(desktopRow).toHaveClass('py-0')
    expect(desktopBadge).toHaveClass('leading-none')
    expect(desktopAmount).toHaveClass('leading-none')
  })
})

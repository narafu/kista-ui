import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Strategy } from '@entities/strategy'
import { StrategyCard } from './StrategyCard'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    findStrategyType: () => ({ divisionCounts: [20, 30, 40] }),
    labelOf: (_group: string, value: string) => value,
  }),
}))

vi.mock('@entities/strategy', async () => {
  const actual = await vi.importActual<typeof import('@entities/strategy')>('@entities/strategy')
  return {
    ...actual,
    seedBadgeClass: () => 'seed-badge',
  }
})

const strategy: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'MAGX',
  cycleSeedType: 'MAX',
  initialUsdDeposit: 2103,
  divisionCount: 20,
  isReverseMode: false,
  currentRound: 10.3,
}

describe('StrategyCard mobile row', () => {
  it('keeps the round label on a single line in the mobile row', () => {
    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    const roundBadges = screen.getAllByText('10.3회차')

    expect(roundBadges[0]).toHaveClass('whitespace-nowrap')
    expect(roundBadges[0]).toHaveClass('shrink-0')
  })

  it('places only the seed badge in the mobile top row', () => {
    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    const topRow = screen.getByTestId('strategy-card-mobile-top-row')
    const mainRow = screen.getByTestId('strategy-card-mobile-main-row')

    expect(topRow).toHaveTextContent('INFINITEMAX')
    expect(topRow).not.toHaveTextContent('20분할')
    expect(mainRow).not.toHaveTextContent('MAX')
    expect(mainRow).toHaveTextContent('20분할')
    expect(mainRow).toHaveTextContent('MAGX')
    expect(mainRow).toHaveTextContent('10.3회차')
    expect(screen.queryByRole('img', { name: 'ACTIVE' })).not.toBeInTheDocument()
  })
})

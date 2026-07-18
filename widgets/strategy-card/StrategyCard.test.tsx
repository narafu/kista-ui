import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Strategy } from '@entities/strategy'
import { StrategyCard } from './StrategyCard'

let previewState = {
  data: {
    orders: [] as Array<{ direction: string; price: string; quantity: number }>,
    todayOrders: [] as Array<{ status: 'PLANNED' | 'PLACED' }>,
    otherStrategiesPlannedBuyUsd: '0',
    competition: null as { sufficientBudget: boolean } | null,
  },
  isLoading: false,
}

let marketSessionState = {
  data: { session: 'BLOCKED' as 'DIRECT' | 'BLOCKED' },
}

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('@entities/order', () => ({
  useStrategyOrderPreviewQuery: () => previewState,
}))

vi.mock('@entities/market', () => ({
  useMarketSessionQuery: () => marketSessionState,
}))

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    findStrategyType: (code: string) => {
      if (code === 'INFINITE') return { divisionCounts: [20, 30, 40] }
      return { divisionCounts: [] }
    },
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
  beforeEach(() => {
    previewState = {
      data: {
        orders: [],
        todayOrders: [],
        otherStrategiesPlannedBuyUsd: '0',
        competition: null,
      },
      isLoading: false,
    }
    marketSessionState = {
      data: { session: 'BLOCKED' },
    }
  })

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

  it('shows VR marker without rendering division count', () => {
    render(<StrategyCard
      accountId="account-1"
      strategy={{
        ...strategy,
        type: 'VR',
        ticker: 'TQQQ',
        divisionCount: undefined,
        currentRound: undefined,
        vr: {
          value: 3000,
          bandWidth: 15,
          intervalWeeks: 4,
          recurringAmount: 0,
          poolLimit: 1000,
          gradient: 10,
        },
      }}
    />)

    expect(screen.getAllByText('VR')[0]).toBeInTheDocument()
    expect(screen.getAllByText('V $3,000.00')[0]).toBeInTheDocument()
    expect(screen.queryByText('undefined분할')).not.toBeInTheDocument()
    expect(screen.getByTestId('strategy-card-mobile-top-row')).not.toHaveTextContent('MAX')
  })

  it('hides next cycle row for VR cards', () => {
    render(<StrategyCard
      accountId="account-1"
      strategy={{
        ...strategy,
        type: 'VR',
        ticker: 'TQQQ',
        divisionCount: undefined,
        currentRound: undefined,
        vr: {
          value: 3000,
          bandWidth: 15,
          intervalWeeks: 4,
          recurringAmount: 0,
          poolLimit: 1000,
          gradient: 10,
        },
      }}
    />)

    expect(screen.queryByText('다음 사이클')).not.toBeInTheDocument()
  })

  it('marks top, right, and bottom borders green when an order is planned', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        todayOrders: [{ status: 'PLANNED' }],
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-ok);'))
  })

  it('marks top, right, and bottom borders orange before market open when cash is insufficient', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [{ direction: 'BUY', price: '1200', quantity: 1 }],
        competition: { sufficientBudget: false },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--warn);'))
  })

  it('marks top, right, and bottom borders red after market open when cash is insufficient', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [{ direction: 'BUY', price: '1200', quantity: 1 }],
        competition: { sufficientBudget: false },
      },
    }
    marketSessionState = {
      data: { session: 'DIRECT' },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-error);'))
  })

  it('shows a deficit color instead of green when a sell order is planned but the buy is still short on budget', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        todayOrders: [{ status: 'PLANNED' }],
        orders: [{ direction: 'BUY', price: '1200', quantity: 1 }],
        competition: { sufficientBudget: false },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    const borderAccent = screen.getByTestId('strategy-order-border-accent')
    expect(borderAccent).not.toHaveAttribute('style', expect.stringContaining('border-color: var(--status-ok);'))
    expect(borderAccent).toHaveAttribute('style', expect.stringContaining('border-color: var(--warn);'))
  })
})

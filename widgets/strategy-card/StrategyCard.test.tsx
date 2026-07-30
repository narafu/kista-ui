import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { todayKst } from '@shared/lib/format'
import type { Strategy } from '@entities/strategy'
import type { BuyCompetitionSummary, SellSufficiencySummary } from '@entities/order'
import { StrategyCard } from './StrategyCard'

// todayKst() 기준 며칠 뒤/전 날짜를 yyyy-MM-dd로 계산 (달력일 산술만 필요 — UTC로 취급해도 안전)
function addDaysToKstDate(days: number): string {
  const [y, m, d] = todayKst().split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// 실제 DTO에서 파생 — 목 리터럴에서 필요한 필드만 채우고 나머지는 Partial로 생략
type CompetitionMock = Partial<BuyCompetitionSummary> & Pick<BuyCompetitionSummary, 'sufficientBudget'>
type SellSufficiencyMock = Partial<SellSufficiencySummary> & Pick<SellSufficiencySummary, 'sufficientQuantity'>

let previewState = {
  data: {
    orders: [] as Array<{ direction: string; price: string; quantity: number }>,
    todayOrders: [] as Array<{ status: 'PLANNED' | 'PLACED'; direction: 'BUY' | 'SELL' }>,
    otherStrategiesPlannedBuyUsd: '0',
    competition: null as CompetitionMock | null,
    sellSufficiency: null as SellSufficiencyMock | null,
  },
  isLoading: false,
}

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('@entities/order', async () => {
  const actual = await vi.importActual<typeof import('@entities/order')>('@entities/order')
  return {
    ...actual,
    useStrategyOrderPreviewQuery: () => previewState,
  }
})

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
        sellSufficiency: null,
      },
      isLoading: false,
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
          poolLimitRate: 0.5,
          gradient: 10,
          initialGradient: 10,
          gGraceWeeks: 52,
          gStepWeeks: 26,
          gMax: 20,
          initialPoolLimitRate: 0.5,
          pGraceWeeks: 52,
          pStepWeeks: 26,
          poolLimitFloor: 0.3,
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
          poolLimitRate: 0.5,
          gradient: 10,
          initialGradient: 10,
          gGraceWeeks: 52,
          gStepWeeks: 26,
          gMax: 20,
          initialPoolLimitRate: 0.5,
          pGraceWeeks: 52,
          pStepWeeks: 26,
          poolLimitFloor: 0.3,
        },
      }}
    />)

    expect(screen.queryByText('다음 사이클')).not.toBeInTheDocument()
  })

  it('marks borders green once every planned direction has been placed today', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [{ direction: 'BUY', price: '1200', quantity: 1 }],
        todayOrders: [{ status: 'PLACED', direction: 'BUY' }],
        competition: { sufficientBudget: true },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-ok);'))
  })

  it('marks borders red when the budget is insufficient before any order has been attempted', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [{ direction: 'BUY', price: '1200', quantity: 1 }],
        todayOrders: [],
        competition: { sufficientBudget: false },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-error);'))
  })

  it('marks borders red when sell placed but buy is unplaced and still short on budget', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [
          { direction: 'BUY', price: '1200', quantity: 1 },
          { direction: 'SELL', price: '1300', quantity: 1 },
        ],
        todayOrders: [{ status: 'PLACED', direction: 'SELL' }],
        competition: { sufficientBudget: false },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-error);'))
  })

  it('marks borders yellow when sell placed, buy unplaced, but budget is now sufficient', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [
          { direction: 'BUY', price: '1200', quantity: 1 },
          { direction: 'SELL', price: '1300', quantity: 1 },
        ],
        todayOrders: [{ status: 'PLACED', direction: 'SELL' }],
        competition: { sufficientBudget: true },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    const borderAccent = screen.getByTestId('strategy-order-border-accent')
    expect(borderAccent).not.toHaveAttribute('style', expect.stringContaining('border-color: var(--status-ok);'))
    expect(borderAccent).toHaveAttribute('style', expect.stringContaining('border-color: var(--warn);'))
  })

  it('marks borders red when buy is unplaced and live balance could not be confirmed', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [
          { direction: 'BUY', price: '1200', quantity: 1 },
          { direction: 'SELL', price: '1300', quantity: 1 },
        ],
        todayOrders: [{ status: 'PLACED', direction: 'SELL' }],
        competition: { sufficientBudget: true, liveBalanceUnavailable: true },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-error);'))
  })

  it('marks borders yellow (not blank) when a buy is planned but live balance could not be confirmed before any attempt today', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [{ direction: 'BUY', price: '1200', quantity: 1 }],
        todayOrders: [],
        competition: { sufficientBudget: true, liveBalanceUnavailable: true },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    const borderAccent = screen.getByTestId('strategy-order-border-accent')
    expect(borderAccent).not.toHaveAttribute('style', expect.stringContaining('border-color: var(--status-error);'))
    expect(borderAccent).toHaveAttribute('style', expect.stringContaining('border-color: var(--warn);'))
  })

  it('marks borders red when sell is unplaced due to insufficient sellable quantity even though buy was placed', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [
          { direction: 'BUY', price: '155', quantity: 21 },
          { direction: 'SELL', price: '160', quantity: 9 },
        ],
        todayOrders: [{ status: 'PLACED', direction: 'BUY' }],
        sellSufficiency: { sufficientQuantity: false, sellableQuantity: 6, reservedQuantity: 0, requiredQuantity: 9 },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-error);'))
  })

  it('marks borders yellow (not green) when sell is unplaced even though the sellable quantity looks sufficient', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [
          { direction: 'BUY', price: '155', quantity: 21 },
          { direction: 'SELL', price: '160', quantity: 9 },
        ],
        todayOrders: [{ status: 'PLACED', direction: 'BUY' }],
        sellSufficiency: { sufficientQuantity: true, sellableQuantity: 20, reservedQuantity: 0, requiredQuantity: 9 },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    const borderAccent = screen.getByTestId('strategy-order-border-accent')
    expect(borderAccent).not.toHaveAttribute('style', expect.stringContaining('border-color: var(--status-ok);'))
    expect(borderAccent).toHaveAttribute('style', expect.stringContaining('border-color: var(--warn);'))
  })

  it('marks borders yellow when a sell is planned and sellable quantity could not be confirmed before any attempt today', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [{ direction: 'SELL', price: '160', quantity: 9 }],
        todayOrders: [],
        sellSufficiency: { sufficientQuantity: true, liveQuantityUnavailable: true },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--warn);'))
  })
})

describe('StrategyCard scheduled start badge', () => {
  beforeEach(() => {
    previewState = {
      data: {
        orders: [],
        todayOrders: [],
        otherStrategiesPlannedBuyUsd: '0',
        competition: null,
        sellSufficiency: null,
      },
      isLoading: false,
    }
  })

  it('shows the "시작예정" badge when startDate is in the future', () => {
    const futureDate = addDaysToKstDate(7)
    render(<StrategyCard accountId="account-1" strategy={{ ...strategy, startDate: futureDate }} />)

    expect(screen.getAllByText(/시작예정$/)[0]).toBeInTheDocument()
  })

  it('hides the badge when startDate is today', () => {
    render(<StrategyCard accountId="account-1" strategy={{ ...strategy, startDate: todayKst() }} />)

    expect(screen.queryByText(/시작예정$/)).not.toBeInTheDocument()
  })

  it('hides the badge when startDate is in the past', () => {
    const pastDate = addDaysToKstDate(-7)
    render(<StrategyCard accountId="account-1" strategy={{ ...strategy, startDate: pastDate }} />)

    expect(screen.queryByText(/시작예정$/)).not.toBeInTheDocument()
  })

  it('hides the badge when startDate is absent', () => {
    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    expect(screen.queryByText(/시작예정$/)).not.toBeInTheDocument()
  })
})

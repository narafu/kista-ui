import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fmtDate, todayKst } from '@shared/lib/format'
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

const { previewMock } = vi.hoisted(() => ({ previewMock: vi.fn() }))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}))


vi.mock('@entities/order', async () => {
  const actual = await vi.importActual<typeof import('@entities/order')>('@entities/order')
  return {
    ...actual,
    useStrategyOrderPreviewQuery: (id: string) => { previewMock(id); return previewState },
  }
})

vi.mock('@entities/meta', async () => {
  const { dcaTestMeta } = await import('@features/strategy/create-strategy/sections/__fixtures__/dcaTestMeta')
  const groups: Record<string, Array<{ code: string; label: string }>> = {
    ...dcaTestMeta,
    dcaSkipReasons: [{ code: 'CONDITION_NOT_MET', label: '조건 미충족' }],
    strategyStatuses: [{ code: 'ACTIVE', label: '운영중' }, { code: 'PAUSED', label: '일시중지' }],
  }
  return {
  useMeta: () => ({
    findStrategyType: (code: string) => {
      if (code === 'INFINITE') return { divisionCounts: [20, 30, 40] }
      return { divisionCounts: [] }
    },
    labelOf: (group: string, value: string) => groups[group]?.find(i => i.code === value)?.label ?? value,
    findTicker: () => undefined,
  }),
  }
})

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
    render(<StrategyCard accountId="account-1" broker="KIS" strategy={strategy} />)

    const roundBadges = screen.getAllByText('10.3회차')

    expect(roundBadges[0]).toHaveClass('whitespace-nowrap')
    expect(roundBadges[0]).toHaveClass('shrink-0')
  })

  it('places only the seed badge in the mobile top row', () => {
    render(<StrategyCard accountId="account-1" broker="KIS" strategy={strategy} />)

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
      broker="KIS"
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
      broker="KIS"
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

    render(<StrategyCard accountId="account-1" broker="KIS" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-ok);'))
    // 정상은 배지 없이 스크린리더 텍스트만
    expect(screen.getByText('오늘 주문 접수됨')).toHaveClass('sr-only')
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

    render(<StrategyCard accountId="account-1" broker="KIS" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-error);'))
    // 색만으로 전달하지 않도록 같은 판정을 배지 텍스트로도 보여준다 (모바일·PC 레이아웃 각각)
    expect(screen.getAllByText('예수금 부족')).toHaveLength(2)
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

    render(<StrategyCard accountId="account-1" broker="KIS" strategy={strategy} />)

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

    render(<StrategyCard accountId="account-1" broker="KIS" strategy={strategy} />)

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

    render(<StrategyCard accountId="account-1" broker="KIS" strategy={strategy} />)

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

    render(<StrategyCard accountId="account-1" broker="KIS" strategy={strategy} />)

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

    render(<StrategyCard accountId="account-1" broker="KIS" strategy={strategy} />)

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

    render(<StrategyCard accountId="account-1" broker="KIS" strategy={strategy} />)

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

    render(<StrategyCard accountId="account-1" broker="KIS" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--warn);'))
    expect(screen.getAllByText('잔고 확인 실패')).toHaveLength(2)
  })

  it('labels an unplaced direction as 미접수 주문', () => {
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

    render(<StrategyCard accountId="account-1" broker="KIS" strategy={strategy} />)

    expect(screen.getAllByText('미접수 주문')).toHaveLength(2)
  })

  it('shows the reverse mode badge on mobile as well as PC', () => {
    render(<StrategyCard accountId="account-1" broker="KIS" strategy={{ ...strategy, isReverseMode: true }} />)

    expect(screen.getByTestId('strategy-card-mobile-top-row')).toHaveTextContent('리버스모드')
    expect(screen.getAllByText('리버스모드')).toHaveLength(2)
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
    render(<StrategyCard accountId="account-1" broker="KIS" strategy={{ ...strategy, startDate: futureDate }} />)

    expect(screen.getAllByText(/시작예정$/)[0]).toBeInTheDocument()
  })

  it('hides the badge when startDate is today', () => {
    render(<StrategyCard accountId="account-1" broker="KIS" strategy={{ ...strategy, startDate: todayKst() }} />)

    expect(screen.queryByText(/시작예정$/)).not.toBeInTheDocument()
  })

  it('hides the badge when startDate is in the past', () => {
    const pastDate = addDaysToKstDate(-7)
    render(<StrategyCard accountId="account-1" broker="KIS" strategy={{ ...strategy, startDate: pastDate }} />)

    expect(screen.queryByText(/시작예정$/)).not.toBeInTheDocument()
  })

  it('hides the badge when startDate is absent', () => {
    render(<StrategyCard accountId="account-1" broker="KIS" strategy={strategy} />)

    expect(screen.queryByText(/시작예정$/)).not.toBeInTheDocument()
  })
})

describe('StrategyCard status', () => {
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

  it('does not highlight an active strategy with a strip or status badge', () => {
    render(<StrategyCard accountId="account-1" broker="KIS" strategy={strategy} />)

    expect(screen.queryByTestId('strategy-status-strip')).not.toBeInTheDocument()
    expect(screen.queryByText('운영중')).not.toBeInTheDocument()
  })

  it('hides the order border for a paused strategy even when the preview reports a deficit', () => {
    previewState = {
      data: {
        orders: [{ direction: 'BUY' }],
        todayOrders: [],
        otherStrategiesPlannedBuyUsd: '0',
        competition: { sufficientBudget: false, liveBalanceUnavailable: false, consumedByHigherPriority: '0', requiredForThisStrategy: '100', availableDeposit: '0' },
        sellSufficiency: null,
      },
      isLoading: false,
    } as unknown as typeof previewState
    render(<StrategyCard accountId="account-1" broker="KIS" strategy={{ ...strategy, status: 'PAUSED' }} />)

    expect(screen.queryByTestId('strategy-order-border-accent')).not.toBeInTheDocument()
  })

  it('marks a paused strategy with a muted strip and a localized badge', () => {
    render(<StrategyCard accountId="account-1" broker="KIS" strategy={{ ...strategy, status: 'PAUSED' }} />)

    expect(screen.getByTestId('strategy-status-strip')).toHaveAttribute('style', expect.stringContaining('background: var(--muted-foreground);'))
    expect(screen.getAllByText('일시중지').length).toBeGreaterThan(0)
  })
})

describe('StrategyCard DCA', () => {
  const dcaStrategy = {
    id: 'd1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false,
    dca: {
      rules: [{
        ruleKey: 'a', direction: 'BUY', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOC', executionHour: null,
        sizing: { type: 'AMOUNT', amount: 300, percent: null }, shortfall: 'PARTIAL', conditions: [],
        nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' },
        lastExecution: { kstTradeDate: '2026-09-30', status: 'SKIPPED', skipReason: 'CONDITION_NOT_MET' },
      }],
      currentHoldings: null, avgPrice: null,
    },
  } as unknown as Strategy

  beforeEach(() => previewMock.mockClear())

  it('일시중지된 DCA 카드는 회색 스트립과 상태 배지를 보여준다', () => {
    render(<StrategyCard accountId="a1" broker="KIS" strategy={{ ...dcaStrategy, status: 'PAUSED' }} />)
    expect(screen.getByTestId('strategy-status-strip')).toHaveAttribute('style', expect.stringContaining('background: var(--muted-foreground);'))
    expect(screen.getAllByText('일시중지')).toHaveLength(2) // 모바일·PC 배지 행
  })

  it('DCA 카드는 단건 미리보기를 호출하지 않는다', () => {
    render(<StrategyCard accountId="a1" broker="KIS" strategy={dcaStrategy} />)
    expect(previewMock).not.toHaveBeenCalled()
  })

  it('dca 요약이 없는 DCA 전략도 미리보기 없이 카드 셸을 렌더한다', () => {
    render(<StrategyCard accountId="a1" broker="KIS" strategy={{ ...dcaStrategy, dca: undefined }} />)
    expect(screen.getAllByText('DCA')).toHaveLength(2)
    expect(screen.getAllByText('UPRO')).toHaveLength(2)
    expect(previewMock).not.toHaveBeenCalled()
  })

  it('DCA 카드는 규칙 수·다음 판정일·최근 결과를 보여준다', () => {
    render(<StrategyCard accountId="a1" broker="KIS" strategy={dcaStrategy} />)
    expect(screen.getAllByText('규칙 1개 · 매수 1')).toHaveLength(2)
    expect(screen.getByText('다음 판정일')).toBeInTheDocument()
    expect(screen.getByText(fmtDate('2026-10-31'))).toBeInTheDocument()
    expect(screen.getAllByText('최근 건너뜀 · 조건 미충족')).toHaveLength(2)
  })
})

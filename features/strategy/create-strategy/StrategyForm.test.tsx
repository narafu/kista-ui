import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Strategy } from '@entities/strategy'
import { StrategyForm } from './StrategyForm'

const useStrategyFormMock = vi.fn()

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      strategyTypes: [{ code: 'INFINITE' }],
    },
    findStrategyType: () => ({
      divisionCounts: [20, 30, 40],
    }),
  }),
}))

vi.mock('./model/useStrategyForm', () => ({
  useStrategyForm: (...args: unknown[]) => useStrategyFormMock(...args),
}))

vi.mock('./sections/StrategyTypeSection', () => ({
  StrategyTypeSection: () => <div>type-section</div>,
}))

vi.mock('./sections/StrategyTickerSection', () => ({
  StrategyTickerSection: () => <div>ticker-section</div>,
}))

vi.mock('./sections/UsageRatioSection', () => ({
  UsageRatioSection: () => <div data-testid="usage-ratio-section">usage-ratio-section</div>,
}))

vi.mock('./sections/CycleSeedSection', () => ({
  CycleSeedSection: () => <div>cycle-seed-section</div>,
}))

vi.mock('./sections/DivisionCountSection', () => ({
  DivisionCountSection: () => <div>division-count-section</div>,
}))

const baseFormState = {
  type: 'INFINITE',
  setType: vi.fn(),
  usesDivisionCount: true,
  ticker: 'TSLA',
  availableTickers: ['TSLA'],
  handleTickerChange: vi.fn(),
  basePrice: 100,
  prices: { TSLA: 100 },
  pct: 100,
  setPct: vi.fn(),
  seedUsdInput: 1200,
  setSeedUsdInput: vi.fn(),
  usdDeposit: 5000,
  minSeed: 500,
  isBelowMinSeed: false,
  loadingBase: false,
  seedUnavailableReason: null,
  balanceCheckEnabled: true,
  autoStart: true,
  setAutoStart: vi.fn(),
  seedMode: 'MAX' as const,
  setSeedMode: vi.fn(),
  divisionCount: 20,
  setDivisionCount: vi.fn(),
  loading: false,
  initializing: false,
  cannotSubmit: false,
  handleSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
}

const initialStrategy: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'TSLA',
  cycleSeedType: 'MAX',
  initialUsdDeposit: 1200,
  divisionCount: 20,
  isReverseMode: false,
}

describe('StrategyForm seed section', () => {
  it('shows read-only starting amount instead of the editable seed section in edit mode', () => {
    useStrategyFormMock.mockReturnValue(baseFormState)

    render(<StrategyForm accountId="account-1" initial={initialStrategy} />)

    expect(screen.queryByTestId('usage-ratio-section')).not.toBeInTheDocument()
    expect(screen.getByText('시작금액')).toBeInTheDocument()
    expect(screen.getByText('시드는 전략 등록 후 수정할 수 없습니다')).toBeInTheDocument()
    expect(screen.getByText('$1,200.00')).toBeInTheDocument()
  })

  it('keeps the editable usage ratio section in create mode', () => {
    useStrategyFormMock.mockReturnValue(baseFormState)

    render(<StrategyForm accountId="account-1" />)

    expect(screen.getByTestId('usage-ratio-section')).toBeInTheDocument()
  })
})

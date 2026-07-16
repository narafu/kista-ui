import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Strategy } from '@entities/strategy'
import { StrategyForm } from './StrategyForm'

const useStrategyFormMock = vi.fn()
const usageRatioSectionMock = vi.fn()

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
  UsageRatioSection: (props: unknown) => {
    usageRatioSectionMock(props)
    return <div data-testid="usage-ratio-section">usage-ratio-section</div>
  },
}))

vi.mock('./sections/CycleSeedSection', () => ({
  CycleSeedSection: () => <div>cycle-seed-section</div>,
}))

vi.mock('./sections/DivisionCountSection', () => ({
  DivisionCountSection: () => <div>division-count-section</div>,
}))

vi.mock('./sections/VrSettingsSection', () => ({
  VrSettingsSection: () => <div data-testid="vr-settings-section">vr-settings-section</div>,
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
  canEditSeed: false,
  seedUnavailableReason: null,
  balanceCheckEnabled: true,
  autoStart: true,
  setAutoStart: vi.fn(),
  seedMode: 'MAX' as const,
  setSeedMode: vi.fn(),
  divisionCount: 20,
  setDivisionCount: vi.fn(),
  divisionCountSettings: { customizable: true, allowedValues: [20, 30, 40], defaultValue: 20 },
  tickerCustomizable: true,
  enabledStrategyTypes: ['INFINITE', 'VR'],
  runtimeConfigUnavailable: false,
  runtimeConfigError: false,
  retryRuntimeConfig: vi.fn(),
  isVr: false,
  vrFields: {
    initialValue: null,
    intervalWeeks: 4,
    bandWidth: 15,
    recurringAmount: 0,
  },
  setVrField: vi.fn(),
  recurringMode: 'HOLD' as const,
  setRecurringMode: vi.fn(),
  vrSettings: {
    recurringMode: { customizable: true, allowedValues: ['DEPOSIT', 'HOLD', 'WITHDRAW'], defaultValue: 'HOLD' },
    bandWidth: { customizable: true, allowedValues: [10, 15, 20], defaultValue: 15 },
    intervalWeeks: { customizable: true, allowedValues: [1, 2, 4], defaultValue: 2 },
  },
  loading: false,
  initializing: false,
  cannotSubmit: false,
  submitDisabledReason: null,
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
  currentHoldings: 3,
}

describe('StrategyForm seed section', () => {
  it('shows a retry action when runtime config fails in create mode', () => {
    const retryRuntimeConfig = vi.fn()
    useStrategyFormMock.mockReturnValue({ ...baseFormState, runtimeConfigError: true, retryRuntimeConfig })
    render(<StrategyForm accountId="account-1" />)
    screen.getByRole('button', { name: '다시 시도' }).click()
    expect(retryRuntimeConfig).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: '등록' })).not.toBeInTheDocument()
  })
  it('shows read-only starting amount instead of the editable seed section in edit mode', () => {
    useStrategyFormMock.mockReturnValue(baseFormState)

    render(<StrategyForm accountId="account-1" initial={initialStrategy} />)

    expect(screen.queryByTestId('usage-ratio-section')).not.toBeInTheDocument()
    expect(screen.getByText('시작금액')).toBeInTheDocument()
    expect(screen.getByText('시드는 전략 등록 후 수정할 수 없습니다')).toBeInTheDocument()
    expect(screen.getByText('$1,200.00')).toBeInTheDocument()
  })

  it('shows the editable seed section in edit mode when currentHoldings is zero', () => {
    useStrategyFormMock.mockReturnValue({
      ...baseFormState,
      canEditSeed: true,
    })

    render(<StrategyForm accountId="account-1" initial={{ ...initialStrategy, currentHoldings: 0 }} />)

    expect(screen.getByTestId('usage-ratio-section')).toBeInTheDocument()
  })

  it('keeps the editable usage ratio section in create mode', () => {
    useStrategyFormMock.mockReturnValue(baseFormState)

    render(<StrategyForm accountId="account-1" />)

    expect(screen.getByTestId('usage-ratio-section')).toBeInTheDocument()
  })
})

describe('StrategyForm VR settings section', () => {
  it('shows VR settings and hides cycle seed options for VR create mode', () => {
    usageRatioSectionMock.mockClear()
    useStrategyFormMock.mockReturnValue({
      ...baseFormState,
      type: 'VR',
      isVr: true,
      usesDivisionCount: false,
      vrFields: {
        initialValue: 3000,
        intervalWeeks: 4,
        bandWidth: 15,
        recurringAmount: 0,
      },
      setVrField: vi.fn(),
    })

    render(<StrategyForm accountId="account-1" />)

    expect(screen.getByTestId('vr-settings-section')).toBeInTheDocument()
    expect(screen.queryByText('cycle-seed-section')).not.toBeInTheDocument()
    expect(usageRatioSectionMock).toHaveBeenCalledWith(expect.objectContaining({
      hint: undefined,
    }))
  })

  it('does not show VR settings for INFINITE create mode', () => {
    useStrategyFormMock.mockReturnValue({
      ...baseFormState,
      isVr: false,
      vrFields: {
        initialValue: null,
        intervalWeeks: 4,
        bandWidth: 15,
        recurringAmount: 0,
      },
      setVrField: vi.fn(),
    })

    render(<StrategyForm accountId="account-1" />)

    expect(screen.queryByTestId('vr-settings-section')).not.toBeInTheDocument()
  })

  it('shows a visible submit disabled reason when submit is blocked', () => {
    useStrategyFormMock.mockReturnValue({
      ...baseFormState,
      cannotSubmit: true,
      submitDisabledReason: '리밸런싱 주기는 1 이상 정수여야 합니다.',
    })

    render(<StrategyForm accountId="account-1" />)

    expect(screen.getByText('리밸런싱 주기는 1 이상 정수여야 합니다.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '등록' })).toBeDisabled()
  })
})

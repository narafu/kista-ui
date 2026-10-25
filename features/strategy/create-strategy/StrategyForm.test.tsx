import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Strategy } from '@entities/strategy'
import { StrategyForm } from './StrategyForm'

const useStrategyFormMock = vi.fn()
const seedInputSectionMock = vi.fn()
const initialHoldingsSectionMock = vi.fn()
const scheduledStartSectionMock = vi.fn()

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

vi.mock('./sections/SeedInputSection', () => ({
  SeedInputSection: (props: unknown) => {
    seedInputSectionMock(props)
    return <div data-testid="seed-input-section">seed-input-section</div>
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

vi.mock('./sections/InitialHoldingsSection', () => ({
  InitialHoldingsSection: (props: unknown) => {
    initialHoldingsSectionMock(props)
    return <div data-testid="initial-holdings-section">initial-holdings-section</div>
  },
}))

vi.mock('./sections/ScheduledStartSection', () => ({
  ScheduledStartSection: (props: unknown) => {
    scheduledStartSectionMock(props)
    return <div data-testid="scheduled-start-section">scheduled-start-section</div>
  },
}))

vi.mock('./DcaStrategyForm', () => ({
  DcaStrategyForm: (props: { availableTickers: string[]; defaultTicker: string; market: string; header?: React.ReactNode }) => (
    <>
      {props.header}
      <div data-testid="dca-strategy-form" data-market={props.market} data-default={props.defaultTicker}>{props.availableTickers.join(',')}</div>
    </>
  ),
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
  seedUsdInput: 1200,
  setSeedUsdInput: vi.fn(),
  availableCash: 5000,
  minSeed: 500,
  isBelowMinSeed: false,
  loadingBase: false,
  canEditSeed: false,
  seedUnavailableReason: null,
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
    avgPrice: null,
    quantity: null,
    intervalWeeks: 4,
    bandWidth: 15,
    recurringAmount: 0,
  },
  setVrField: vi.fn(),
  recurringMode: 'HOLD' as const,
  setRecurringMode: vi.fn(),
  scheduledStartDate: null,
  setScheduledStartDate: vi.fn(),
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

describe('StrategyForm initial holdings section', () => {
  it('shows the initial holdings section for INFINITE create mode', () => {
    initialHoldingsSectionMock.mockClear()
    useStrategyFormMock.mockReturnValue(baseFormState)

    render(<StrategyForm accountId="account-1" />)

    expect(screen.getByTestId('initial-holdings-section')).toBeInTheDocument()
  })

  it('shows the initial holdings section for VR create mode', () => {
    initialHoldingsSectionMock.mockClear()
    useStrategyFormMock.mockReturnValue({ ...baseFormState, type: 'VR', isVr: true })

    render(<StrategyForm accountId="account-1" />)

    expect(screen.getByTestId('initial-holdings-section')).toBeInTheDocument()
  })

  it('hides the initial holdings section in edit mode', () => {
    useStrategyFormMock.mockReturnValue(baseFormState)

    render(<StrategyForm accountId="account-1" initial={initialStrategy} />)

    expect(screen.queryByTestId('initial-holdings-section')).not.toBeInTheDocument()
  })
})

describe('StrategyForm scheduled start section', () => {
  it('shows the scheduled start section in create mode', () => {
    scheduledStartSectionMock.mockClear()
    useStrategyFormMock.mockReturnValue(baseFormState)

    render(<StrategyForm accountId="account-1" />)

    expect(screen.getByTestId('scheduled-start-section')).toBeInTheDocument()
    expect(scheduledStartSectionMock).toHaveBeenCalledWith(expect.objectContaining({ value: null }))
  })

  it('hides the scheduled start section in edit mode', () => {
    useStrategyFormMock.mockReturnValue(baseFormState)

    render(<StrategyForm accountId="account-1" initial={initialStrategy} />)

    expect(screen.queryByTestId('scheduled-start-section')).not.toBeInTheDocument()
  })
})

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

    expect(screen.queryByTestId('seed-input-section')).not.toBeInTheDocument()
    expect(screen.getByText('시작 시드')).toBeInTheDocument()
    expect(screen.getByText('시드는 전략 등록 후 수정할 수 없습니다')).toBeInTheDocument()
    expect(screen.getByText('$1,200.00')).toBeInTheDocument()
  })

  it('shows the editable seed section in edit mode when currentHoldings is zero', () => {
    useStrategyFormMock.mockReturnValue({
      ...baseFormState,
      canEditSeed: true,
    })

    render(<StrategyForm accountId="account-1" initial={{ ...initialStrategy, currentHoldings: 0 }} />)

    expect(screen.getByTestId('seed-input-section')).toBeInTheDocument()
  })

  it('keeps the editable seed input section in create mode', () => {
    useStrategyFormMock.mockReturnValue(baseFormState)

    render(<StrategyForm accountId="account-1" />)

    expect(screen.getByTestId('seed-input-section')).toBeInTheDocument()
  })
})

describe('StrategyForm VR settings section', () => {
  it('shows VR settings and hides cycle seed options for VR create mode', () => {
    seedInputSectionMock.mockClear()
    useStrategyFormMock.mockReturnValue({
      ...baseFormState,
      type: 'VR',
      isVr: true,
      usesDivisionCount: false,
      vrFields: {
        avgPrice: 300,
        quantity: 10,
        intervalWeeks: 4,
        bandWidth: 15,
        recurringAmount: 0,
      },
      setVrField: vi.fn(),
    })

    render(<StrategyForm accountId="account-1" />)

    expect(screen.getByTestId('vr-settings-section')).toBeInTheDocument()
    expect(screen.queryByText('cycle-seed-section')).not.toBeInTheDocument()
    expect(seedInputSectionMock).toHaveBeenCalledWith(expect.objectContaining({
      hint: undefined,
    }))
  })

  it('does not show VR settings for INFINITE create mode', () => {
    useStrategyFormMock.mockReturnValue({
      ...baseFormState,
      isVr: false,
      vrFields: {
        avgPrice: null,
        quantity: null,
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

  it('shows a resolver validation reason even when the pre-submit guard did not block', () => {
    useStrategyFormMock.mockReturnValue({
      ...baseFormState,
      cannotSubmit: false,
      submitDisabledReason: '입력값을 다시 확인해주세요.',
    })

    render(<StrategyForm accountId="account-1" />)

    expect(screen.getByText('입력값을 다시 확인해주세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '등록' })).toBeEnabled()
  })

  it('type=DCA면 DcaStrategyForm만 렌더하고 시드·분할 섹션은 렌더하지 않는다', () => {
    useStrategyFormMock.mockReturnValue({ ...baseFormState, type: 'DCA', availableTickers: ['UPRO', 'QLD'] })

    render(<StrategyForm accountId="account-1" />)

    expect(screen.getByTestId('dca-strategy-form')).toHaveTextContent('UPRO,QLD')
    expect(screen.getByText('type-section')).toBeInTheDocument()
    expect(screen.queryByTestId('seed-input-section')).not.toBeInTheDocument()
    expect(screen.queryByText('division-count-section')).not.toBeInTheDocument()
  })

  it('코인 계좌면 DcaStrategyForm에 CRYPTO_KRW 시장과 필터된 티커·기본 티커를 넘긴다', () => {
    useStrategyFormMock.mockReturnValue({ ...baseFormState, type: 'DCA', isCrypto: true, market: 'CRYPTO_KRW', availableTickers: ['BTC', 'ETH'], defaultTicker: 'BTC' })

    render(<StrategyForm accountId="account-1" broker="UPBIT" />)

    const dca = screen.getByTestId('dca-strategy-form')
    expect(dca).toHaveTextContent('BTC,ETH')
    expect(dca).toHaveAttribute('data-market', 'CRYPTO_KRW')
    expect(dca).toHaveAttribute('data-default', 'BTC')
  })

  it('주식 계좌면 US_STOCK 시장을 넘긴다', () => {
    useStrategyFormMock.mockReturnValue({ ...baseFormState, type: 'DCA', isCrypto: false, market: 'US_STOCK', availableTickers: ['UPRO'] })

    render(<StrategyForm accountId="account-1" />)

    expect(screen.getByTestId('dca-strategy-form')).toHaveAttribute('data-market', 'US_STOCK')
  })
})

describe('StrategyForm DCA 수정 모드', () => {
  const dcaInitial = { ...initialStrategy, id: 'dca-1', type: 'DCA', ticker: 'QLD' } as Strategy

  it('initial.type이 DCA면 form.type과 무관하게 DcaStrategyForm을 렌더한다', () => {
    useStrategyFormMock.mockReturnValue({ ...baseFormState, type: 'INFINITE', availableTickers: ['UPRO', 'QLD'] })

    render(<StrategyForm accountId="account-1" initial={dcaInitial} />)

    expect(screen.getByTestId('dca-strategy-form')).toBeInTheDocument()
    expect(screen.queryByTestId('seed-input-section')).not.toBeInTheDocument()
    expect(screen.queryByText('division-count-section')).not.toBeInTheDocument()
  })

  it('수정 모드에서는 종목을 initial.ticker 하나로 고정하고 유형 선택은 숨긴다', () => {
    useStrategyFormMock.mockReturnValue({ ...baseFormState, availableTickers: ['UPRO', 'QLD'] })

    render(<StrategyForm accountId="account-1" initial={dcaInitial} />)

    expect(screen.getByTestId('dca-strategy-form')).toHaveTextContent(/^QLD$/)
    expect(screen.queryByText('type-section')).not.toBeInTheDocument()
  })
})

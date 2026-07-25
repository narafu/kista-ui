import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStrategyForm } from './useStrategyForm'

const runtimeRecurringMode = vi.hoisted(() => ({ defaultValue: 'HOLD' }))

vi.mock('@entities/runtime-config', () => ({
  useRuntimeConfigQuery: () => ({
    data: {
      strategies: {
        INFINITE: { enabled: true, fields: { ticker: { customizable: true, allowedValues: ['TSLA'], defaultValue: 'TSLA' }, divisionCount: { customizable: true, allowedValues: [20, 30, 40], defaultValue: 20 } } },
        PRIVACY: { enabled: true, fields: { ticker: { customizable: false, allowedValues: ['SOXL'], defaultValue: 'SOXL' } } },
        VR: { enabled: true, fields: { ticker: { customizable: false, allowedValues: ['TQQQ'], defaultValue: 'TQQQ' }, recurringMode: { customizable: true, allowedValues: ['DEPOSIT', 'HOLD', 'WITHDRAW'], defaultValue: runtimeRecurringMode.defaultValue }, bandWidth: { customizable: true, allowedValues: [10, 15, 20], defaultValue: 15 }, intervalWeeks: { customizable: true, allowedValues: [1, 2, 4], defaultValue: 2 } } },
      },
    },
    isLoading: false,
  }),
}))

const mockCreateMutate = vi.fn()
const mockUpdateMutate = vi.fn()
const meQueryState = {
  data: { balanceCheckEnabled: true },
}

const seedModelState = {
  pct: 100,
  setPct: vi.fn(),
  seedUsdInput: 1200,
  setSeedUsdInput: vi.fn(),
  resetSeed: vi.fn(),
  seedUsd: 1200,
  isBelowMinSeed: false,
  isInvalidSeed: false,
}

const seedPreviewState = {
  data: {
    basePrice: 100 as number | null,
    minSeed: 500 as number | null,
    skipReason: null as string | null,
  },
  isLoading: false,
}

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      strategyTypes: [{ code: 'INFINITE' }, { code: 'PRIVACY' }, { code: 'VR' }],
      tickers: [{ code: 'TSLA' }],
    },
    findStrategyType: (code: string) => code === 'VR'
      ? {
          code: 'VR',
          availableTickers: ['TQQQ'],
          requiresPrivacyBase: false,
          tickerFixed: true,
          supportsReverseMode: false,
          divisionCounts: [],
        }
      : {
          code: 'INFINITE',
          availableTickers: ['TSLA'],
          requiresPrivacyBase: false,
          tickerFixed: false,
          supportsReverseMode: false,
          divisionCounts: [20, 30, 40],
        },
  }),
}))

vi.mock('@entities/account', () => ({
  useAccountMarginQuery: () => ({
    items: [{ currency: 'USD', purchasableAmount: 5000 }],
    isLoading: false,
  }),
  useAccountPricesQuery: () => ({
    data: { TSLA: 100 },
  }),
}))

vi.mock('@entities/strategy', () => ({
  useCreateStrategyMutation: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateStrategyMutation: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useStrategySeedPreviewQuery: () => seedPreviewState,
}))

vi.mock('@entities/user', () => ({
  useMeQuery: () => meQueryState,
}))

vi.mock('./useSeedModel', () => ({
  useSeedModel: () => seedModelState,
}))

describe('useStrategyForm submit policy', () => {
  beforeEach(() => {
    runtimeRecurringMode.defaultValue = 'HOLD'
    mockCreateMutate.mockClear()
    mockUpdateMutate.mockClear()
    meQueryState.data.balanceCheckEnabled = true
    seedModelState.pct = 100
    seedModelState.seedUsdInput = 1200
    seedModelState.seedUsd = 1200
    seedModelState.resetSeed.mockClear()
    seedModelState.isBelowMinSeed = false
    seedModelState.isInvalidSeed = false
    seedPreviewState.data.basePrice = 100
    seedPreviewState.data.minSeed = 500
    seedPreviewState.data.skipReason = null
    seedPreviewState.isLoading = false
  })

  it.each([
    ['DEPOSIT', 250],
    ['WITHDRAW', -250],
  ] as const)('VR runtime default %s requires magnitude and serializes its sign', async (mode, serializedAmount) => {
    runtimeRecurringMode.defaultValue = mode
    seedModelState.seedUsd = 100000
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))

    act(() => result.current.setType('VR'))
    expect(result.current.recurringMode).toBe(mode)
    expect(result.current.cannotSubmit).toBe(true)
    expect(result.current.submitDisabledReason).toContain('금액을 0보다 크게 입력하세요')

    act(() => result.current.setVrField('recurringAmount', 250))
    expect(result.current.cannotSubmit).toBe(false)

    await act(async () => result.current.handleSubmit({ preventDefault() {} } as React.FormEvent))
    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalled())
    expect(mockCreateMutate).toHaveBeenCalledWith(expect.objectContaining({ recurringAmount: serializedAmount }))
  })

  it('edit payload does not include initialUsdDeposit', async () => {
    seedModelState.seedUsdInput = 777
    seedModelState.seedUsd = 777

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
        initial: {
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
        },
      }),
    )

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
    })

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalled()
    })

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      type: 'INFINITE',
      ticker: 'TSLA',
      cycleSeedType: 'MAX',
    })
    expect(mockUpdateMutate.mock.calls[0][0]).not.toHaveProperty('initialUsdDeposit')
  })

  it('edit payload sends changed cycleSeedType from current form state', async () => {
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
        initial: {
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
        },
      }),
    )

    act(() => {
      result.current.setSeedMode('KEEP')
    })

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
    })

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalled()
    })

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      type: 'INFINITE',
      ticker: 'TSLA',
      cycleSeedType: 'MAINTAIN',
    })
  })

  it('edit payload includes initialUsdDeposit when currentHoldings is zero', async () => {
    seedModelState.seedUsd = 1800

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
        initial: {
          id: 'strategy-1',
          accountId: 'account-1',
          type: 'INFINITE',
          status: 'ACTIVE',
          ticker: 'TSLA',
          cycleSeedType: 'MAX',
          initialUsdDeposit: 1200,
          divisionCount: 20,
          isReverseMode: false,
          currentHoldings: 0,
        },
      }),
    )

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
    })

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalled()
    })

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      type: 'INFINITE',
      ticker: 'TSLA',
      cycleSeedType: 'MAX',
      initialUsdDeposit: 1800,
    })
  })

  it('create payload keeps initialUsdDeposit when seed exists', async () => {
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
    })

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalled()
    })

    expect(mockCreateMutate).toHaveBeenCalledWith({
      type: 'INFINITE',
      ticker: 'TSLA',
      cycleSeedType: 'MAX',
      initialUsdDeposit: 1200,
      divisionCount: 20,
    })
  })

  it('edit mode does not block submit when seed state is invalid', () => {
    seedModelState.isBelowMinSeed = true
    seedModelState.isInvalidSeed = true
    seedPreviewState.data.basePrice = null

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
        initial: {
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
        },
      }),
    )

    expect(result.current.cannotSubmit).toBe(false)
  })

  it('create mode stays blocked when seed is invalid', () => {
    seedModelState.isInvalidSeed = true

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    expect(result.current.cannotSubmit).toBe(true)
  })

  it('edit mode with currentHoldings zero uses create-style validation', () => {
    seedModelState.isInvalidSeed = true

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
        initial: {
          id: 'strategy-1',
          accountId: 'account-1',
          type: 'INFINITE',
          status: 'ACTIVE',
          ticker: 'TSLA',
          cycleSeedType: 'MAX',
          initialUsdDeposit: 1200,
          divisionCount: 20,
          isReverseMode: false,
          currentHoldings: 0,
        },
      }),
    )

    expect(result.current.cannotSubmit).toBe(true)
  })

  it('VR create payload includes VR fields and forces cycleSeedType NONE', async () => {
    seedModelState.seedUsd = 2000

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('avgPrice', 300)
      result.current.setVrField('quantity', 10)
      result.current.setVrField('intervalWeeks', 4)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('recurringAmount', null)
    })

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
    })

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalled()
    })

    expect(mockCreateMutate).toHaveBeenCalledWith({
      type: 'VR',
      ticker: 'TQQQ',
      cycleSeedType: 'NONE',
      initialUsdDeposit: 2000,
      initialHoldings: 10,
      initialAvgPrice: 300,
      intervalWeeks: 4,
      bandWidth: 15,
      recurringAmount: 0,
    })
  })

  it('VR accumulation create allows zero initial value and zero seed', async () => {
    seedModelState.seedUsd = 0
    seedModelState.isInvalidSeed = true

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('intervalWeeks', 2)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('recurringAmount', 200)
      result.current.setRecurringMode('DEPOSIT')
    })

    expect(result.current.cannotSubmit).toBe(false)

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
    })

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalled()
    })

    expect(mockCreateMutate).toHaveBeenCalledWith({
      type: 'VR',
      ticker: 'TQQQ',
      cycleSeedType: 'NONE',
      initialUsdDeposit: 0,
      intervalWeeks: 2,
      bandWidth: 15,
      recurringAmount: 200,
    })
  })

  it('VR create defaults avg price/quantity to empty and interval weeks to 2', () => {
    seedModelState.seedUsd = 0
    seedModelState.isInvalidSeed = true

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
    })

    expect(result.current.vrFields.avgPrice).toBeNull()
    expect(result.current.vrFields.quantity).toBeNull()
    expect(result.current.vrFields.intervalWeeks).toBe(2)
    expect(result.current.vrFields.recurringAmount).toBe(0)
  })

  it('VR create with balance check off resets initial seed input to 0', async () => {
    meQueryState.data.balanceCheckEnabled = false

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
    })

    await waitFor(() => {
      expect(seedModelState.resetSeed).toHaveBeenCalledWith(expect.objectContaining({
        seedUsdInput: 0,
      }))
    })
  })

  it('VR hold and withdrawal create are blocked when initial value and seed are both zero', () => {
    seedModelState.seedUsd = 0
    seedModelState.isInvalidSeed = true

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('intervalWeeks', 2)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('recurringAmount', 0)
    })

    expect(result.current.cannotSubmit).toBe(true)

    act(() => {
      result.current.setVrField('recurringAmount', -100)
      result.current.setRecurringMode('WITHDRAW')
    })

    expect(result.current.cannotSubmit).toBe(true)
  })

  it('VR withdrawal create requires initial assets to be at least 100 months of withdrawals', () => {
    seedModelState.seedUsd = 1000
    seedModelState.isInvalidSeed = false

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('avgPrice', 100)
      result.current.setVrField('quantity', 10)
      result.current.setVrField('intervalWeeks', 2)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('recurringAmount', -100)
      result.current.setRecurringMode('WITHDRAW')
    })

    expect(result.current.cannotSubmit).toBe(true)

    act(() => {
      result.current.setVrField('quantity', 190)
    })

    expect(result.current.cannotSubmit).toBe(false)
  })

  it('VR create is blocked until intervalWeeks and bandWidth are valid', () => {
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('intervalWeeks', 4)
      result.current.setVrField('bandWidth', null)
      result.current.setVrField('recurringAmount', 200)
      result.current.setRecurringMode('DEPOSIT')
    })

    expect(result.current.cannotSubmit).toBe(true)
  })

  it('VR create is blocked when avgPrice or quantity is individually negative even though their product is non-negative', () => {
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('avgPrice', 0)
      result.current.setVrField('quantity', -5)
      result.current.setVrField('intervalWeeks', 2)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('recurringAmount', 200)
      result.current.setRecurringMode('DEPOSIT')
    })

    expect(result.current.cannotSubmit).toBe(true)
    expect(result.current.submitDisabledReason).toContain('수량은 0 이상')
  })

  it('VR create is blocked when integer-only fields contain decimals', () => {
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('avgPrice', 300)
      result.current.setVrField('quantity', 10)
      result.current.setVrField('intervalWeeks', 4.5)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('recurringAmount', 10.5)
      result.current.setRecurringMode('DEPOSIT')
    })

    expect(result.current.cannotSubmit).toBe(true)
  })

  it('non-VR create sends initialHoldings/initialAvgPrice when quantity is entered', async () => {
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setVrField('avgPrice', 45.5)
      result.current.setVrField('quantity', 10)
    })

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
    })

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalled()
    })

    expect(mockCreateMutate).toHaveBeenCalledWith(expect.objectContaining({
      initialHoldings: 10,
      initialAvgPrice: 45.5,
    }))
  })

  it('non-VR create is blocked when quantity is entered without an avg price', () => {
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setVrField('quantity', 10)
    })

    expect(result.current.cannotSubmit).toBe(true)
    expect(result.current.submitDisabledReason).toContain('보유 수량을 입력하면 평단가는 0보다 커야 합니다')
  })

  it('non-VR create is blocked when quantity is a decimal (server initialHoldings is Integer)', () => {
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setVrField('avgPrice', 45.5)
      result.current.setVrField('quantity', 10.5)
    })

    expect(result.current.cannotSubmit).toBe(true)
    expect(result.current.submitDisabledReason).toContain('수량은 정수여야 합니다')
  })

  it('non-VR create omits initialHoldings/initialAvgPrice when quantity is left empty', async () => {
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
    })

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalled()
    })

    expect(mockCreateMutate.mock.calls[0][0]).not.toHaveProperty('initialHoldings')
    expect(mockCreateMutate.mock.calls[0][0]).not.toHaveProperty('initialAvgPrice')
  })
})

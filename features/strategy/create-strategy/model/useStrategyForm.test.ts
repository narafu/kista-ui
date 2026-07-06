import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStrategyForm } from './useStrategyForm'

const mockCreateMutate = vi.fn()
const mockUpdateMutate = vi.fn()

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
      strategyTypes: [{ code: 'INFINITE' }],
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
  useMeQuery: () => ({
    data: { balanceCheckEnabled: true },
  }),
}))

vi.mock('./useSeedModel', () => ({
  useSeedModel: () => seedModelState,
}))

describe('useStrategyForm submit policy', () => {
  beforeEach(() => {
    mockCreateMutate.mockClear()
    mockUpdateMutate.mockClear()
    seedModelState.pct = 100
    seedModelState.seedUsdInput = 1200
    seedModelState.seedUsd = 1200
    seedModelState.isBelowMinSeed = false
    seedModelState.isInvalidSeed = false
    seedPreviewState.data.basePrice = 100
    seedPreviewState.data.minSeed = 500
    seedPreviewState.data.skipReason = null
    seedPreviewState.isLoading = false
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
      result.current.setVrField('initialValue', 3000)
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
      initialValue: 3000,
      intervalWeeks: 4,
      bandWidth: 15,
      recurringAmount: 0,
    })
  })

  it('VR create is blocked until initialValue intervalWeeks and bandWidth are valid', () => {
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('initialValue', null)
      result.current.setVrField('intervalWeeks', 4)
      result.current.setVrField('bandWidth', 15)
    })

    expect(result.current.cannotSubmit).toBe(true)
  })
})

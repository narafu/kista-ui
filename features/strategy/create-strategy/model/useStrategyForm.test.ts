import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { todayKst } from '@shared/lib/format'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import { useStrategyForm } from './useStrategyForm'

// todayKst() 기준 며칠 뒤/전 날짜를 yyyy-MM-dd로 계산 (달력일 산술만 필요 — UTC로 취급해도 안전)
function addDaysToKstDate(days: number): string {
  const [y, m, d] = todayKst().split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const runtimeRecurringMode = vi.hoisted(() => ({ defaultValue: 'HOLD' }))
// 메타 VR 램프 기본값표 — 기본은 없음(구버전 api, 고정표로 대체)
const vrRampMeta = vi.hoisted(() => ({ value: undefined as Record<string, Record<string, number>> | undefined }))
const invalidateQueriesMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
let createSuccessHandler: ((saved?: { todayOpenBatchMissed?: boolean }) => void) | undefined
const toastInfoMock = vi.hoisted(() => vi.fn())
const pricesQueryMock = vi.hoisted(() => vi.fn((_accountId: string, _tickers: string[]) => ({ data: { TSLA: 100 } })))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: toastInfoMock } }))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}))

const mockCreateMutate = vi.fn()
const mockUpdateMutate = vi.fn()
const seedModelState = {
  seedUsdInput: 1200,
  setSeedUsdInput: vi.fn(),
  seedUsd: 1200,
  isBelowMinSeed: false,
  isInvalidSeed: false,
}

const seedPreviewState = {
  data: {
    basePrice: 100 as number | null,
    minSeed: 500 as number | null,
    skipReason: null as string | null,
    availableCash: null as number | null,
  },
  isLoading: false,
}

// 서버 검증 훅 대역 — derived는 위 시드 미리보기 값, current는 "지금 입력"의 결과(pending이면 없음)
const validationState = {
  fieldErrors: [] as { field: string | null; detail: string }[],
  warnings: [] as { code: string; detail: string }[],
  pending: false,
  isError: false,
  noData: false, // 다른 범위로 바뀌어 표시할 결과도 없음
  calls: [] as unknown[][],
  refetch: vi.fn(),
}

vi.mock('@entities/meta', async () => ({
  ...(await vi.importActual<typeof import('@entities/meta')>('@entities/meta')),
  useMeta: () => ({
    meta: {
      // 전략별 enabled·fields(관리자 운영 설정) — 기존 runtime-config mock 값 그대로
      strategyTypes: [
        { code: 'INFINITE', availableTickers: ['TSLA'], enabled: true, fields: { ticker: { customizable: true, allowedValues: ['TSLA'], defaultValue: 'TSLA' }, divisionCount: { customizable: true, allowedValues: [20, 30, 40], defaultValue: 20 } } },
        { code: 'PRIVACY', availableTickers: ['SOXL'], enabled: true, fields: { ticker: { customizable: false, allowedValues: ['SOXL'], defaultValue: 'SOXL' } } },
        { code: 'VR', availableTickers: ['TQQQ'], enabled: true, fields: { ticker: { customizable: false, allowedValues: ['TQQQ'], defaultValue: 'TQQQ' }, recurringMode: { customizable: true, allowedValues: ['DEPOSIT', 'HOLD', 'WITHDRAW'], defaultValue: runtimeRecurringMode.defaultValue }, bandWidth: { customizable: true, allowedValues: [10, 15, 20], defaultValue: 15 }, intervalWeeks: { customizable: true, allowedValues: [1, 2, 4], defaultValue: 2 } } },
      ],
      tickers: [{ code: 'TSLA' }, { code: 'SOXL' }, { code: 'TQQQ' }],
      brokers: [],
      approvalRequired: false,
    },
    findStrategyType: (code: string) => code === 'PRIVACY'
      ? { code: 'PRIVACY', availableTickers: ['SOXL'], requiresPrivacyBase: true, tickerFixed: true, supportsReverseMode: false, divisionCounts: [] }
      : code === 'VR'
      ? {
          vrRampDefaults: vrRampMeta.value,
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
  invalidateLedgerTotals: (qc: { invalidateQueries: (o: unknown) => unknown }, id?: string) => Promise.resolve(qc.invalidateQueries({ queryKey: ['ledger', id] })).catch(() => null),
  useAccountPricesQuery: pricesQueryMock,
}))

vi.mock('@entities/strategy', async () => ({
  ...(await import('@entities/strategy/model/vrRamp')),
  ...(await import('@entities/strategy/model/poolLimitRamp')),
  ...(await import('@entities/strategy/model/actionState')),
  ...(await import('@entities/strategy/model/vrFieldMessages')),
  useCreateStrategyMutation: (_accountId: string, onSuccess?: (saved?: { todayOpenBatchMissed?: boolean }) => void) => {
    createSuccessHandler = onSuccess
    return {
    mutate: mockCreateMutate,
    isPending: false,
    }
  },
  useUpdateStrategyMutation: (_strategyId: string) => {
    return {
    mutate: mockUpdateMutate,
    isPending: false,
    }
  },
  useStrategyValidationQuery: (...args: unknown[]) => {
    validationState.calls.push(args)
    const data = { fieldErrors: validationState.fieldErrors, warnings: validationState.warnings, derived: seedPreviewState.data }
    return {
      data: validationState.isError || validationState.noData ? undefined : data,
      current: validationState.pending || validationState.isError ? undefined : data,
      isLoading: seedPreviewState.isLoading,
      isError: validationState.isError,
      refetch: validationState.refetch,
    }
  },
}))

vi.mock('./useSeedModel', () => ({
  useSeedModel: () => seedModelState,
  isBelowMinSeed: () => seedModelState.isBelowMinSeed,
}))

describe('useStrategyForm submit policy', () => {
  beforeEach(() => {
    runtimeRecurringMode.defaultValue = 'HOLD'
    vrRampMeta.value = undefined
    mockCreateMutate.mockClear()
    mockUpdateMutate.mockClear()
    invalidateQueriesMock.mockClear()
    toastInfoMock.mockClear()
    createSuccessHandler = undefined
    seedModelState.seedUsdInput = 1200
    seedModelState.seedUsd = 1200
    seedModelState.setSeedUsdInput.mockClear()
    pricesQueryMock.mockClear()
    seedModelState.isBelowMinSeed = false
    seedModelState.isInvalidSeed = false
    seedPreviewState.data.basePrice = 100
    seedPreviewState.data.minSeed = 500
    seedPreviewState.data.skipReason = null
    seedPreviewState.data.availableCash = null
    seedPreviewState.isLoading = false
    validationState.fieldErrors = []
    validationState.warnings = []
    validationState.pending = false
    validationState.isError = false
    validationState.noData = false
    validationState.calls = []
    validationState.refetch.mockClear()
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
    expect(result.current.submitDisabledReason).toBeNull()
    await act(async () => { result.current.handleSubmit({ preventDefault() {} } as React.FormEvent) })
    expect(result.current.submitDisabledReason).toContain('금을 0보다 크게 입력하세요')

    act(() => result.current.setVrField('recurringAmount', 250))
    expect(result.current.cannotSubmit).toBe(false)

    await act(async () => result.current.handleSubmit({ preventDefault() {} } as React.FormEvent))
    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalled())
    expect(mockCreateMutate).toHaveBeenCalledWith(expect.objectContaining({ recurringAmount: serializedAmount }))
  })

  it('invalidates order previews after strategy configuration changes', () => {
    renderHook(() => useStrategyForm({ accountId: 'account-1' }))

    createSuccessHandler?.()

    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: orderKeys.all })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: statsKeys.all })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: tradeKeys.all })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['ledger', 'account-1'] })
  })

  it('still calls the form onSuccess callback after save even if one dependent invalidation rejects', async () => {
    const onSuccess = vi.fn()
    invalidateQueriesMock.mockRejectedValueOnce(new Error('stats refetch failed'))
    renderHook(() => useStrategyForm({ accountId: 'account-1', onSuccess }))

    await createSuccessHandler?.()

    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('shows the open-batch notice only when the register response flags a missed open batch', async () => {
    renderHook(() => useStrategyForm({ accountId: 'account-1' }))

    await createSuccessHandler?.({ todayOpenBatchMissed: false })
    expect(toastInfoMock).not.toHaveBeenCalled()

    await createSuccessHandler?.({ todayOpenBatchMissed: true })
    expect(toastInfoMock).toHaveBeenCalledOnce()
    expect(toastInfoMock.mock.calls[0][0]).toBe('오늘 개장 배치(22:00)가 지나 오늘 밤 장 시작 주문은 나가지 않습니다. 장 시작 주문은 다음 거래일부터 자동으로 나갑니다.')
  })

  it('edit payload does not include initialDeposit', async () => {
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
          initialDeposit: 1200,
          divisionCount: 20,
          isReverseMode: false,
          cycleInProgress: true,
          allowedActions: [],
          blockedActions: [],
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
    expect(mockUpdateMutate.mock.calls[0][0]).not.toHaveProperty('initialDeposit')
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
          initialDeposit: 1200,
          divisionCount: 20,
          isReverseMode: false,
          cycleInProgress: true,
          allowedActions: [],
          blockedActions: [],
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

  it('edit payload includes initialDeposit when currentHoldings is zero', async () => {
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
          initialDeposit: 1200,
          divisionCount: 20,
          isReverseMode: false,
          cycleInProgress: true,
          allowedActions: ['EDIT_SEED'],
          blockedActions: [],
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
      initialDeposit: 1800,
    })
  })

  it('create payload keeps initialDeposit when seed exists', async () => {
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
      scheduledStartDate: todayKst(),
      type: 'INFINITE',
      ticker: 'TSLA',
      cycleSeedType: 'MAX',
      initialDeposit: 1200,
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
          initialDeposit: 1200,
          divisionCount: 20,
          isReverseMode: false,
          cycleInProgress: true,
          allowedActions: [],
          blockedActions: [],
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
          initialDeposit: 1200,
          divisionCount: 20,
          isReverseMode: false,
          cycleInProgress: true,
          allowedActions: ['EDIT_SEED'],
          blockedActions: [],
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
      scheduledStartDate: todayKst(),
      type: 'VR',
      ticker: 'TQQQ',
      cycleSeedType: 'NONE',
      initialDeposit: 2000,
      initialHoldings: 10,
      initialAvgPrice: 300,
      intervalWeeks: 4,
      bandWidth: 15,
      recurringAmount: 0,
      initialGradient: 10,
      gMax: 20,
      initialPoolLimitRate: 0.75,
      poolLimitFloor: 0.5,
    })
  })

  it('VR create payload includes initialVrValue when explicit initial V is entered', async () => {
    seedModelState.seedUsd = 2000

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('intervalWeeks', 4)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('recurringAmount', null)
      result.current.setVrField('initialValue', 5000)
    })

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
    })

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalled()
    })

    expect(mockCreateMutate).toHaveBeenCalledWith({
      scheduledStartDate: todayKst(),
      type: 'VR',
      ticker: 'TQQQ',
      cycleSeedType: 'NONE',
      initialDeposit: 2000,
      intervalWeeks: 4,
      bandWidth: 15,
      recurringAmount: 0,
      initialVrValue: 5000,
      initialGradient: 10,
      gMax: 20,
      initialPoolLimitRate: 0.75,
      poolLimitFloor: 0.5,
    })
  })

  it('VR create omits initialVrValue when the explicit initial V is left empty', async () => {
    seedModelState.seedUsd = 2000

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
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

    expect(mockCreateMutate.mock.calls[0][0]).not.toHaveProperty('initialVrValue')
  })

  it('VR create payload includes ramp fields when provided', async () => {
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
      result.current.setVrField('initialGradient', 10)
      result.current.setVrField('gGraceWeeks', 52)
      result.current.setVrField('gStepWeeks', 26)
      result.current.setVrField('gMax', 20)
      result.current.setVrField('initialPoolLimitRate', 0.75)
      result.current.setVrField('pGraceWeeks', 52)
      result.current.setVrField('pStepWeeks', 26)
      result.current.setVrField('poolLimitFloor', 0.5)
    })

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
    })

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalled()
    })

    expect(mockCreateMutate).toHaveBeenCalledWith({
      scheduledStartDate: todayKst(),
      type: 'VR',
      ticker: 'TQQQ',
      cycleSeedType: 'NONE',
      initialDeposit: 2000,
      initialHoldings: 10,
      initialAvgPrice: 300,
      intervalWeeks: 4,
      bandWidth: 15,
      recurringAmount: 0,
      initialGradient: 10,
      gGraceWeeks: 52,
      gStepWeeks: 26,
      gMax: 20,
      initialPoolLimitRate: 0.75,
      pGraceWeeks: 52,
      pStepWeeks: 26,
      poolLimitFloor: 0.5,
    })
  })

  it('VR create is blocked when gMax is below initialGradient', () => {
    seedModelState.seedUsd = 2000

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('intervalWeeks', 4)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('initialGradient', 10)
      result.current.setVrField('gMax', 5)
    })

    expect(result.current.cannotSubmit).toBe(true)
    expect(result.current.submitDisabledReason).toBe('gradient 상한은 초기값 이상이어야 합니다.')
  })

  it('VR create is blocked when an active gradient ramp has gMax below the derived initial value', () => {
    seedModelState.seedUsd = 2000

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('intervalWeeks', 4)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('initialGradient', null)
      result.current.setVrField('gStepWeeks', 26)
      result.current.setVrField('gMax', 5)
    })

    expect(result.current.cannotSubmit).toBe(true)
    expect(result.current.submitDisabledReason).toBe('gradient 상한은 초기값 이상이어야 합니다.')
  })

  it('VR create submits gradient ramp disabled values when gStepWeeks is zero', async () => {
    seedModelState.seedUsd = 2000

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('intervalWeeks', 4)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('initialGradient', 10)
      result.current.setVrField('gStepWeeks', 0)
      result.current.setVrField('gMax', 0)
      result.current.setVrField('gGraceWeeks', 0)
    })

    expect(result.current.cannotSubmit).toBe(false)

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
    })

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalledWith(expect.objectContaining({
        gStepWeeks: 0,
        gMax: 0,
        gGraceWeeks: 0,
      }))
    })
  })

  it('omits the generic reason when every resolver error is drawn under its field', async () => {
    seedModelState.seedUsd = 2000

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('intervalWeeks', 4)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('gStepWeeks', 1.5)
    })

    expect(result.current.cannotSubmit).toBe(false)

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
    })

    await waitFor(() => expect(result.current.vrErrors.gStepWeeks).toBeTruthy())
    expect(result.current.submitDisabledReason).toBeNull()
    expect(mockCreateMutate).not.toHaveBeenCalled()
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
      scheduledStartDate: todayKst(),
      type: 'VR',
      ticker: 'TQQQ',
      cycleSeedType: 'NONE',
      initialDeposit: 0,
      intervalWeeks: 2,
      bandWidth: 15,
      recurringAmount: 200,
      initialGradient: 10,
      gMax: 20,
      initialPoolLimitRate: 1,
      poolLimitFloor: 0.5,
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

  it.each(['VR', 'PRIVACY'])('%s로 유형을 바꾸면 예수금을 0으로 되돌리고, 같은 유형을 다시 고르면 두지 않는다', (next) => {
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    act(() => result.current.setType('INFINITE'))
    expect(seedModelState.setSeedUsdInput).not.toHaveBeenCalled()

    act(() => result.current.setType(next))
    expect(seedModelState.setSeedUsdInput).toHaveBeenCalledWith(0)
  })

  it('최소 시드 응답이 와도 예수금을 채우지 않는다', () => {
    renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    expect(seedModelState.setSeedUsdInput).not.toHaveBeenCalled()
  })

  it('현재가는 선택 가능한 종목(현재 유형·수정 중 종목)만 조회한다', () => {
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    expect(pricesQueryMock).toHaveBeenLastCalledWith('account-1', ['TSLA'])
    act(() => result.current.setType('VR'))
    expect(pricesQueryMock).toHaveBeenLastCalledWith('account-1', ['TQQQ'])

    renderHook(() => useStrategyForm({
      accountId: 'account-1',
      initial: { id: 's', accountId: 'account-1', type: 'INFINITE', status: 'ACTIVE', ticker: 'SOXL', cycleSeedType: 'MAX', isReverseMode: false, cycleInProgress: true, allowedActions: [], blockedActions: [] },
    }))
    expect(pricesQueryMock).toHaveBeenLastCalledWith('account-1', ['SOXL'])
  })

  it.each([
    ['서버가 허용', ['EDIT_SEED'], [], true],
    ['서버가 차단(종료 사이클·보관·보유)', [], [{ action: 'EDIT_SEED', reasonCode: 'NO_ACTIVE_CYCLE' }], false],
    ['미지원(VR)', [], [], false],
  ] as const)('시드 수정은 보유 0이 아니라 서버 판정을 따른다 — %s', async (_name, allowed, blocked, editable) => {
    const { result } = renderHook(() => useStrategyForm({
      accountId: 'account-1',
      initial: { id: 's', accountId: 'account-1', type: 'INFINITE', status: 'ACTIVE', ticker: 'TSLA', cycleSeedType: 'MAX', initialDeposit: 1200, isReverseMode: false, cycleInProgress: true, allowedActions: [...allowed], blockedActions: [...blocked], currentHoldings: 0 },
    }))
    expect(result.current.canEditSeed).toBe(editable)
    await act(async () => { result.current.handleSubmit({ preventDefault() {} } as React.FormEvent) })
    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled())
    expect('initialDeposit' in mockUpdateMutate.mock.calls[0][0]).toBe(editable)
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

  it('VR withdrawal create still requires real evaluated assets even when explicit initial V is large enough', () => {
    seedModelState.seedUsd = 100
    seedModelState.isInvalidSeed = false

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('intervalWeeks', 2)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('recurringAmount', -100)
      result.current.setRecurringMode('WITHDRAW')
      // 게이트(V+예수금>0)는 통과시킬 만큼 크지만, 실제 보유 포지션이 없어 인출식 최소자산 검증은 여전히 실패해야 한다
      result.current.setVrField('initialValue', 100000)
    })

    expect(result.current.cannotSubmit).toBe(true)
  })

  it('VR withdrawal create with an explicit initial V of 0 still uses avgPrice*quantity for the minimum-assets check', () => {
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
      result.current.setVrField('quantity', 190)
      result.current.setVrField('intervalWeeks', 2)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('recurringAmount', -100)
      result.current.setRecurringMode('WITHDRAW')
      result.current.setVrField('initialValue', 0)
    })

    expect(result.current.cannotSubmit).toBe(false)
  })

  it('VR create HOLD mode is allowed when only the explicit initial V is entered (no holdings)', () => {
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
      result.current.setRecurringMode('HOLD')
      result.current.setVrField('initialValue', 3000)
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

  it('non-VR create is blocked when an avg price is entered without a quantity', () => {
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setVrField('avgPrice', 45.5)
    })

    expect(result.current.cannotSubmit).toBe(true)
    expect(result.current.submitDisabledReason).toContain('평단가를 입력하면 수량은 0보다 커야 합니다')

    act(() => {
      result.current.setVrField('quantity', 0)
    })

    expect(result.current.cannotSubmit).toBe(true)
    expect(result.current.submitDisabledReason).toContain('평단가를 입력하면 수량은 0보다 커야 합니다')
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

  it('create payload includes scheduledStartDate when set', async () => {
    const futureDate = addDaysToKstDate(7)
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setScheduledStartDate(futureDate)
    })

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
    })

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalled()
    })

    expect(mockCreateMutate).toHaveBeenCalledWith(expect.objectContaining({
      scheduledStartDate: futureDate,
    }))
  })

  it('create payload defaults scheduledStartDate to today', async () => {
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

    expect(mockCreateMutate.mock.calls[0][0]).toHaveProperty('scheduledStartDate', todayKst())
  })

  it('create is blocked when scheduledStartDate is in the past', () => {
    const pastDate = addDaysToKstDate(-1)
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setScheduledStartDate(pastDate)
    })

    expect(result.current.cannotSubmit).toBe(true)
    expect(result.current.submitDisabledReason).toContain('시작예정일은 오늘 이후여야 합니다')
  })

  it('create is not blocked when scheduledStartDate is today', () => {
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setScheduledStartDate(todayKst())
    })

    expect(result.current.cannotSubmit).toBe(false)
  })

  it('시드 미리보기의 availableCash를 노출하고 없으면 null이다', () => {
    const { result, rerender } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    expect(result.current.availableCash).toBeNull()

    seedPreviewState.data.availableCash = 5000
    rerender()
    expect(result.current.availableCash).toBe(5000)
  })

  it('시드가 availableCash를 넘어도 제출을 막지 않는다', () => {
    seedPreviewState.data.availableCash = 1000
    seedModelState.seedUsd = 1200
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))

    expect(result.current.cannotSubmit).toBe(false)
  })

  it('MOCK broker는 isMock을 노출한다', () => {
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1', broker: 'MOCK' }))

    expect(result.current.isMock).toBe(true)
  })
})

describe('useStrategyForm 서버 검증 연결', () => {
  const submitEvent = { preventDefault() {} } as React.FormEvent
  const lastValidation = () => validationState.calls.at(-1) as [unknown, unknown, { enabled: boolean }]

  beforeEach(() => {
    runtimeRecurringMode.defaultValue = 'HOLD'
    vrRampMeta.value = undefined
    mockCreateMutate.mockClear()
    mockUpdateMutate.mockClear()
    seedModelState.seedUsdInput = 1200
    seedModelState.seedUsd = 1200
    seedModelState.setSeedUsdInput.mockClear()
    pricesQueryMock.mockClear()
    seedModelState.isBelowMinSeed = false
    seedModelState.isInvalidSeed = false
    seedPreviewState.data.basePrice = 100
    seedPreviewState.data.minSeed = 500
    seedPreviewState.data.skipReason = null
    seedPreviewState.data.availableCash = null
    seedPreviewState.isLoading = false
    validationState.fieldErrors = []
    validationState.warnings = []
    validationState.pending = false
    validationState.isError = false
    validationState.noData = false
    validationState.calls = []
    validationState.refetch.mockClear()
  })

  it('등록 검증 바디는 제출 바디와 같다(INFINITE·VR)', async () => {
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    expect(lastValidation()[0]).toEqual({ kind: 'create', accountId: 'account-1' })
    await act(async () => { result.current.handleSubmit(submitEvent) })
    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalledTimes(1))
    expect(lastValidation()[1]).toEqual(mockCreateMutate.mock.calls[0][0])

    act(() => result.current.setType('VR'))
    await act(async () => { result.current.handleSubmit(submitEvent) })
    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalledTimes(2))
    expect(lastValidation()[1]).toEqual(mockCreateMutate.mock.calls[1][0])
  })

  it('수정 검증은 수정 대상 경로로 제출 바디와 같은 바디를 보낸다', async () => {
    const initial = {
      id: 'strategy-1', accountId: 'account-1', type: 'INFINITE', status: 'ACTIVE', ticker: 'TSLA', cycleSeedType: 'MAX' as const,
      initialDeposit: 1200, divisionCount: 20, isReverseMode: false, cycleInProgress: true, allowedActions: ['EDIT_SEED' as const], blockedActions: [], currentHoldings: 0,
    }
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1', initial }))
    expect(lastValidation()[0]).toEqual({ kind: 'update', strategyId: 'strategy-1' })
    await act(async () => { result.current.handleSubmit(submitEvent) })
    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalledTimes(1))
    expect(lastValidation()[1]).toEqual(mockUpdateMutate.mock.calls[0][0])
  })

  it('지금 입력에 대한 서버 거절은 입력칸에 붙이고 제출을 막는다', async () => {
    validationState.fieldErrors = [{ field: 'scheduledStartDate', detail: '시작예정일은 오늘 이후여야 합니다.' }]
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    expect(result.current.submitDisabledReason).toBe('시작예정일은 오늘 이후여야 합니다.')
    expect(result.current.submitDisabledField).toBe('scheduledStart')
    let submitted = true
    await act(async () => { submitted = result.current.handleSubmit(submitEvent) })
    expect(submitted).toBe(false)
    expect(mockCreateMutate).not.toHaveBeenCalled()
  })

  it('필드를 모르는 서버 거절은 폼 하단 사유로 둔다', () => {
    validationState.fieldErrors = [{ field: 'ticker', detail: '이미 같은 종목의 전략이 있습니다.' }]
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    expect(result.current.submitDisabledReason).toBe('이미 같은 종목의 전략이 있습니다.')
    expect(result.current.submitDisabledField).toBeNull()
  })

  it('로컬 규칙 사유가 서버 거절보다 먼저 보인다', () => {
    validationState.fieldErrors = [{ field: 'initialDeposit', detail: '서버 문장' }]
    seedModelState.isBelowMinSeed = true
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    act(() => result.current.setSeedUsdInput(100))
    expect(result.current.submitDisabledReason).toBe('최소 투자금 $500.00 이상이 필요합니다.')
  })

  it.each([
    ['예수금 입력', (form: ReturnType<typeof useStrategyForm>) => form.setSeedUsdInput(100)],
    ['보유 수량 입력', (form: ReturnType<typeof useStrategyForm>) => form.setVrField('quantity', 1)],
    ['제출 시도', (form: ReturnType<typeof useStrategyForm>) => { form.handleSubmit(submitEvent) }],
  ])('등록은 %s 전까지 입력값 사유와 같은 서버 거절을 숨기고 제출은 막는다', (name, touch) => {
    seedModelState.isBelowMinSeed = true
    validationState.fieldErrors = [{ field: 'initialDeposit', detail: '서버 문장' }]
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    expect(result.current.submitDisabledReason).toBeNull()
    expect(result.current.isBelowMinSeed).toBe(false)
    expect(result.current.cannotSubmit).toBe(true)
    act(() => result.current.setVrField('avgPrice', 10))
    expect(result.current.isBelowMinSeed).toBe(false)

    act(() => touch(result.current))
    expect(result.current.isBelowMinSeed).toBe(true)
    expect(result.current.submitDisabledReason).not.toBeNull()
    expect(mockCreateMutate).not.toHaveBeenCalled()

    // 같은 유형을 다시 고르면 두고, 다른 유형으로 바꾸면 남은 입력(보유 수량)이 없을 때만 다시 숨긴다
    act(() => result.current.setType('INFINITE'))
    expect(result.current.isBelowMinSeed).toBe(true)
    act(() => result.current.setType('PRIVACY'))
    expect(result.current.isBelowMinSeed).toBe(name === '보유 수량 입력')
  })

  it.each([['ticker', '이미 같은 종목의 전략이 있습니다.'], [null, '이 증권사에서 등록할 수 없습니다.']])('입력 전에도 입력값과 무관한 서버 거절(%s)은 보인다', (field, detail) => {
    seedModelState.isInvalidSeed = true
    validationState.fieldErrors = [{ field, detail }]
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    expect(result.current.submitDisabledReason).toBe(detail)
  })

  it('VR 입력 전에는 필드 없는 자산 거절을 숨기고 종목 거절은 보인다', () => {
    seedModelState.seedUsd = 0
    validationState.fieldErrors = [{ field: null, detail: 'VR 자산 거절' }]
    const { result, rerender } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    act(() => result.current.setType('VR'))
    expect(result.current.submitDisabledReason).toBeNull()
    validationState.fieldErrors = [{ field: 'ticker', detail: '종목 거절' }]
    rerender()
    expect(result.current.submitDisabledReason).toBe('종목 거절')
  })

  it('검증 응답을 기다리는 중이거나 실패해도 제출한다 — 지난 입력의 거절로 막지 않는다', async () => {
    validationState.fieldErrors = [{ field: null, detail: '지난 입력의 거절' }]
    validationState.pending = true
    const { result, rerender } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    expect(result.current.submitDisabledReason).toBeNull()
    await act(async () => { result.current.handleSubmit(submitEvent) })
    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalledTimes(1))

    validationState.pending = false
    validationState.isError = true
    rerender()
    await act(async () => { result.current.handleSubmit(submitEvent) })
    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalledTimes(2))
  })

  it('PRIVACY 등록은 최소 시드를 판정할 서버 값이 없으면 막고, 실패면 다시 시도를 안내한다', async () => {
    seedPreviewState.data.minSeed = null
    seedPreviewState.data.basePrice = null
    validationState.isError = true
    const { result, rerender } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    act(() => result.current.setType('PRIVACY'))
    expect(result.current.seedCheck).toBe('failed')
    expect(result.current.submitDisabledReason).toBe('최소 투자금을 확인하지 못했습니다. 다시 시도해주세요.')
    await act(async () => { result.current.handleSubmit(submitEvent) })
    expect(mockCreateMutate).not.toHaveBeenCalled()
    result.current.retryValidation()
    expect(validationState.refetch).toHaveBeenCalled()

    // 응답 대기 중 — 대기 사유
    validationState.isError = false
    validationState.pending = true
    validationState.noData = true
    rerender()
    expect(result.current.seedCheck).toBe('loading')

    // 서버가 미리보기를 계산하지 못한 응답(fail-open)도 실패로 본다
    validationState.pending = false
    validationState.noData = false
    rerender()
    expect(result.current.seedCheck).toBe('failed')

    // 값이 오면 통과
    seedPreviewState.data.minSeed = 500
    rerender()
    expect(result.current.seedCheck).toBe('ok')
  })

  it('PRIVACY 등록을 서버가 거절해 파생값이 비면 최소 시드 확인 실패가 아니라 서버 사유를 보인다', () => {
    seedPreviewState.data.minSeed = null
    seedPreviewState.data.basePrice = null
    validationState.fieldErrors = [{ field: 'ticker', detail: '지원하지 않는 종목입니다.' }]
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    act(() => result.current.setType('PRIVACY'))
    expect(result.current.seedCheck).toBe('ok')
    expect(result.current.submitDisabledReason).toBe('지원하지 않는 종목입니다.')
    expect(result.current.cannotSubmit || result.current.submitDisabledReason !== null).toBe(true)
  })

  it('PRIVACY 등록도 기준표가 없으면(NO_PRIVACY_BASE) 제출을 막는다(서버가 거절하지 않는다, Q-35)', async () => {
    seedPreviewState.data.skipReason = 'NO_PRIVACY_BASE'
    seedPreviewState.data.minSeed = null
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    act(() => result.current.setType('PRIVACY'))
    expect(result.current.submitDisabledReason).toBe('P 매매표가 없어 등록할 수 없습니다.')
    await act(async () => { result.current.handleSubmit(submitEvent) })
    expect(mockCreateMutate).not.toHaveBeenCalled()
  })

  describe('PRIVACY 수정(보유 0, 시드 수정)은 등록과 같이 서버 파생값으로 판정한다', () => {
    const privacyInitial = (currentHoldings: number) => ({
      id: 'strategy-1', accountId: 'account-1', type: 'PRIVACY' as const, status: 'ACTIVE' as const, ticker: 'SOXL', cycleSeedType: 'MAX' as const,
      initialDeposit: 1200, isReverseMode: false, cycleInProgress: true, allowedActions: currentHoldings === 0 ? ['EDIT_SEED' as const] : [], blockedActions: [], currentHoldings,
    })

    it('시드를 바꿨는데 파생값이 없으면 막는다', async () => {
      seedModelState.seedUsd = 1800
      seedPreviewState.data.minSeed = null
      validationState.isError = true
      const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1', initial: privacyInitial(0) }))
      expect(result.current.seedCheck).toBe('failed')
      expect(result.current.submitDisabledReason).toBe('최소 투자금을 확인하지 못했습니다. 다시 시도해주세요.')
      await act(async () => { result.current.handleSubmit(submitEvent) })
      expect(mockUpdateMutate).not.toHaveBeenCalled()
    })

    it('시드를 바꿨는데 기준표가 없으면(NO_PRIVACY_BASE) 막는다', async () => {
      seedModelState.seedUsd = 1800
      seedPreviewState.data.skipReason = 'NO_PRIVACY_BASE'
      const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1', initial: privacyInitial(0) }))
      expect(result.current.submitDisabledReason).toBe('P 매매표가 없어 수정할 수 없습니다.')
      await act(async () => { result.current.handleSubmit(submitEvent) })
      expect(mockUpdateMutate).not.toHaveBeenCalled()
    })

    it('기준가·가용 예수금을 그대로 내준다', () => {
      seedPreviewState.data.availableCash = 3000
      const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1', initial: privacyInitial(0) }))
      expect(result.current.basePrice).toBe(100)
      expect(result.current.availableCash).toBe(3000)
      expect(result.current.seedCheck).toBe('ok')
    })

    it('시드를 그대로 두고 다른 설정만 바꾸면 검증 실패로 막지 않는다', async () => {
      seedModelState.seedUsd = 1200 // initialDeposit과 같다
      seedPreviewState.data.minSeed = null
      validationState.isError = true
      const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1', initial: privacyInitial(0) }))
      act(() => result.current.setAutoStart(false))
      expect(result.current.seedCheck).toBe('ok')
      expect(result.current.submitDisabledReason).toBeNull()
      await act(async () => { result.current.handleSubmit(submitEvent) })
      await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled())
    })

    it('시드를 그대로 두면 기준표가 없어도(NO_PRIVACY_BASE) 막지 않는다', async () => {
      seedModelState.seedUsd = 1200
      seedPreviewState.data.minSeed = null
      seedPreviewState.data.skipReason = 'NO_PRIVACY_BASE'
      const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1', initial: privacyInitial(0) }))
      expect(result.current.submitDisabledReason).toBeNull()
      await act(async () => { result.current.handleSubmit(submitEvent) })
      await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled())
    })

    it('보유가 있어 시드를 못 고치면 파생값 없이도 막지 않는다', async () => {
      seedPreviewState.data.minSeed = null
      validationState.isError = true
      const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1', initial: privacyInitial(3) }))
      expect(result.current.seedCheck).toBe('ok')
      await act(async () => { result.current.handleSubmit(submitEvent) })
      await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled())
    })
  })

  it('수정의 서버 거절은 보유·시작예정일 칸이 없으므로 폼 하단에 둔다', () => {
    validationState.fieldErrors = [{ field: 'scheduledStartDate', detail: '시작예정일은 오늘 이후여야 합니다.' }]
    const { result } = renderHook(() => useStrategyForm({
      accountId: 'account-1',
      initial: {
        id: 'strategy-1', accountId: 'account-1', type: 'INFINITE', status: 'ACTIVE', ticker: 'TSLA', cycleSeedType: 'MAX',
        initialDeposit: 1200, divisionCount: 20, isReverseMode: false, cycleInProgress: true, allowedActions: [], blockedActions: [], currentHoldings: 3,
      },
    }))
    expect(result.current.submitDisabledReason).toBe('시작예정일은 오늘 이후여야 합니다.')
    expect(result.current.submitDisabledField).toBeNull()
  })

  it('INFINITE 등록은 검증이 실패해도 최소 시드 확인으로 막지 않는다(서버가 검증한다)', () => {
    seedPreviewState.data.minSeed = null
    seedPreviewState.data.basePrice = null
    validationState.isError = true
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    expect(result.current.seedCheck).toBe('ok')
    expect(result.current.cannotSubmit).toBe(false)
    expect(result.current.validationUnavailable).toBe(true)
  })

  it('경고는 지금 입력의 결과만 내보낸다', () => {
    validationState.warnings = [{ code: 'AVAILABLE_CASH_EXCEEDED', detail: '가용 예수금 초과' }]
    const { result, rerender } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    expect(result.current.warnings).toEqual([{ code: 'AVAILABLE_CASH_EXCEEDED', detail: '가용 예수금 초과' }])
    validationState.pending = true
    rerender()
    expect(result.current.warnings).toEqual([])
  })

  it('VR 램프 "자동" 값은 메타 vrRampDefaults를 쓰고 그대로 전송한다', async () => {
    vrRampMeta.value = {
      HOLD: { initialGradient: 11, gMax: 21, initialPoolLimitRate: 0.7, poolLimitFloor: 0.4, gGraceWeeks: 52, gStepWeeks: 26, pGraceWeeks: 52, pStepWeeks: 26 },
    }
    seedModelState.seedUsd = 100000
    const { result } = renderHook(() => useStrategyForm({ accountId: 'account-1' }))
    act(() => result.current.setType('VR'))
    expect(result.current.vrRampDefaults).toMatchObject({ initialGradient: 11, gMax: 21, initialPoolLimitRate: 0.7, poolLimitFloor: 0.4 })
    await act(async () => { result.current.handleSubmit(submitEvent) })
    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalled())
    expect(mockCreateMutate).toHaveBeenCalledWith(expect.objectContaining({ initialGradient: 11, gMax: 21, initialPoolLimitRate: 0.7, poolLimitFloor: 0.4 }))
  })

  it('DCA 수정은 이 폼의 검증을 부르지 않는다(DcaStrategyForm이 따로 부른다)', () => {
    renderHook(() => useStrategyForm({
      accountId: 'account-1',
      initial: {
        id: 'd1', accountId: 'account-1', type: 'DCA', status: 'ACTIVE', ticker: 'QLD', cycleSeedType: 'NONE',
        isReverseMode: false, cycleInProgress: true, allowedActions: [], blockedActions: [],
      },
    }))
    expect(lastValidation()[2].enabled).toBe(false)
  })
})

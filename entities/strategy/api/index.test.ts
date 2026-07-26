import { describe, expect, it, vi } from 'vitest'

const fetchEitherMock = vi.fn()

vi.mock('@shared/lib/api-client', () => ({
  fetchEither: (...args: unknown[]) => fetchEitherMock(...args),
  clientFetch: vi.fn(),
  jsonBody: (method: string, body: unknown) => ({ method, body: JSON.stringify(body) }),
}))

vi.mock('@shared/lib/utils', () => ({
  toNum: (value: unknown) => Number(value),
}))

describe('strategy api normalization', () => {
  it('normalizes VR summary numbers including ramp fields, and preserves null divisionCount as undefined-like UI data', async () => {
    const { listStrategies } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce([
      {
        id: 'strategy-1',
        accountId: 'account-1',
        type: 'VR',
        status: 'ACTIVE',
        ticker: 'TQQQ',
        initialUsdDeposit: '2000.00',
        cycleSeedType: 'NONE',
        divisionCount: null,
        isReverseMode: false,
        currentRound: null,
        currentHoldings: 4,
        startDate: '2026-08-01',
        vr: {
          value: '3000.00',
          bandWidth: '15.00',
          intervalWeeks: 4,
          recurringAmount: 0,
          poolLimit: '1000.00',
          gradient: 18,
          initialGradient: 10,
          gGraceWeeks: 52,
          gStepWeeks: 26,
          gMax: 20,
          initialPoolLimitRate: '0.75',
          pGraceWeeks: 52,
          pStepWeeks: 26,
          poolLimitFloor: '0.50',
        },
      },
    ])

    const result = await listStrategies('account-1')

    expect(result[0]).toEqual(expect.objectContaining({
      type: 'VR',
      ticker: 'TQQQ',
      divisionCount: undefined,
      currentHoldings: 4,
      startDate: '2026-08-01',
      vr: {
        value: 3000,
        bandWidth: 15,
        intervalWeeks: 4,
        recurringAmount: 0,
        poolLimit: 1000,
        gradient: 18,
        initialGradient: 10,
        gGraceWeeks: 52,
        gStepWeeks: 26,
        gMax: 20,
        initialPoolLimitRate: 0.75,
        pGraceWeeks: 52,
        pStepWeeks: 26,
        poolLimitFloor: 0.5,
      },
    }))
  })
})

describe('reconfigureVr', () => {
  it('PUT /api/trading-cycles/{id}/vr-config 로 요청하고 응답을 정규화한다', async () => {
    const { reconfigureVr } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({
      id: 'strategy-1',
      accountId: 'account-1',
      type: 'VR',
      status: 'ACTIVE',
      ticker: 'TQQQ',
      cycleSeedType: 'NONE',
      isReverseMode: false,
      startDate: '2026-08-01',
      vr: {
        value: '3200.00',
        bandWidth: '20.00',
        intervalWeeks: 4,
        recurringAmount: 0,
        poolLimit: '1200.00',
        gradient: 10,
        initialGradient: 10,
        gGraceWeeks: 52,
        gStepWeeks: 26,
        gMax: 20,
        initialPoolLimitRate: '0.75',
        pGraceWeeks: 52,
        pStepWeeks: 26,
        poolLimitFloor: '0.50',
      },
    })

    const result = await reconfigureVr('strategy-1', { bandWidth: 20 })

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/trading-cycles/strategy-1/vr-config',
      { method: 'PUT', body: JSON.stringify({ bandWidth: 20 }) },
      undefined,
    )
    expect(result.vr?.bandWidth).toBe(20)
    expect(result.startDate).toBe('2026-08-01')
  })
})

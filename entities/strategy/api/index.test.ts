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
          poolLimitRate: '0.75',
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
        poolLimitRate: 0.75,
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

describe('DCA api', () => {
  it('DCA 응답의 dca 객체를 정규화한다 (금액 문자열 → number, 말일 null 유지)', async () => {
    const { listStrategies } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce([{
      id: 's1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false,
      currentHoldings: 12,
      dca: {
        direction: 'BUY', amountUsd: '300.00', orderType: 'MOC', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null,
        conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: '35' }, { indicator: 'SMA', operator: 'LT', threshold: null, smaPeriod: 200 }],
        nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' },
        lastExecution: null,
      },
    }])
    const [s] = await listStrategies('a1')
    expect(s.dca).toEqual({
      direction: 'BUY', amountUsd: 300, orderType: 'MOC', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null,
      conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 35 }, { indicator: 'SMA', operator: 'LT', smaPeriod: 200 }],
      nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' },
      lastExecution: null,
    })
  })

  it('알 수 없는 dayOfWeek 값은 null로 버린다', async () => {
    const { listStrategies } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce([
      { id: 's3', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false,
        dca: { direction: 'BUY', amountUsd: 100, orderType: 'MOC', frequency: 'WEEKLY', dayOfWeek: 'SATURDAY', dayOfMonth: null, conditions: [] } },
      { id: 's4', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false,
        dca: { direction: 'BUY', amountUsd: 100, orderType: 'MOC', frequency: 'WEEKLY', dayOfWeek: 'FRIDAY', dayOfMonth: null, conditions: [] } },
    ])
    const [unknown, friday] = await listStrategies('a1')
    expect(unknown.dca?.dayOfWeek).toBeNull()
    expect(friday.dca?.dayOfWeek).toBe('FRIDAY')
  })

  it('비DCA 응답은 dca undefined', async () => {
    const { listStrategies } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce([{ id: 's2', accountId: 'a1', type: 'INFINITE', status: 'ACTIVE', ticker: 'TQQQ', cycleSeedType: 'MAX', isReverseMode: false, dca: null }])
    const [s] = await listStrategies('a1')
    expect(s.dca).toBeUndefined()
  })

  it('reconfigureDca는 PUT /dca-config로 dca 객체만 보낸다', async () => {
    const { reconfigureDca } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ id: 's1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false, dca: null })
    const body = { direction: 'BUY' as const, amountUsd: 100, orderType: 'MOO' as const, frequency: 'DAILY' as const, dayOfWeek: null, dayOfMonth: null, conditions: [] }
    await reconfigureDca('s1', body)
    expect(fetchEitherMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/api/trading-cycles/s1/dca-config'),
      { method: 'PUT', body: JSON.stringify(body) },
      undefined,
    )
  })

  it('listDcaExecutions는 page·size 쿼리로 조회하고 숫자를 정규화한다', async () => {
    const { listDcaExecutions } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ content: [
      { kstTradeDate: '2026-09-30', usSessionDate: '2026-09-29', status: 'ORDERED', skipReason: null, detail: null, referencePrice: null, quantity: 3, order: { id: 'o1', status: 'FILLED', filledQuantity: 3, filledPrice: '87.40' } },
      { kstTradeDate: '2026-08-29', usSessionDate: '2026-08-28', status: 'SKIPPED', skipReason: 'CONDITION_NOT_MET', detail: 'RSI(14) 48.20 > 35', referencePrice: '86.50', quantity: null, order: null },
    ], page: 0, size: 20, totalElements: 2 })
    const res = await listDcaExecutions('s1', 0, 20)
    expect(fetchEitherMock).toHaveBeenLastCalledWith('/api/trading-cycles/s1/dca-executions?page=0&size=20', undefined, undefined)
    // referencePrice는 주문 기준가(매수: max(전일 종가, 배치 시점 현재가), 매도: 전일 종가) — null은 기존 주문 복구 경로의 ORDERED 행뿐(content[0]이 그 경우)
    expect(res.content[0]).toMatchObject({ referencePrice: undefined, quantity: 3, order: { filledPrice: 87.4 } })
    expect(res.content[1]).toMatchObject({ referencePrice: 86.5, quantity: undefined, order: null })
    expect(res.totalElements).toBe(2)
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
        poolLimitRate: '0.75',
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

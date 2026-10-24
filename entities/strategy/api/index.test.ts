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
  const rawRule = { ruleKey: 'k1', direction: 'BUY', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOC', sizing: { type: 'AMOUNT', amount: '300.00', percent: null }, shortfall: 'PARTIAL', conditions: [], nextExecution: null, lastExecution: null }
  const dcaOf = async (rule: Record<string, unknown>, top: Record<string, unknown> = {}) => {
    const { listStrategies } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce([{ id: 's9', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false, dca: { rules: [{ ...rawRule, ...rule }], currentHoldings: null, avgPrice: null, ...top } }])
    return (await listStrategies('a1'))[0].dca
  }

  it('DCA 응답의 rules를 정규화한다 (BigDecimal 문자열 → number, 말일 null 유지)', async () => {
    const dca = await dcaOf({
      ruleKey: 'k1', direction: 'SELL', sizing: { type: 'HOLDING_PERCENT', amount: null, percent: '50.00' }, shortfall: 'REJECT',
      conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: '35' }, { indicator: 'SMA', operator: 'LT', threshold: null, smaPeriod: 200 }],
      nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' },
      lastExecution: { kstTradeDate: '2026-10-21', status: 'SKIPPED', skipReason: 'INSUFFICIENT_HOLDINGS' },
    }, { currentHoldings: '0.12345678', avgPrice: '4100000' })
    expect(dca?.currentHoldings).toBe(0.12345678)
    expect(dca?.avgPrice).toBe(4100000)
    expect(dca?.rules).toEqual([{
      ruleKey: 'k1', direction: 'SELL', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOC', executionHour: null,
      sizing: { type: 'HOLDING_PERCENT', amount: null, percent: 50 }, shortfall: 'REJECT',
      conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 35 }, { indicator: 'SMA', operator: 'LT', smaPeriod: 200 }],
      nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' },
      lastExecution: { kstTradeDate: '2026-10-21', status: 'SKIPPED', skipReason: 'INSUFFICIENT_HOLDINGS' },
    }])
  })

  it('AMOUNT 규모는 amount를 number로, 보유·평단 null은 null 유지', async () => {
    const dca = await dcaOf({})
    expect(dca?.rules[0].sizing).toEqual({ type: 'AMOUNT', amount: 300, percent: null })
    expect(dca?.currentHoldings).toBeNull()
    expect(dca?.avgPrice).toBeNull()
  })

  it('알 수 없는 dayOfWeek 값은 null로 버린다', async () => {
    expect((await dcaOf({ frequency: 'WEEKLY', dayOfWeek: 'FUNDAY' }))?.rules[0].dayOfWeek).toBeNull()
    expect((await dcaOf({ frequency: 'WEEKLY', dayOfWeek: 'FRIDAY' }))?.rules[0].dayOfWeek).toBe('FRIDAY')
  })

  it('executionHour 0은 null이 아니라 0으로 유지한다', async () => {
    expect((await dcaOf({ executionHour: 0 }))?.rules[0].executionHour).toBe(0)
    expect((await dcaOf({}))?.rules[0].executionHour).toBeNull()
  })

  it('주말 요일과 MARKET 주문 유형을 받는다', async () => {
    const rule = (await dcaOf({ frequency: 'WEEKLY', dayOfWeek: 'SUNDAY', orderType: 'MARKET' }))?.rules[0]
    expect(rule?.dayOfWeek).toBe('SUNDAY')
    expect(rule?.orderType).toBe('MARKET')
  })

  it('비DCA 응답은 dca undefined', async () => {
    const { listStrategies } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce([{ id: 's2', accountId: 'a1', type: 'INFINITE', status: 'ACTIVE', ticker: 'TQQQ', cycleSeedType: 'MAX', isReverseMode: false, dca: null }])
    const [s] = await listStrategies('a1')
    expect(s.dca).toBeUndefined()
  })

  it('reconfigureDca는 PUT /dca-config로 rules 객체만 보낸다', async () => {
    const { reconfigureDca } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ id: 's1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false, dca: null })
    const body = { rules: [{ ruleKey: null, direction: 'BUY' as const, frequency: 'DAILY' as const, dayOfWeek: null, dayOfMonth: null, orderType: 'MOO' as const, sizing: { type: 'AMOUNT' as const, amount: 100, percent: null }, shortfall: 'PARTIAL' as const, conditions: [] }] }
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
      { ruleKey: 'k1', direction: 'BUY', kstTradeDate: '2026-09-30', usSessionDate: '2026-09-29', status: 'ORDERED', skipReason: null, detail: null, referencePrice: null, quantity: 3, order: { id: 'o1', status: 'FILLED', filledQuantity: 3, filledPrice: '87.40' } },
      { ruleKey: 'k2', direction: 'SELL', kstTradeDate: '2026-08-29', usSessionDate: '2026-08-28', status: 'SKIPPED', skipReason: 'CONDITION_NOT_MET', detail: 'RSI(14) 48.20 > 35', referencePrice: '86.50', quantity: null, order: null },
    ], page: 0, size: 20, totalElements: 2 })
    const res = await listDcaExecutions('s1', 0, 20)
    expect(fetchEitherMock).toHaveBeenLastCalledWith('/api/trading-cycles/s1/dca-executions?page=0&size=20', undefined, undefined)
    // referencePrice는 주문 기준가(매수: max(전일 종가, 배치 시점 현재가), 매도: 전일 종가) — null은 기존 주문 복구 경로의 ORDERED 행뿐(content[0]이 그 경우)
    expect(res.content[1]).toMatchObject({ ruleKey: 'k2', direction: 'SELL' })
    expect(res.content[0]).toMatchObject({ ruleKey: 'k1', direction: 'BUY', referencePrice: undefined, quantity: 3, order: { filledPrice: 87.4 } })
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

  it('getStrategySeedPreview는 availableCash를 숫자로 정규화하고 없으면 null이다', async () => {
    const { getStrategySeedPreview } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ ticker: 'TQQQ', basePrice: '50', minSeed: '1000', skipReason: null, availableCash: '1234.5' })
    expect((await getStrategySeedPreview('a1', { type: 'INFINITE', ticker: 'TQQQ', divisionCount: 40 })).availableCash).toBe(1234.5)

    fetchEitherMock.mockResolvedValueOnce({ ticker: 'TQQQ', basePrice: null, minSeed: null, skipReason: null })
    expect((await getStrategySeedPreview('a1', { type: 'INFINITE', ticker: 'TQQQ', divisionCount: 40 })).availableCash).toBeNull()
  })
})

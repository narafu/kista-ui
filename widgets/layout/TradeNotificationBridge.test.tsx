import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider, type QueryKey } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import { TradeNotificationBridge } from './TradeNotificationBridge'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: { custom: vi.fn() },
}))

// vitest.setup.ts의 MockEventSource 참조
declare const EventSource: {
  instances: Array<{ emit: (type: string, data: string) => void }>
}

const INVALIDATED: QueryKey[] = [
  tradeKeys.accountCycleHistory('a1', { size: 20 }),
  tradeKeys.strategyCycleHistory('s1', null),
  tradeKeys.dailyRange(['a2', 'a1'], '2026-01-01', '2026-01-31'),
  orderKeys.preview('s1'),
  orderKeys.history('s1', '2026-01-01', '2026-01-31'),
  statsKeys.summary(),
  statsKeys.equityCurve('2026-01-01', '2026-02-01', 'ACCOUNT'),
  statsKeys.cycles({ accountId: 'a1', page: 2 }),
  statsKeys.housingComparison({ scope: 'PORTFOLIO', benchmarkType: 'HOUSING', regionCode: '11' }),
  statsKeys.housingComparison({ scope: 'STRATEGY', strategyId: 's1', benchmarkType: 'ETF', symbol: 'SPY' }),
]

const PRESERVED: QueryKey[] = [
  statsKeys.housingSeries('2026-01-01', '2026-02-01', '11'),
  statsKeys.housingPriceIndexSeries(),
  statsKeys.etfPriceSeries(undefined, undefined, 'SPY'),
  statsKeys.housingRegions(),
]

describe('TradeNotificationBridge', () => {
  it('trade 이벤트 수신 시 체결 관련 키만 무효화하고 stats 시장·참조 키는 남긴다', () => {
    EventSource.instances = []
    const client = new QueryClient()
    for (const key of [...INVALIDATED, ...PRESERVED]) client.setQueryData(key, {})
    render(
      <QueryClientProvider client={client}>
        <TradeNotificationBridge />
      </QueryClientProvider>,
    )

    EventSource.instances[0].emit('trade', JSON.stringify({ kind: 'BUY', ticker: 'TQQQ', time: 't', accountNickname: '계좌1' }))

    for (const key of INVALIDATED) expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(true)
    for (const key of PRESERVED) expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(false)
  })
})

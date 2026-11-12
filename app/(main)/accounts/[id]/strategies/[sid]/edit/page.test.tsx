import { HydrationBoundary } from '@tanstack/react-query'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { strategyKeys } from '@entities/strategy'
import { mockApi } from '@testing/mockApi'
import EditStrategyPage from './page'

// 서버 요청 컨텍스트(쿠키)는 단위 테스트에 없어 next/headers만 대신한다 — 데이터는 mockApi가 받는다
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'server-token' }) }) }))

function findBoundary(node: ReactNode): ReactElement<{ state: { queries: Array<{ queryKey: unknown; state: { data: unknown } }> } }> | undefined {
  if (!isValidElement<{ children?: ReactNode }>(node)) return undefined
  if (node.type === HydrationBoundary) return node as never
  return findBoundary(node.props.children)
}

describe('EditStrategyPage', () => {
  it('seeds the strategy detail cache so the form reads trade-sensitive fields from React Query on first paint', async () => {
    const strategy = { id: 'strategy-1', accountId: 'account-1', ticker: 'TQQQ', type: 'INFINITE', status: 'ACTIVE', currentHoldings: 2 }
    vi.stubEnv('TRADING_API_BASE_URL', 'http://api.test')
    mockApi({
      'GET /api/accounts': [{ id: 'account-1', nickname: 'main', accountNoMasked: '1-***', broker: 'KIS' }],
      'GET /api/accounts/{accountId}/trading-cycles': [strategy],
    } as never)

    const element = await EditStrategyPage({ params: Promise.resolve({ id: 'account-1', sid: 'strategy-1' }) })

    const seeded = findBoundary(element)?.props.state.queries.find(
      (query) => JSON.stringify(query.queryKey) === JSON.stringify(strategyKeys.detail('strategy-1')),
    )
    expect(seeded?.state.data).toMatchObject({ id: 'strategy-1', ticker: 'TQQQ', currentHoldings: 2 })
  })
})

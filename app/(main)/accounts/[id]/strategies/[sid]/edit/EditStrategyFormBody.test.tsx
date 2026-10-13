import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { strategyKeys } from '@entities/strategy'
import { EditStrategyFormBody } from './EditStrategyFormBody'

const { loadMock } = vi.hoisted(() => ({ loadMock: vi.fn() }))

vi.mock('@shared/lib/auth/token', () => ({
  requirePageToken: async (params: Promise<unknown>) => ({ params: await params, token: 'server-token' }),
}))
vi.mock('next/navigation', () => ({ notFound: vi.fn() }))
vi.mock('@widgets/page-header', () => ({ PageHeader: () => null }))
vi.mock('@features/strategy/create-strategy', () => ({
  StrategyFormPage: () => null,
  loadAccountAndStrategyForEdit: loadMock,
}))

describe('EditStrategyFormBody', () => {
  it('seeds the strategy detail cache so the form reads trade-sensitive fields from React Query on first paint', async () => {
    const strategy = { id: 'strategy-1', accountId: 'account-1', ticker: 'TQQQ', currentHoldings: 2 }
    loadMock.mockResolvedValue({ account: { id: 'account-1', broker: 'KIS' }, strategy })

    const element = (await EditStrategyFormBody({
      params: Promise.resolve({ id: 'account-1', sid: 'strategy-1' }),
    })) as ReactElement<{ state: { queries: Array<{ queryKey: unknown; state: { data: unknown } }> } }>

    const seeded = element.props.state.queries.find(
      (query) => JSON.stringify(query.queryKey) === JSON.stringify(strategyKeys.detail('strategy-1')),
    )
    expect(seeded?.state.data).toEqual(strategy)
  })
})

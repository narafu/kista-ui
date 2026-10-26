import { describe, expect, it } from 'vitest'
import { sortMockLast } from './sortAccounts'

describe('sortMockLast', () => {
  it('moves mock accounts last while keeping order within real and mock groups', () => {
    const accounts = [
      { id: 'm1', broker: 'MOCK' as const },
      { id: 'k1', broker: 'KIS' as const },
      { id: 'm2', broker: 'MOCK' as const },
      { id: 'u1', broker: 'UPBIT' as const },
    ]

    expect(sortMockLast(accounts).map((a) => a.id)).toEqual(['k1', 'u1', 'm1', 'm2'])
  })

  it('does not mutate the input', () => {
    const accounts = [{ broker: 'MOCK' as const }, { broker: 'KIS' as const }]
    sortMockLast(accounts)
    expect(accounts[0].broker).toBe('MOCK')
  })
})

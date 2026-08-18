import { describe, expect, it } from 'vitest'
import { financeKeys } from './queryKeys'

describe('financeKeys', () => {
  it('keeps each resource list key under the finance root', () => {
    expect(financeKeys.all).toEqual(['finance'])
    expect(financeKeys.assetSnapshots()).toEqual(['finance', 'asset-snapshots', 'list'])
    expect(financeKeys.categories()).toEqual(['finance', 'categories', 'list'])
    expect(financeKeys.accounts()).toEqual(['finance', 'accounts', 'list'])
    expect(financeKeys.monthlyClosings()).toEqual(['finance', 'monthly-closings', 'list'])
  })
})

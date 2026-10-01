import { describe, expect, it } from 'vitest'
import { financeKeys } from './queryKeys'

describe('financeKeys', () => {
  it('keeps each resource list key under the finance root without a group segment', () => {
    expect(financeKeys.all).toEqual(['finance'])
    expect(financeKeys.assetSnapshots()).toEqual(['finance', 'asset-snapshots', 'list'])
    expect(financeKeys.categories('ASSET')).toEqual(['finance', 'categories', 'ASSET', 'list'])
    expect(financeKeys.accounts()).toEqual(['finance', 'accounts', 'list'])
    expect(financeKeys.monthlyClosings()).toEqual(['finance', 'monthly-closings', 'list'])
    expect(financeKeys.transactions('2026-01-01', '2026-12-31')).toEqual(['finance', 'transactions', '2026-01-01', '2026-12-31', 'list'])
    expect(financeKeys.budgets()).toEqual(['finance', 'budgets', 'list'])
  })

  it('exposes group and group-members list keys', () => {
    expect(financeKeys.groups()).toEqual(['finance', 'groups', 'list'])
    expect(financeKeys.groupMembers('g1')).toEqual(['finance', 'groups', 'g1', 'members'])
  })

  it('scopes system category keys under a separate namespace from group-scoped categories', () => {
    expect(financeKeys.systemCategoriesRoot()).toEqual(['finance', 'system-categories'])
    expect(financeKeys.systemCategories('ASSET')).toEqual(['finance', 'system-categories', 'ASSET', 'list'])
  })
})

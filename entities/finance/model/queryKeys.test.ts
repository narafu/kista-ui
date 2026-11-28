import { describe, expect, it } from 'vitest'
import { financeKeys } from './queryKeys'

describe('financeKeys', () => {
  it('keeps each resource list key under the finance root without a group segment', () => {
    expect(financeKeys.all).toEqual(['finance'])
    expect(financeKeys.assetSnapshots('2026-08')).toEqual(['finance', 'asset-snapshots', 'list', '2026-08'])
    expect(financeKeys.categories('ASSET')).toEqual(['finance', 'categories', 'ASSET', 'list'])
    expect(financeKeys.accounts()).toEqual(['finance', 'accounts', 'list'])
    expect(financeKeys.monthlyClosings()).toEqual(['finance', 'monthly-closings', 'list'])
    const params = { from: '2026-01-01', to: '2026-12-31', type: 'EXPENSE' as const, sort: 'amount,desc' }
    expect(financeKeys.transactions(params)).toEqual(['finance', 'transactions', 'list', params])
    // 최신 거래 조회는 transactionsRoot 아래라 거래 mutation 무효화에 함께 걸린다
    expect(financeKeys.latestTransaction('2025-09-01', '2026-08-31')).toEqual(['finance', 'transactions', 'latest', '2025-09-01', '2026-08-31'])
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

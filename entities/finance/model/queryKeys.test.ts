import { describe, expect, it } from 'vitest'
import { financeKeys } from './queryKeys'

describe('financeKeys', () => {
  it('keeps each resource list key under the finance root, scoped to the personal group by default', () => {
    expect(financeKeys.all).toEqual(['finance'])
    expect(financeKeys.assetSnapshots()).toEqual(['finance', 'asset-snapshots', 'personal', 'list'])
    expect(financeKeys.categories('ASSET')).toEqual(['finance', 'categories', 'ASSET', 'personal', 'list'])
    expect(financeKeys.accounts()).toEqual(['finance', 'accounts', 'personal', 'list'])
    expect(financeKeys.monthlyClosings()).toEqual(['finance', 'monthly-closings', 'personal', 'list'])
  })

  it('scopes each resource list key to the given group', () => {
    const groupId = 'g1'
    expect(financeKeys.assetSnapshots(groupId)).toEqual(['finance', 'asset-snapshots', groupId, 'list'])
    expect(financeKeys.categories('INCOME', groupId)).toEqual(['finance', 'categories', 'INCOME', groupId, 'list'])
    expect(financeKeys.accounts(groupId)).toEqual(['finance', 'accounts', groupId, 'list'])
    expect(financeKeys.monthlyClosings(groupId)).toEqual(['finance', 'monthly-closings', groupId, 'list'])
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

import { describe, expect, it } from 'vitest'

import { adminKeys } from './queryKeys'

describe('adminKeys', () => {
  it('keeps distinct normalized user date ranges in separate cache entries', () => {
    expect(adminKeys.users(undefined, { from: '2026-07-01', to: '2026-07-31' }))
      .toEqual(['admin', 'users', 'ALL', '2026-07-01', '2026-07-31'])
    expect(adminKeys.users(undefined, { to: '2026-07-31', from: '2026-07-01' }))
      .toEqual(['admin', 'users', 'ALL', '2026-07-01', '2026-07-31'])
    expect(adminKeys.users()).toEqual(['admin', 'users', 'ALL', '', ''])
  })
})

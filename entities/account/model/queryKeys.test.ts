import { describe, expect, it } from 'vitest'

import { accountKeys } from './queryKeys'

describe('accountKeys', () => {
  it('keeps list and detail keys under the account root', () => {
    expect(accountKeys.all).toEqual(['accounts'])
    expect(accountKeys.list()).toEqual(['accounts', 'list'])
    expect(accountKeys.detail('a1')).toEqual(['accounts', 'detail', 'a1'])
    expect(accountKeys.margin('a1')).toEqual(['accounts', 'margin', 'a1'])
    expect(accountKeys.prices('a1', ['SOXL'])).toEqual(['accounts', 'prices', 'a1', 'SOXL'])
  })

  it('sorts ticker identifiers before serializing price keys', () => {
    expect(accountKeys.prices('a1', ['TQQQ', 'SOXL'])).toEqual(accountKeys.prices('a1', ['SOXL', 'TQQQ']))
  })
})

import { describe, expect, it } from 'vitest'
import { buildQueryString } from './query-string'

describe('buildQueryString', () => {
  it('returns empty string when no params', () => {
    expect(buildQueryString({})).toBe('')
  })

  it('omits undefined and empty string values', () => {
    expect(buildQueryString({ a: undefined, b: '', c: 'x' })).toBe('?c=x')
  })

  it('keeps 0 as a valid value', () => {
    expect(buildQueryString({ size: 0 })).toBe('?size=0')
  })

  it('joins multiple params', () => {
    expect(buildQueryString({ from: '2026-01-01', to: '2026-02-01' })).toBe('?from=2026-01-01&to=2026-02-01')
  })
})

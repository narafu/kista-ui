import { describe, expect, it } from 'vitest'
import { hasWarning } from './warnings'

describe('hasWarning', () => {
  it('finds a warning by code and is false for undefined preview or other codes', () => {
    const preview = { warnings: [{ code: 'BUY_UNPLACED' as const, detail: '미접수' }] }

    expect(hasWarning(preview, 'BUY_UNPLACED')).toBe(true)
    expect(hasWarning(preview, 'SELL_UNPLACED')).toBe(false)
    expect(hasWarning(undefined, 'BUY_UNPLACED')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { orderStatusBadgeClass } from './status-badge'

describe('orderStatusBadgeClass', () => {
  it.each([
    ['PLACED', 'info'],
    ['FILLED', 'status-ok'],
    ['PARTIALLY_FILLED', 'warn'],
    ['FAILED', 'status-error'],
    ['SUBMITTING', 'warn'],
  ])('%s uses the %s semantic token', (status, token) => {
    expect(orderStatusBadgeClass(status)).toContain(token)
  })

  it.each(['CANCELLED', 'PLANNED'])('%s falls back to the muted token', (status) => {
    expect(orderStatusBadgeClass(status)).toContain('muted')
  })

  it('unknown status falls back to the muted token', () => {
    expect(orderStatusBadgeClass('SOME_UNKNOWN_STATUS')).toContain('muted')
  })
})

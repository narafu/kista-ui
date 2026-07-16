import { describe, expect, it } from 'vitest'
import { orderStatusBadgeClass, orderTypeBadgeClass, ORDER_STATUS_LABEL } from './status-badge'

describe('orderStatusBadgeClass', () => {
  it.each([
    ['PLACED', 'info'],
    ['FILLED', 'status-ok'],
    ['PARTIALLY_FILLED', 'warn'],
    ['FAILED', 'status-error'],
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

describe('ORDER_STATUS_LABEL', () => {
  it('maps every known status to its Korean label', () => {
    expect(ORDER_STATUS_LABEL).toEqual({
      PLACED: '접수',
      FILLED: '체결',
      PARTIALLY_FILLED: '부분체결',
      FAILED: '실패',
      CANCELLED: '취소',
      PLANNED: '예정',
    })
  })
})

describe('orderTypeBadgeClass', () => {
  it.each([
    ['LOC', 'info'],
    ['MOC', 'warn'],
    ['LIMIT', 'muted'],
  ])('%s uses the %s semantic token', (orderType, token) => {
    expect(orderTypeBadgeClass(orderType)).toContain(token)
  })

  it('unknown order type falls back to the muted token', () => {
    expect(orderTypeBadgeClass('UNKNOWN')).toContain('muted')
  })
})

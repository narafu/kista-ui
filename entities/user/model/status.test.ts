import { describe, expect, it } from 'vitest'
import type { UserStatus } from './types'
import { USER_STATUS_LABEL, ADMIN_USER_STATUS_LABEL, USER_STATUS_TONE, userStatusColorVar } from './status'

describe('USER_STATUS_LABEL', () => {
  it('maps every user status to its label for user own screen', () => {
    expect(USER_STATUS_LABEL).toEqual({
      ACTIVE: '활성',
      PENDING: '대기',
      REJECTED: '반려',
    })
  })
})

describe('ADMIN_USER_STATUS_LABEL', () => {
  it('maps every user status to its label for admin screen', () => {
    expect(ADMIN_USER_STATUS_LABEL).toEqual({
      ACTIVE: '승인',
      PENDING: '대기',
      REJECTED: '거절',
    })
  })
})

describe('USER_STATUS_TONE', () => {
  it('maps every user status to its semantic tone', () => {
    expect(USER_STATUS_TONE).toEqual({
      ACTIVE: 'ok',
      PENDING: 'warn',
      REJECTED: 'error',
    })
  })
})

describe('userStatusColorVar', () => {
  it.each([
    ['ACTIVE', 'var(--status-ok)'],
    ['PENDING', 'var(--warn)'],
    ['REJECTED', 'var(--status-error)'],
  ])('%s returns the %s CSS variable', (status, expected) => {
    expect(userStatusColorVar(status as UserStatus)).toBe(expected)
  })
})

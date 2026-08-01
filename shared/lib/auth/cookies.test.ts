import { describe, it, expect } from 'vitest'
import {
  KISTA_TOKEN_COOKIE,
  STATUS_COOKIE,
  ROLE_COOKIE,
  RT_COOKIE,
  CLEAR_COOKIE,
} from './cookies'

describe('Cookie constants', () => {
  it('should have correct cookie names (session stability)', () => {
    // These values MUST never change — they are baked into user sessions
    expect(KISTA_TOKEN_COOKIE).toBe('kista-token')
    expect(STATUS_COOKIE).toBe('kista-user-status')
    expect(ROLE_COOKIE).toBe('kista-user-role')
    expect(RT_COOKIE).toBe('refresh_token')
  })

  it('should have correct clear cookie options', () => {
    expect(CLEAR_COOKIE).toEqual({ maxAge: 0, path: '/' })
    expect(CLEAR_COOKIE.maxAge).toBe(0)
    expect(CLEAR_COOKIE.path).toBe('/')
  })
})

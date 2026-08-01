import { afterEach, describe, expect, it, vi } from 'vitest'
import { getApiBaseUrl, getApiBaseUrlOrNull } from './env'

describe('getApiBaseUrl', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('API_BASE_URL을 우선한다', () => {
    vi.stubEnv('API_BASE_URL', 'http://internal:8080')
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://public.example')
    expect(getApiBaseUrl()).toBe('http://internal:8080')
  })

  it('API_BASE_URL이 없으면 NEXT_PUBLIC으로 폴백한다', () => {
    vi.stubEnv('API_BASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://public.example')
    expect(getApiBaseUrl()).toBe('https://public.example')
  })

  it('둘 다 없으면 throw / OrNull은 null', () => {
    vi.stubEnv('API_BASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '')
    expect(() => getApiBaseUrl()).toThrow('API_BASE_URL is not configured')
    expect(getApiBaseUrlOrNull()).toBeNull()
  })
})

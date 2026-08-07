import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

function makeRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost:3000/auth/callback${query}`, {
    headers: { host: 'localhost:3000' },
  })
}

function stubKakaoCallback(status: string) {
  return vi.fn(async () =>
    new Response(JSON.stringify({ accessToken: 'at-1', user: { status } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('/auth/callback GET', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('code가 없으면 /login?error=no_code로 보낸다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    const res = await GET(makeRequest(''))
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('error')).toBe('no_code')
  })

  it('code가 없어도 state(next)가 안전하면 /login?next=...를 함께 보낸다 — 재시도 시 원래 목적지 보존', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    const res = await GET(makeRequest('?state=%2Faccounts%2Fnew'))
    const location = new URL(res.headers.get('location')!)
    expect(location.searchParams.get('next')).toBe('/accounts/new')
  })

  it('ACTIVE + 안전한 state면 하드코딩된 /dashboard 대신 state 경로로 리다이렉트한다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', stubKakaoCallback('ACTIVE'))
    const res = await GET(makeRequest('?code=abc&state=%2Faccounts%2Fnew'))
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/accounts/new')
  })

  it('ACTIVE + state 없으면 기존처럼 /dashboard로 리다이렉트한다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', stubKakaoCallback('ACTIVE'))
    const res = await GET(makeRequest('?code=abc'))
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/dashboard')
  })

  it('ACTIVE + 외부 도메인을 가리키는 state는 오픈 리다이렉트로 악용되지 못하고 /dashboard로 대체된다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', stubKakaoCallback('ACTIVE'))
    const res = await GET(makeRequest('?code=abc&state=https%3A%2F%2Fevil.com'))
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/dashboard')
    expect(location.host).not.toBe('evil.com')
  })

  // 로그인 페이지를 거치지 않고 카카오 authorize URL의 state를 직접 조작해도(dot-segment 정규화 우회
  // 시도) 콜백 단독 검증만으로 오픈 리다이렉트가 막혀야 한다 — safeRedirectPath 회귀 테스트 참고
  it('ACTIVE + dot-segment로 //evil.com이 되는 state는 /dashboard로 대체된다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', stubKakaoCallback('ACTIVE'))
    const res = await GET(makeRequest('?code=abc&state=%2F.%2F%2Fevil.com'))
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/dashboard')
    expect(location.host).not.toBe('evil.com')
  })

  it('PENDING은 state가 있어도 /pending으로 고정 리다이렉트한다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', stubKakaoCallback('PENDING'))
    const res = await GET(makeRequest('?code=abc&state=%2Faccounts%2Fnew'))
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/pending')
  })

  it('kista-api 호출이 실패하면 /login?error=auth_failed에 next를 실어 재시도 목적지를 보존한다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })))
    const res = await GET(makeRequest('?code=abc&state=%2Faccounts%2Fnew'))
    const location = new URL(res.headers.get('location')!)
    expect(location.searchParams.get('error')).toBe('auth_failed')
    expect(location.searchParams.get('next')).toBe('/accounts/new')
  })
})

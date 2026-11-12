import { describe, expect, it } from 'vitest'
import { apiError, mockApi } from './mockApi'

describe('mockApi', () => {
  it('경로 템플릿에 맞는 요청에 등록한 응답을 주고 요청을 기록한다', async () => {
    const api = mockApi({
      'GET /api/accounts': [],
      'PUT /api/accounts/{id}/credentials': (req) => ({ id: req.params.id }) as never,
    })

    await expect(fetch('/api/accounts').then((r) => r.json())).resolves.toEqual([])
    const res = await fetch('http://api:8080/api/accounts/a%201/credentials?x=1', { method: 'PUT', body: JSON.stringify({ appKey: 'k' }) })

    await expect(res.json()).resolves.toEqual({ id: 'a 1' })
    expect(api.requests[1]).toMatchObject({ method: 'PUT', params: { id: 'a 1' }, body: { appKey: 'k' } })
    expect(api.requests[1].query.get('x')).toBe('1')
  })

  it('apiError는 그 상태와 body로, undefined는 204로 응답한다', async () => {
    mockApi({
      'GET /api/accounts': apiError(404, { detail: '없음' }),
      'DELETE /api/accounts/{id}': () => undefined,
    })

    const notFound = await fetch('/api/accounts')
    expect(notFound.status).toBe(404)
    await expect(notFound.json()).resolves.toEqual({ detail: '없음' })
    expect((await fetch('/api/accounts/a1', { method: 'DELETE' })).status).toBe(204)
  })

  it('한 테스트에서 두 번 부르면 막는다', () => {
    mockApi({})
    expect(() => mockApi({})).toThrow('두 번')
  })

  it('스펙에 없는 키와 스펙과 다른 응답 모양은 typecheck에서 막힌다', () => {
    const _typeOnly = () => {
      // @ts-expect-error 스펙에 없는 경로
      mockApi({ 'GET /api/nope': [] })
      // @ts-expect-error 스펙에 없는 메서드
      mockApi({ 'PATCH /api/accounts': [] })
      // @ts-expect-error AccountResponse[]가 아니다
      mockApi({ 'GET /api/accounts': [{ wrong: 1 }] })
    }
    expect(_typeOnly).toBeTypeOf('function')
  })

  // React Query·refresh가 reject를 삼켜도 테스트 종료 검사가 실패시키는지 — 이 테스트는 실패해야 통과한다
  it.fails('등록하지 않은 요청이 삼켜져도 테스트 종료 시 실패시킨다', async () => {
    mockApi({ 'GET /api/accounts': [] })
    await fetch('/api/accounts', { method: 'POST' }).catch(() => {})
  })
})

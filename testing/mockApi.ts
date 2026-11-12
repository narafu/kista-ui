import { onTestFinished, vi } from 'vitest'
import type { paths } from '@shared/lib/api-types'

// 테스트 네트워크 경계 대역 — 모듈 mock 대신 전역 fetch를 바꾼다. 키·응답 모양은 OpenAPI `paths`로 타입 검사한다.
// 등록하지 않은 요청은 기록해 두었다가 테스트 종료 시 실패시킨다(React Query·refresh가 reject를 삼켜도 놓치지 않게).

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'
type Ops<P extends keyof paths> = { [M in Method as paths[P][M] extends { responses: unknown } ? M : never]: paths[P][M] }
export type ApiKey = { [P in keyof paths]: { [M in keyof Ops<P> & Method]: `${Uppercase<M>} ${P & string}` }[keyof Ops<P> & Method] }[keyof paths]

type OpOf<K extends ApiKey> = K extends `${infer M} ${infer P}`
  ? P extends keyof paths ? Lowercase<M> extends keyof Ops<P> ? Ops<P>[Lowercase<M>] : never : never
  : never
type ContentOf<R> = R extends { content: infer C } ? C[keyof C] : undefined
type Responses<K extends ApiKey> = OpOf<K> extends { responses: infer R } ? R : never
type SuccessBody<K extends ApiKey> = ContentOf<Responses<K>[Extract<keyof Responses<K>, 200 | 201 | 202 | 204>]>

const ERROR = Symbol('apiError')
interface ApiErrorReply { [ERROR]: true; status: number; body: unknown }

/** 2xx가 아닌 응답. 서버 ProblemDetail 등 body는 그대로 JSON으로 돌려준다 */
export function apiError(status: number, body: unknown = null): ApiErrorReply {
  return { [ERROR]: true, status, body }
}

export interface ApiRequest {
  method: string
  path: string
  params: Record<string, string>
  query: URLSearchParams
  body: unknown
}

type Reply<K extends ApiKey> = SuccessBody<K> | ApiErrorReply
type Handler<K extends ApiKey> = Reply<K> | ((req: ApiRequest) => Reply<K> | Promise<Reply<K>>)
export type ApiHandlers = { [K in ApiKey]?: Handler<K> }

function matcher(key: string) {
  const [method, template] = key.split(' ')
  const names: string[] = []
  const source = template.split(/\{(\w+)\}/).map((part, i) => {
    if (i % 2) { names.push(part); return '([^/]+)' }
    return part.replace(/[.*+?^$()|[\]\\]/g, '\\$&')
  }).join('')
  const pattern = new RegExp(`^${source}$`)
  return (reqMethod: string, path: string) => {
    if (reqMethod !== method) return null
    const m = pattern.exec(path)
    return m ? Object.fromEntries(names.map((n, i) => [n, safeDecode(m[i + 1])])) : null
  }
}

function safeDecode(segment: string) {
  try { return decodeURIComponent(segment) } catch { return segment }
}

function parseBody(raw: unknown) {
  if (typeof raw !== 'string') return raw
  if (!raw) return undefined
  try { return JSON.parse(raw) } catch { return raw }
}

let active = false

/** 이 테스트 동안 전역 fetch를 handlers로 대체한다. 반환값의 `requests`로 보낸 요청을 단언한다. 한 테스트에 한 번만 부른다 */
export function mockApi(handlers: ApiHandlers) {
  if (active) throw new Error('mockApi: 한 테스트에서 두 번 부르지 않는다 — handlers를 한 객체로 합친다')
  active = true
  // 고정 경로를 템플릿 경로보다 먼저 맞춘다(/accounts/summary vs /accounts/{id})
  const routes = Object.entries(handlers)
    .sort(([a], [b]) => Number(a.includes('{')) - Number(b.includes('{')))
    .map(([key, handler]) => ({ match: matcher(key), handler }))
  const requests: ApiRequest[] = []
  const unmatched: string[] = []

  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : null
    const url = new URL(req?.url ?? String(input), 'http://localhost')
    const method = (init?.method ?? req?.method ?? 'GET').toUpperCase()
    const body = parseBody(init?.body ?? (req ? await req.text() : undefined))

    for (const { match, handler } of routes) {
      const params = match(method, url.pathname)
      if (!params) continue
      const request: ApiRequest = { method, path: url.pathname, params, query: url.searchParams, body }
      requests.push(request)
      const reply = typeof handler === 'function' ? await handler(request) : handler
      if (reply && typeof reply === 'object' && ERROR in reply) {
        return Response.json(reply.body, { status: reply.status })
      }
      return reply === undefined ? new Response(null, { status: 204 }) : Response.json(reply)
    }
    unmatched.push(`${method} ${url.pathname}${url.search}`)
    throw new TypeError(`mockApi: 등록되지 않은 요청 ${method} ${url.pathname}`)
  })

  onTestFinished(() => {
    spy.mockRestore()
    active = false
    if (unmatched.length) throw new Error(`mockApi: 등록되지 않은 요청이 있었다\n${unmatched.join('\n')}`)
  })

  return { requests }
}

// 검증용 읽기 전용 프록시 — GET/HEAD만 upstream에 넘기고 쓰기 요청은 전부 403(로컬 DB 실데이터 보호).
// route(url)가 { status, body }를 돌려주면 fixture로 응답하고, undefined면 upstream으로 넘긴다.
// upstream JSON 응답은 실행 동안 메모이즈한다 — 실시간 가격·preview가 head/base 촬영 사이에 바뀌어 생기는 가짜 diff 방지
import http from 'node:http'
import { Readable } from 'node:stream'

const DROP_HEADERS = new Set(['host', 'connection', 'content-length', 'accept-encoding'])

export function startProxy({ name, port, upstream, route = () => {}, log }) {
  const cache = new Map()
  const json = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(body))
  }
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, upstream)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      log(`[${name}] BLOCK ${req.method} ${url.pathname}`)
      return json(res, 403, { title: `blocked by ${name}` })
    }
    try {
      const hit = route(url)
      if (hit) return json(res, hit.status ?? 200, hit.body)

      const key = [req.method, url.pathname + url.search, req.headers.authorization, req.headers.cookie].join(' ')
      const cached = cache.get(key)
      if (cached) {
        res.writeHead(cached.status, { 'content-type': cached.type })
        return res.end(cached.body)
      }
      const headers = Object.fromEntries(Object.entries(req.headers).filter(([k]) => !DROP_HEADERS.has(k)))
      const up = await fetch(upstream + url.pathname + url.search, { method: req.method, headers })
      if (up.status >= 400) log(`[${name}] UPSTREAM ${up.status} ${url.pathname}`)
      const type = up.headers.get('content-type') ?? 'application/json'
      // JSON만 버퍼링·캐시(성공 응답만), 나머지(SSE 등)는 그대로 흘린다
      if (type.includes('json')) {
        const body = Buffer.from(await up.arrayBuffer())
        if (up.ok) cache.set(key, { status: up.status, type, body })
        res.writeHead(up.status, { 'content-type': type })
        return res.end(body)
      }
      res.writeHead(up.status, { 'content-type': type })
      if (!up.body) return res.end()
      const upstreamBody = Readable.fromWeb(up.body)
      res.on('close', () => upstreamBody.destroy())
      upstreamBody.on('error', () => res.destroy())
      upstreamBody.pipe(res)
    } catch (e) {
      log(`[${name}] ERROR ${url.pathname} ${e} ${e.cause ?? ''}`)
      if (res.headersSent) res.destroy()
      else json(res, 502, { title: `${name} error` })
    }
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, () => resolve(server))
  })
}

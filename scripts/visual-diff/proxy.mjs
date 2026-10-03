// 검증용 읽기 전용 프록시 — GET/HEAD만 upstream에 넘기고 쓰기 요청은 전부 403(로컬 DB 실데이터 보호).
// route(url)가 { status, body }를 돌려주면 fixture로 응답하고, undefined면 upstream으로 넘긴다.
// upstream 성공 응답(SSE 제외)은 실행 동안 메모이즈한다 — 실시간 가격·preview가 head/base 촬영 사이에 바뀌어 생기는 가짜 diff 방지
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
      const headers = Object.fromEntries(Object.entries(req.headers).filter(([k]) => !DROP_HEADERS.has(k)))
      const fetchUp = () => fetch(upstream + url.pathname + url.search, { method: req.method, headers })
      // 진행 중인 요청도 공유한다 — head/base가 병렬로 같은 URL을 요청하면 둘 다 미스로 upstream에 가 서로 다른 값을 받는다
      let pending = cache.get(key)
      let own
      if (!pending) {
        own = fetchUp()
        pending = own.then(async (up) => {
          const type = up.headers.get('content-type') ?? 'application/json'
          if (up.status >= 400) log(`[${name}] UPSTREAM ${up.status} ${url.pathname}`)
          // SSE는 공유할 수 없어 null — 소유자는 자기 응답을 흘리고, 기다리던 쪽은 따로 요청한다
          if (type.includes('event-stream')) return null
          return { status: up.status, type, body: Buffer.from(await up.arrayBuffer()) }
        })
        cache.set(key, pending)
        // 성공 응답만 메모이즈 — 실패·SSE·예외는 비워 다음 요청이 다시 upstream으로 가게 한다
        pending.then((r) => { if (!r || r.status < 200 || r.status >= 300) cache.delete(key) }, () => cache.delete(key))
      }
      const shared = await pending
      if (shared) {
        res.writeHead(shared.status, { 'content-type': shared.type })
        return res.end(shared.body)
      }
      const up = own ? await own : await fetchUp()
      res.writeHead(up.status, { 'content-type': up.headers.get('content-type') ?? 'text/event-stream' })
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

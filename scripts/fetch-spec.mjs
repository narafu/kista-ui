// kista-api(8080)와 kista-trading(8081) OpenAPI 스펙을 받아 openapi.json 하나로 병합한다.
// 겹치는 operationId는 trading_ 접두사. info/servers/security는 8080 기준.
// 경로 중복, 같은 이름·다른 내용 스키마, 8081의 schemas 외 component는 실패한다 — kista-api 쪽에서 정리할 신호
import { writeFileSync } from 'node:fs'

const [api, trading] = await Promise.all(
  ['http://localhost:8080/api-docs', 'http://localhost:8081/api-docs'].map(async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`${url} ${res.status}`)
    return res.json()
  })
)

const extraComponents = Object.keys(trading.components ?? {}).filter((k) => k !== 'schemas')
if (extraComponents.length) throw new Error(`8081 components 병합 미지원: ${extraComponents.join(', ')}`)

const apiSchemas = api.components?.schemas ?? {}
const conflicts = Object.entries(trading.components?.schemas ?? {})
  .filter(([name, schema]) => apiSchemas[name] && JSON.stringify(apiSchemas[name]) !== JSON.stringify(schema))
  .map(([name]) => name)
if (conflicts.length) throw new Error(`같은 이름·다른 내용 스키마: ${conflicts.join(', ')}`)

const dupPaths = Object.keys(trading.paths ?? {}).filter((p) => api.paths?.[p])
if (dupPaths.length) throw new Error(`경로 중복: ${dupPaths.join(', ')}`)

// operationId도 프로세스별로 따로 매겨져 겹친다(update/delete 등) — openapi-typescript operations 타입 중복 방지
const operations = (doc) => Object.values(doc.paths ?? {}).flatMap((item) => Object.values(item)).filter((op) => op?.operationId)
const operationIds = new Set(operations(api).map((op) => op.operationId))
for (const op of operations(trading)) {
  if (!operationIds.has(op.operationId)) continue
  op.operationId = `trading_${op.operationId}`
  if (operationIds.has(op.operationId)) throw new Error(`operationId 충돌: ${op.operationId}`)
}

const tagNames = new Set((api.tags ?? []).map((tag) => tag.name))
const merged = {
  ...api,
  tags: [...(api.tags ?? []), ...(trading.tags ?? []).filter((tag) => !tagNames.has(tag.name))],
  paths: { ...api.paths, ...trading.paths },
  components: { ...api.components, schemas: { ...trading.components?.schemas, ...apiSchemas } },
}
writeFileSync('openapi.json', JSON.stringify(merged))

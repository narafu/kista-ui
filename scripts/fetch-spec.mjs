// kista-api(8080)와 kista-trading(8081) OpenAPI 스펙을 받아 openapi.json 하나로 병합한다.
// 두 프로세스가 같은 이름으로 서로 다른 스키마를 내보내면(예: StrategyResponse — 8080은 런타임 정책, 8081은 매매 전략)
// 8081 쪽을 Trading<Name>으로 바꾸고 8081 문서 안의 $ref도 함께 고친다. 겹치는 operationId는 trading_ 접두사.
// info/servers/security는 8080 기준. 경로가 겹치거나 8081에 schemas 외 component가 생기면 실패한다
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
let t = trading
// 이름을 바꾼 스키마를 참조하던 동명 스키마는 ref 치환 후 내용이 달라지므로, 충돌이 더 없을 때까지 반복한다
for (let renamed = true; renamed;) {
  renamed = false
  for (const [name, schema] of Object.entries(t.components?.schemas ?? {})) {
    if (!apiSchemas[name] || JSON.stringify(apiSchemas[name]) === JSON.stringify(schema)) continue
    const newName = `Trading${name}`
    if (apiSchemas[newName] || t.components.schemas[newName]) throw new Error(`rename 대상 이름 충돌: ${newName}`)
    console.warn(`schema 충돌: ${name} → ${newName}`)
    t = JSON.parse(JSON.stringify(t).replaceAll(`"#/components/schemas/${name}"`, `"#/components/schemas/${newName}"`))
    t.components.schemas[newName] = t.components.schemas[name]
    delete t.components.schemas[name]
    renamed = true
    break
  }
}

const dupPaths = Object.keys(t.paths ?? {}).filter((p) => api.paths?.[p])
if (dupPaths.length) throw new Error(`경로 중복: ${dupPaths.join(', ')}`)

// operationId도 프로세스별로 따로 매겨져 겹친다(update/delete 등) — openapi-typescript operations 타입 중복 방지
const operations = (doc) => Object.values(doc.paths ?? {}).flatMap((item) => Object.values(item)).filter((op) => op?.operationId)
const operationIds = new Set(operations(api).map((op) => op.operationId))
for (const op of operations(t)) {
  if (!operationIds.has(op.operationId)) continue
  op.operationId = `trading_${op.operationId}`
  if (operationIds.has(op.operationId)) throw new Error(`operationId 충돌: ${op.operationId}`)
}

const tagNames = new Set((api.tags ?? []).map((tag) => tag.name))
const merged = {
  ...api,
  tags: [...(api.tags ?? []), ...(t.tags ?? []).filter((tag) => !tagNames.has(tag.name))],
  paths: { ...api.paths, ...t.paths },
  components: { ...api.components, schemas: { ...t.components?.schemas, ...apiSchemas } },
}
writeFileSync('openapi.json', JSON.stringify(merged))

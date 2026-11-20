// 로컬 kista-api(KISTA_ROLE=all, :8080) OpenAPI 스펙을 openapi.json으로 저장한다.
// role=web만 띄우면 엔진 경로가 스펙에서 빠지므로 all로 띄운 프로세스 기준이다.
import { writeFileSync } from 'node:fs'

const url = 'http://localhost:8080/api-docs'
const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
if (!res.ok) throw new Error(`${url} ${res.status}`)
writeFileSync('openapi.json', JSON.stringify(await res.json()))

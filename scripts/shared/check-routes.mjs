// app/**/page.tsx 화면이 routes.mjs 표와 정확히 같은지 검사한다(lint에서 실행). 어긋나면 exit 1
import { readdirSync } from 'node:fs'
import { ROUTES } from './routes.mjs'

const segments = (file) => file.split('/').slice(0, -1).filter((s) => !/^\([^.].*\)$/.test(s) && !s.startsWith('@')) // (group)·@slot은 URL에 없다((.)x 인터셉트 세그먼트는 그룹이 아니다)
const app = new Set(readdirSync('app', { recursive: true }).filter((f) => /(^|\/)page\.tsx$/.test(f.replaceAll('\\', '/'))).map((f) => `/${segments(f.replaceAll('\\', '/')).join('/')}`))
const table = new Set(ROUTES.map((r) => r.path))
const errors = [...app].filter((p) => !table.has(p)).map((p) => `표에 없는 화면: ${p}`).concat([...table].filter((p) => !app.has(p)).map((p) => `앱에 없는 표 경로: ${p}`))
if (errors.length) { console.error(`scripts/shared/routes.mjs가 app/ 화면과 다르다:\n${errors.join('\n')}`); process.exit(1) }

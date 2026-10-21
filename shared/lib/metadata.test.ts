import { readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import { describe, expect, it } from 'vitest'

const APP_DIR = join(process.cwd(), 'app')
const ROOT_LAYOUT = 'layout.tsx'

const sourceFiles = readdirSync(APP_DIR, { recursive: true, encoding: 'utf8' })
  .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))

const read = (file: string) => readFileSync(join(APP_DIR, file), 'utf8')

// 탭 제목 규칙(docs/agents/constraints.md)의 회귀 방지 — 둘 다 렌더 결과가 아니라 소스 패턴이라 타입·lint로 안 잡힌다
describe('metadata title 규칙', () => {
  it('화면 metadata.title에 접미사 " | KISTA"를 직접 쓰지 않는다 (root template과 중복돼 "X | KISTA | KISTA")', () => {
    const offenders = sourceFiles.filter((file) => file !== ROOT_LAYOUT && read(file).includes('| KISTA'))
    expect(offenders).toEqual([])
  })

  it('중첩 layout은 title을 문자열로 쓰지 않는다 (하위 라우트로 template 상속이 끊긴다)', () => {
    const offenders = sourceFiles
      .filter((file) => file !== ROOT_LAYOUT && /(^|\/)layout\.tsx$/.test(file))
      .filter((file) => /\btitle:\s*['"`]/.test(read(file)))
    expect(offenders.map((file) => relative('.', file))).toEqual([])
  })
})

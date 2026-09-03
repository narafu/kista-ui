import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parser } from 'typescript-eslint'
import { afterEach, describe, expect, it } from 'vitest'

const projectRoot = process.cwd()
const runtimeRoots = ['app', 'widgets', 'features', 'entities']
const runtimeSourceFile = /\.(?:js|jsx|ts|tsx)$/
const ignoredSourceFile = /\.(?:docs|fixture|spec|test)\.(?:js|jsx|ts|tsx)$/
const ignoredDirectoryNames = new Set(['__fixtures__', '__tests__', 'docs', 'fixtures', 'test', 'tests'])
const forbiddenCachedReaderNames = new Set(['getCachedAccounts', 'getCachedStrategies', 'getCachedUser'])
const forbiddenNextCacheImports = new Set(['unstable_cache', 'cacheTag'])
const temporaryRoots: string[] = []

type AstNode = { type?: string; [key: string]: unknown }
type AstParser = {
  parseForESLint(source: string, options: { filePath: string; jsx: boolean }): { ast: unknown }
}

const astParser = parser as AstParser

async function runtimeSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return ignoredDirectoryNames.has(entry.name) ? [] : runtimeSourceFiles(entryPath)
    return runtimeSourceFile.test(entry.name) && !ignoredSourceFile.test(entry.name)
      ? [entryPath]
      : []
  }))

  return files.flat()
}

function isNode(value: unknown): value is AstNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function identifierName(node: unknown): string | null {
  return isNode(node) && node.type === 'Identifier' && typeof node.name === 'string' ? node.name : null
}

function stringLiteralValue(node: unknown): string | null {
  const expression = unwrapExpression(node)
  return isNode(expression) && expression.type === 'Literal' && typeof expression.value === 'string'
    ? expression.value
    : null
}

function propertyKeyName(key: unknown, computed: unknown): string | null {
  const literal = stringLiteralValue(key)
  if (literal !== null) return literal
  return computed === true ? null : identifierName(key)
}

function unwrapExpression(node: unknown): unknown {
  if (!isNode(node)) return node
  if (node.type === 'ChainExpression' || node.type === 'ParenthesizedExpression' || node.type === 'TSAsExpression' || node.type === 'TSTypeAssertion') {
    return unwrapExpression(node.expression)
  }
  return node
}

function isLiteralZero(node: unknown): boolean {
  const expression = unwrapExpression(node)
  return isNode(expression) && expression.type === 'Literal' && expression.value === 0
}

function isRouterRefreshCall(node: AstNode): boolean {
  if (node.type !== 'CallExpression') return false
  const callee = unwrapExpression(node.callee)
  if (!isNode(callee) || callee.type !== 'MemberExpression') return false
  return identifierName(callee.object) === 'router' && identifierName(callee.property) === 'refresh'
}

function hasCacheArchitectureViolation(source: string, relativePath: string): string[] {
  const failures = new Set<string>()
  const nextCacheNamespaceLocals = new Set<string>()
  const ast = astParser.parseForESLint(source, {
    filePath: relativePath,
    jsx: relativePath.endsWith('.jsx') || relativePath.endsWith('.tsx'),
  }).ast

  function visit(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (!isNode(value)) return

    if (value.type === 'Identifier' && forbiddenCachedReaderNames.has(identifierName(value) ?? '')) {
      failures.add('mutable cache reader')
    }
    if (value.type === 'Property' && propertyKeyName(value.key, value.computed) === 'initialDataUpdatedAt' && isLiteralZero(value.value)) {
      failures.add('forced stale hydration')
    }
    if (relativePath.startsWith('entities/') && relativePath.includes('/hooks/') && isRouterRefreshCall(value)) {
      failures.add('hook router.refresh()')
    }
    if (value.type === 'ImportDeclaration' && stringLiteralValue(value.source) === 'next/cache') {
      const specifiers = Array.isArray(value.specifiers) ? value.specifiers : []
      for (const specifier of specifiers) {
        if (!isNode(specifier)) continue
        if (specifier.type === 'ImportSpecifier') {
          const importedName = identifierName(specifier.imported)
          if (importedName !== null && forbiddenNextCacheImports.has(importedName)) {
            failures.add(`next/cache import: ${importedName}`)
          }
        }
        if (specifier.type === 'ImportNamespaceSpecifier') {
          const localName = identifierName(specifier.local)
          if (localName !== null) nextCacheNamespaceLocals.add(localName)
        }
      }
    }
    if (value.type === 'CallExpression') {
      const callee = unwrapExpression(value.callee)
      if (isNode(callee) && callee.type === 'MemberExpression') {
        const objectName = identifierName(callee.object)
        const propertyName = identifierName(callee.property)
        if (
          objectName !== null && nextCacheNamespaceLocals.has(objectName)
          && propertyName !== null && forbiddenNextCacheImports.has(propertyName)
        ) {
          failures.add(`next/cache import: ${propertyName}`)
        }
      }
    }

    Object.values(value).forEach(visit)
  }

  visit(ast)
  return [...failures]
}

async function cacheArchitectureViolations(root: string): Promise<string[]> {
  const files = (await Promise.all(
    runtimeRoots.map((directory) => runtimeSourceFiles(path.join(root, directory))),
  )).flat()
  const violations = await Promise.all(files.map(async (file) => {
    const source = await readFile(file, 'utf8')
    // path.relative는 Windows에서 백슬래시를 반환한다 — hasCacheArchitectureViolation의
    // 'entities/' startsWith 검사와 이 파일의 기대 문자열이 전부 슬래시 전제라 정규화 필수.
    const relativePath = path.relative(root, file).split(path.sep).join('/')
    const failures = hasCacheArchitectureViolation(source, relativePath)

    return failures.length > 0 ? `${relativePath}: ${failures.join(', ')}` : null
  }))

  return violations.filter((violation): violation is string => violation !== null)
}

async function fixtureRoot(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kista-cache-architecture-'))
  temporaryRoots.push(root)
  await Promise.all(Object.entries(files).map(async ([relativePath, source]) => {
    const file = path.join(root, relativePath)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, source)
  }))
  return root
}

describe('query cache architecture', () => {
  afterEach(async () => {
    await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
  })

  // app/widgets/features/entities 전체 실 소스 트리를 읽고 AST 파싱한다 — 전체 스위트(1000+개)
  // 동시 실행 시 CPU 경합으로 기본 5000ms를 넘기는 사례가 있어 여유를 둔다.
  it('keeps mutable Next.js Data Cache readers and forced stale hydration out of runtime sources', async () => {
    const violations = await cacheArchitectureViolations(projectRoot)

    expect(violations).toEqual([])
  }, 15000)

  it('flags prohibited variants in every runtime source extension', async () => {
    const root = await fixtureRoot({
      'app/cache.js': 'getCachedAccounts()',
      'app/cache.ts': 'getCachedUser()',
      'entities/account/hooks/hydration.js': 'const query = { initialDataUpdatedAt: (0) }',
      'entities/account/hooks/hydration-quoted.ts': "const query = { 'initialDataUpdatedAt': (0) }",
      'entities/account/hooks/hydration-static-computed.tsx': "const query = { ['initialDataUpdatedAt']: (0) }",
      'entities/account/hooks/refresh.jsx': 'router /* refresh */ . refresh( /* now */ )',
      'entities/account/hooks/strategies.tsx': 'getCachedStrategies()',
      'entities/order/api/cached.ts': "import { unstable_cache } from 'next/cache'\nexport const cached = unstable_cache(async () => [], ['orders'])",
      'entities/stats/api/cached.ts': "import { cacheTag } from 'next/cache'\nexport async function tagStats() { cacheTag('stats') }",
      'features/.keep': '',
      'widgets/.keep': '',
    })

    const violations = await cacheArchitectureViolations(root)

    expect(violations).toHaveLength(9)
    expect(violations).toEqual(expect.arrayContaining([
      'app/cache.js: mutable cache reader',
      'app/cache.ts: mutable cache reader',
      'entities/account/hooks/hydration.js: forced stale hydration',
      'entities/account/hooks/hydration-quoted.ts: forced stale hydration',
      'entities/account/hooks/hydration-static-computed.tsx: forced stale hydration',
      'entities/account/hooks/refresh.jsx: hook router.refresh()',
      'entities/account/hooks/strategies.tsx: mutable cache reader',
      'entities/order/api/cached.ts: next/cache import: unstable_cache',
      'entities/stats/api/cached.ts: next/cache import: cacheTag',
    ]))
  })

  it('flags a namespace import of next/cache used to call a banned export', async () => {
    const root = await fixtureRoot({
      'entities/order/api/namespaced.ts': "import * as nc from 'next/cache'\nexport const cached = nc.unstable_cache(async () => [], ['orders'])",
      'app/.keep': '',
      'features/.keep': '',
      'widgets/.keep': '',
    })

    await expect(cacheArchitectureViolations(root)).resolves.toEqual([
      'entities/order/api/namespaced.ts: next/cache import: unstable_cache',
    ])
  })

  it('flags a next/cache import under any local alias by its original export name', async () => {
    const root = await fixtureRoot({
      'entities/order/api/aliased.ts': "import { unstable_cache as cached } from 'next/cache'\nexport const x = cached",
      'app/.keep': '',
      'features/.keep': '',
      'widgets/.keep': '',
    })

    await expect(cacheArchitectureViolations(root)).resolves.toEqual([
      'entities/order/api/aliased.ts: next/cache import: unstable_cache',
    ])
  })

  it('does not flag other next/cache exports such as revalidateTag', async () => {
    const root = await fixtureRoot({
      'entities/order/api/tag.ts': "import { revalidateTag } from 'next/cache'\nrevalidateTag('meta', 'max')",
      'app/.keep': '',
      'features/.keep': '',
      'widgets/.keep': '',
    })

    await expect(cacheArchitectureViolations(root)).resolves.toEqual([])
  })

  it('ignores prohibited syntax in test, documentation, and fixture paths', async () => {
    const root = await fixtureRoot({
      'app/docs/cache.ts': 'getCachedAccounts()',
      'app/__tests__/cache.ts': 'getCachedAccounts()',
      'app/test/cache.ts': 'getCachedAccounts()',
      'app/tests/cache.ts': 'getCachedAccounts()',
      'app/cache.test.ts': 'getCachedAccounts()',
      'app/cache.docs.js': 'getCachedAccounts()',
      'app/cache.docs.jsx': 'getCachedAccounts()',
      'app/cache.docs.ts': 'getCachedAccounts()',
      'app/cache.docs.tsx': 'getCachedAccounts()',
      'entities/account/hooks/cache.spec.tsx': 'router.refresh()',
      'entities/account/hooks/fixtures/cache.ts': 'router.refresh()',
      'entities/account/hooks/__fixtures__/cache.ts': 'router.refresh()',
      'entities/account/hooks/cache.fixture.ts': 'router.refresh()',
      'entities/order/api/cached.docs.ts': "import { unstable_cache } from 'next/cache'",
      'entities/order/api/cached.test.ts': "import { cacheTag } from 'next/cache'",
      'features/.keep': '',
      'widgets/.keep': '',
    })

    await expect(cacheArchitectureViolations(root)).resolves.toEqual([])
  })

  it('does not treat dynamically computed properties as static cache keys', async () => {
    const root = await fixtureRoot({
      'entities/account/hooks/dynamic-key.ts': "const initialDataUpdatedAt = 'other'; const query = { [initialDataUpdatedAt]: (0) }",
      'app/.keep': '',
      'features/.keep': '',
      'widgets/.keep': '',
    })

    await expect(cacheArchitectureViolations(root)).resolves.toEqual([])
  })
})

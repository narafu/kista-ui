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
    const relativePath = path.relative(root, file)
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

  it('keeps mutable Next.js Data Cache readers and forced stale hydration out of runtime sources', async () => {
    const violations = await cacheArchitectureViolations(projectRoot)

    expect(violations).toEqual([])
  })

  it('flags prohibited variants in every runtime source extension', async () => {
    const root = await fixtureRoot({
      'app/cache.js': 'getCachedAccounts()',
      'app/cache.ts': 'getCachedUser()',
      'entities/account/hooks/hydration.js': 'const query = { initialDataUpdatedAt: (0) }',
      'entities/account/hooks/hydration-quoted.ts': "const query = { 'initialDataUpdatedAt': (0) }",
      'entities/account/hooks/hydration-static-computed.tsx': "const query = { ['initialDataUpdatedAt']: (0) }",
      'entities/account/hooks/refresh.jsx': 'router /* refresh */ . refresh( /* now */ )',
      'entities/account/hooks/strategies.tsx': 'getCachedStrategies()',
      'features/.keep': '',
      'widgets/.keep': '',
    })

    const violations = await cacheArchitectureViolations(root)

    expect(violations).toHaveLength(7)
    expect(violations).toEqual(expect.arrayContaining([
      'app/cache.js: mutable cache reader',
      'app/cache.ts: mutable cache reader',
      'entities/account/hooks/hydration.js: forced stale hydration',
      'entities/account/hooks/hydration-quoted.ts: forced stale hydration',
      'entities/account/hooks/hydration-static-computed.tsx: forced stale hydration',
      'entities/account/hooks/refresh.jsx: hook router.refresh()',
      'entities/account/hooks/strategies.tsx: mutable cache reader',
    ]))
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

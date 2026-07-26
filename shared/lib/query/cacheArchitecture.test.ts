import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()
const runtimeRoots = ['app', 'widgets', 'features', 'entities']
const sourceFile = /(?<!\.(?:test|spec))\.(?:ts|tsx)$/
const fixtureDirectory = /(?:^|[/\\])(?:__fixtures__|fixtures)(?:[/\\]|$)/
const fixtureFile = /\.fixture\.(?:ts|tsx)$/
const forbiddenCachedReaders = /\b(?:getCachedAccounts|getCachedStrategies|getCachedUser)\b/
const forcedStaleHydration = /initialDataUpdatedAt\s*:\s*0\b/
const hookRefresh = /\brouter\.refresh\(\)/

async function runtimeSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return runtimeSourceFiles(entryPath)
    return sourceFile.test(entry.name) && !fixtureDirectory.test(entryPath) && !fixtureFile.test(entry.name)
      ? [entryPath]
      : []
  }))

  return files.flat()
}

describe('query cache architecture', () => {
  it('keeps mutable Next.js Data Cache readers and forced stale hydration out of runtime sources', async () => {
    const files = (await Promise.all(
      runtimeRoots.map((directory) => runtimeSourceFiles(path.join(projectRoot, directory))),
    )).flat()
    const violations = await Promise.all(files.map(async (file) => {
      const source = await readFile(file, 'utf8')
      const relativePath = path.relative(projectRoot, file)
      const failures = [
        forbiddenCachedReaders.test(source) && 'mutable cache reader',
        forcedStaleHydration.test(source) && 'forced stale hydration',
        relativePath.startsWith('entities/') && relativePath.includes('/hooks/') && hookRefresh.test(source) && 'hook router.refresh()',
      ].filter(Boolean)

      return failures.length > 0 ? `${relativePath}: ${failures.join(', ')}` : null
    }))

    expect(violations.filter(Boolean)).toEqual([])
  })
})

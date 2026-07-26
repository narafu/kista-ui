import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ACCOUNT_CACHE_USER_ID,
  accountCleanupCandidates,
  assertAccountCacheOwnership,
  cleanupRecordedAccounts,
} from './e2e/support/account-cache-fixture'
import { acquireAccountCacheLock } from './e2e/support/account-cache-lock'

const reserved = { id: 'reserved-1', nickname: 'e2e-account-cache-leftover' }
const created = { id: 'created-1', nickname: 'created-by-this-spec-id' }
const foreign = { id: 'foreign-1', nickname: 'manual-local-account' }

describe('account cache E2E ownership', () => {
  it.each([
    'https://example.com',
    'http://kista-api.internal:8080',
    'https://localhost:8080',
    'http://localhost:8080/api',
  ])('rejects a non-local or path-scoped API base: %s', (apiBase) => {
    expect(() => assertAccountCacheOwnership(apiBase, ACCOUNT_CACHE_USER_ID)).toThrow(/refusing account cleanup/i)
  })

  it('rejects any identity except the fixed local dev user', () => {
    expect(() => assertAccountCacheOwnership('http://localhost:8080', 'production-user')).toThrow(
      /unexpected E2E user identity/i,
    )
  })

  it('allows only loopback HTTP with the fixed local dev identity', () => {
    expect(() => assertAccountCacheOwnership('http://127.0.0.1:8080', ACCOUNT_CACHE_USER_ID)).not.toThrow()
  })

  it('selects only IDs explicitly recorded by the current run for cleanup', () => {
    expect(accountCleanupCandidates([reserved, created, foreign], new Set([created.id]))).toEqual([created])
  })

  it.each([reserved, foreign])('aborts without deletes when an unrecorded account exists: $nickname', async (account) => {
    const deleteAccount = vi.fn()

    await expect(cleanupRecordedAccounts([account], new Set(), deleteAccount)).rejects.toThrow(
      /remove every account manually/i,
    )
    expect(deleteAccount).not.toHaveBeenCalled()
  })
})

describe('account cache E2E cross-process lock', () => {
  const lockDirectories: string[] = []

  function lockDirectory() {
    const directory = mkdtempSync(join(tmpdir(), 'kista-account-cache-lock-'))
    lockDirectories.push(directory)
    return directory
  }

  afterEach(() => {
    for (const directory of lockDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('denies a second process while the owner PID is alive', () => {
    const directory = lockDirectory()
    const first = acquireAccountCacheLock('http://localhost:8080', ACCOUNT_CACHE_USER_ID, {
      lockDirectory: directory,
      pid: 101,
      isProcessAlive: () => true,
    })

    expect(() => acquireAccountCacheLock('http://127.0.0.1:8080', ACCOUNT_CACHE_USER_ID, {
      lockDirectory: directory,
      pid: 202,
      isProcessAlive: () => true,
    })).toThrow(/held by live PID 101/i)

    first.release()
  })

  it('fails conservatively with manual remediation when the recorded PID is stale', () => {
    const directory = lockDirectory()
    acquireAccountCacheLock('http://localhost:8080', ACCOUNT_CACHE_USER_ID, {
      lockDirectory: directory,
      pid: 101,
      isProcessAlive: () => false,
    })

    expect(() => acquireAccountCacheLock('http://localhost:8080', ACCOUNT_CACHE_USER_ID, {
      lockDirectory: directory,
      pid: 202,
      isProcessAlive: () => false,
    })).toThrow(/stale lock.*remove it manually/i)
  })

  it('releases only the lock owned by the current holder', () => {
    const directory = lockDirectory()
    const first = acquireAccountCacheLock('http://localhost:8080', ACCOUNT_CACHE_USER_ID, {
      lockDirectory: directory,
    })
    first.assertHeld()
    first.release()

    const second = acquireAccountCacheLock('http://localhost:8080', ACCOUNT_CACHE_USER_ID, {
      lockDirectory: directory,
    })
    second.assertHeld()
    second.release()
  })
})

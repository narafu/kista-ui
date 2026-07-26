import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { createHash, randomUUID } from 'crypto'

import { assertAccountCacheOwnership } from './account-cache-fixture'

type LockRecord = {
  pid: number
  ownerToken: string
  apiBase: string
  userId: string
  acquiredAt: string
}

type LockOptions = {
  lockDirectory?: string
  pid?: number
  isProcessAlive?: (pid: number) => boolean
}

function defaultProcessIsAlive(pid: number) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH'
  }
}

function readLockRecord(lockPath: string): LockRecord {
  try {
    return JSON.parse(readFileSync(lockPath, 'utf8')) as LockRecord
  } catch {
    throw new Error(`Account-cache E2E lock is unreadable at ${lockPath}. Remove it manually after verifying no suite is running.`)
  }
}

export function acquireAccountCacheLock(apiBase: string, userId: string, options: LockOptions = {}) {
  const normalizedApiBase = assertAccountCacheOwnership(apiBase, userId)
  const lockDirectory = options.lockDirectory ?? tmpdir()
  const pid = options.pid ?? process.pid
  const isProcessAlive = options.isProcessAlive ?? defaultProcessIsAlive
  const lockKey = createHash('sha256').update(`${normalizedApiBase}\n${userId}`).digest('hex').slice(0, 20)
  const lockPath = join(lockDirectory, `kista-account-cache-${lockKey}.lock`)
  const ownerToken = randomUUID()
  const record: LockRecord = {
    pid,
    ownerToken,
    apiBase: normalizedApiBase,
    userId,
    acquiredAt: new Date().toISOString(),
  }

  mkdirSync(lockDirectory, { recursive: true })

  let descriptor: number
  try {
    descriptor = openSync(lockPath, 'wx', 0o600)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error

    const existing = readLockRecord(lockPath)
    if (isProcessAlive(existing.pid)) {
      throw new Error(`Account-cache E2E lock is held by live PID ${existing.pid} at ${lockPath}; no accounts were touched.`)
    }
    throw new Error(
      `Account-cache E2E found a stale lock from PID ${existing.pid} at ${lockPath}. `
        + 'Verify no suite is running and remove it manually; no accounts were touched.',
    )
  }

  try {
    writeFileSync(descriptor, JSON.stringify(record), 'utf8')
  } catch (error) {
    closeSync(descriptor)
    unlinkSync(lockPath)
    throw error
  }
  closeSync(descriptor)

  let released = false
  const assertHeld = () => {
    if (released) throw new Error('Account-cache E2E lock has already been released')
    const current = readLockRecord(lockPath)
    if (current.ownerToken !== ownerToken) {
      throw new Error(`Account-cache E2E lock ownership changed at ${lockPath}; refusing destructive work.`)
    }
  }

  return {
    lockPath,
    assertHeld,
    release() {
      if (released) return
      assertHeld()
      unlinkSync(lockPath)
      released = true
    },
  }
}

export type AccountCacheLock = ReturnType<typeof acquireAccountCacheLock>

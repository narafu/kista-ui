import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadAccountAndStrategyForEdit, loadAccountForNewStrategy } from './loadStrategyFormContext'

const { listAccountsMock, listStrategiesMock } = vi.hoisted(() => ({
  listAccountsMock: vi.fn(),
  listStrategiesMock: vi.fn(),
}))

vi.mock('@entities/account', () => ({ listAccounts: listAccountsMock }))
vi.mock('@entities/strategy', () => ({ listStrategies: listStrategiesMock }))

describe('strategy form route context', () => {
  beforeEach(() => {
    listAccountsMock.mockReset()
    listStrategiesMock.mockReset()
  })

  it('propagates an account transport failure from the new-strategy loader', async () => {
    const backendError = new Error('backend unavailable')
    listAccountsMock.mockRejectedValue(backendError)

    await expect(loadAccountForNewStrategy('account-1', 'server-token')).rejects.toBe(backendError)
  })

  it('propagates a strategy transport failure from the edit loader', async () => {
    const backendError = new Error('backend unavailable')
    listAccountsMock.mockResolvedValue([{ id: 'account-1' }])
    listStrategiesMock.mockRejectedValue(backendError)

    await expect(loadAccountAndStrategyForEdit('account-1', 'strategy-1', 'server-token')).rejects.toBe(backendError)
  })

  it('returns null only when successful list responses do not contain the route resources', async () => {
    listAccountsMock.mockResolvedValue([])
    listStrategiesMock.mockResolvedValue([])

    await expect(loadAccountAndStrategyForEdit('missing', 'missing', 'server-token')).resolves.toBeNull()
  })
})

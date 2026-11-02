import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadAccountAndStrategyForEdit, loadAccountForNewStrategy } from './loadStrategyFormContext'

const { listAccountsMock, findStrategyMock } = vi.hoisted(() => ({
  listAccountsMock: vi.fn(),
  findStrategyMock: vi.fn(),
}))

vi.mock('@entities/account', () => ({ listAccounts: listAccountsMock }))
vi.mock('@entities/strategy', () => ({ findStrategy: findStrategyMock }))

describe('strategy form route context', () => {
  beforeEach(() => {
    listAccountsMock.mockReset()
    findStrategyMock.mockReset()
  })

  it('propagates an account transport failure from the new-strategy loader', async () => {
    const backendError = new Error('backend unavailable')
    listAccountsMock.mockRejectedValue(backendError)

    await expect(loadAccountForNewStrategy('account-1', 'server-token')).rejects.toBe(backendError)
  })

  it('propagates a strategy transport failure from the edit loader', async () => {
    const backendError = new Error('backend unavailable')
    listAccountsMock.mockResolvedValue([{ id: 'account-1' }])
    findStrategyMock.mockRejectedValue(backendError)

    await expect(loadAccountAndStrategyForEdit('account-1', 'strategy-1', 'server-token')).rejects.toBe(backendError)
  })

  it('returns null only when successful list responses do not contain the route resources', async () => {
    listAccountsMock.mockResolvedValue([])
    findStrategyMock.mockResolvedValue(null)

    await expect(loadAccountAndStrategyForEdit('missing', 'missing', 'server-token')).resolves.toBeNull()
  })
})

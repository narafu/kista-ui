import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadAccountAndStrategyForEdit, loadAccountForNewStrategy } from './loadStrategyFormContext'

const { getAccountMock, findStrategyMock } = vi.hoisted(() => ({
  getAccountMock: vi.fn(),
  findStrategyMock: vi.fn(),
}))

vi.mock('@entities/account', () => ({ getAccount: getAccountMock }))
vi.mock('@entities/strategy', () => ({ findStrategy: findStrategyMock }))

describe('strategy form route context', () => {
  beforeEach(() => {
    getAccountMock.mockReset()
    findStrategyMock.mockReset()
  })

  it('propagates an account transport failure from the new-strategy loader', async () => {
    const backendError = new Error('backend unavailable')
    getAccountMock.mockRejectedValue(backendError)

    await expect(loadAccountForNewStrategy('account-1', 'server-token')).rejects.toBe(backendError)
  })

  it('propagates a strategy transport failure from the edit loader', async () => {
    const backendError = new Error('backend unavailable')
    getAccountMock.mockResolvedValue({ id: 'account-1' })
    findStrategyMock.mockRejectedValue(backendError)

    await expect(loadAccountAndStrategyForEdit('account-1', 'strategy-1', 'server-token')).rejects.toBe(backendError)
  })

  it('returns null only when successful lookups do not find the route resources', async () => {
    getAccountMock.mockResolvedValue(null)
    findStrategyMock.mockResolvedValue(null)

    await expect(loadAccountAndStrategyForEdit('missing', 'missing', 'server-token')).resolves.toBeNull()
  })
})

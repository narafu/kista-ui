import { describe, expect, it, vi } from 'vitest'

import { accountKeys } from './queryKeys'
import { accountDetailQueryOptions, accountListQueryOptions } from './queryOptions'

const { listAccountsMock } = vi.hoisted(() => ({
  listAccountsMock: vi.fn(),
}))

vi.mock('../api', () => ({
  listAccounts: listAccountsMock,
}))

describe('account query options', () => {
  it('is importable from the server-compatible model module and forwards server tokens', async () => {
    listAccountsMock.mockResolvedValue([])

    const options = accountListQueryOptions('server-token')
    if (!options.queryFn) throw new Error('account query options require a query function')

    await options.queryFn({} as never)

    expect(options.queryKey).toEqual(accountKeys.list())
    expect(listAccountsMock).toHaveBeenCalledWith('server-token')
  })

  it('resolves one complete account on the canonical detail key', async () => {
    const account = {
      id: 'account-1',
      nickname: 'Main',
      accountNoMasked: '111-***',
      broker: 'MOCK' as const,
    }
    listAccountsMock.mockResolvedValue([account])

    const options = accountDetailQueryOptions(account.id, 'server-token')
    if (!options.queryFn) throw new Error('account detail query options require a query function')

    await expect(options.queryFn({} as never)).resolves.toEqual(account)
    expect(options.queryKey).toEqual(accountKeys.detail(account.id))
    expect(listAccountsMock).toHaveBeenCalledWith('server-token')
  })

  it('distinguishes successful absence from an account-list transport failure', async () => {
    const missing = accountDetailQueryOptions('missing', 'server-token')
    if (!missing.queryFn) throw new Error('account detail query options require a query function')
    listAccountsMock.mockResolvedValueOnce([])

    await expect(missing.queryFn({} as never)).resolves.toBeNull()

    const backendError = new Error('backend unavailable')
    listAccountsMock.mockRejectedValueOnce(backendError)
    await expect(missing.queryFn({} as never)).rejects.toBe(backendError)
  })
})

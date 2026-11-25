import { describe, expect, it, vi } from 'vitest'

import { accountKeys } from './queryKeys'
import { accountDetailQueryOptions, accountListQueryOptions } from './queryOptions'

const { listAccountsMock, getAccountMock } = vi.hoisted(() => ({
  listAccountsMock: vi.fn(),
  getAccountMock: vi.fn(),
}))

vi.mock('../api', () => ({
  listAccounts: listAccountsMock,
  getAccount: getAccountMock,
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

  it('resolves one account via the single-account endpoint on the canonical detail key', async () => {
    const account = {
      id: 'account-1',
      nickname: 'Main',
      accountNoMasked: '111-***',
      broker: 'MOCK' as const,
    }
    getAccountMock.mockResolvedValue(account)

    const options = accountDetailQueryOptions(account.id, 'server-token')
    if (!options.queryFn) throw new Error('account detail query options require a query function')

    await expect(options.queryFn({} as never)).resolves.toEqual(account)
    expect(options.queryKey).toEqual(accountKeys.detail(account.id))
    expect(getAccountMock).toHaveBeenCalledWith(account.id, 'server-token')
  })
})

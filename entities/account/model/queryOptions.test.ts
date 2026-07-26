import { describe, expect, it, vi } from 'vitest'

import { accountKeys } from './queryKeys'
import { accountListQueryOptions } from './queryOptions'

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
})

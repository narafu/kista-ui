import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getAuthTokenMock, listAccountsMock, notFoundMock } = vi.hoisted(() => ({
  getAuthTokenMock: vi.fn(),
  listAccountsMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('@shared/lib/auth/token', () => ({ getAuthToken: getAuthTokenMock }))
vi.mock('next/navigation', () => ({ notFound: notFoundMock }))
vi.mock('@entities/account', () => ({
  listAccounts: listAccountsMock,
  accountDetailQueryOptions: (id: string, token?: string) => ({
    queryKey: ['accounts', 'detail', id],
    queryFn: async () => {
      const accounts = await listAccountsMock(token)
      return accounts.find((account: { id: string }) => account.id === id) ?? null
    },
  }),
}))
vi.mock('@features/account/edit-account', () => ({ EditAccountForm: () => null }))
vi.mock('@widgets/page-header', () => ({ PageHeader: () => null }))

import AccountEditPage from './page'

describe('AccountEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('propagates an account transport failure instead of converting it to not found', async () => {
    const backendError = new Error('backend unavailable')
    getAuthTokenMock.mockResolvedValue('server-token')
    listAccountsMock.mockRejectedValue(backendError)

    await expect(AccountEditPage({ params: Promise.resolve({ id: 'account-1' }) })).rejects.toBe(backendError)
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it('uses not found only after a successful account lookup has no match', async () => {
    getAuthTokenMock.mockResolvedValue('server-token')
    listAccountsMock.mockResolvedValue([])

    await expect(AccountEditPage({ params: Promise.resolve({ id: 'missing' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFoundMock).toHaveBeenCalledOnce()
  })
})

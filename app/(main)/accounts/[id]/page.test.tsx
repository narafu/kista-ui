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
  accountKeys: {
    list: () => ['accounts', 'list'],
    detail: (id: string) => ['accounts', 'detail', id],
  },
  accountListQueryOptions: (token?: string) => ({
    queryKey: ['accounts', 'list'],
    queryFn: () => listAccountsMock(token),
  }),
  accountDetailQueryOptions: (id: string, token?: string) => ({
    queryKey: ['accounts', 'detail', id],
    queryFn: async () => {
      const accounts = await listAccountsMock(token)
      return accounts.find((account: { id: string }) => account.id === id) ?? null
    },
  }),
}))
vi.mock('@entities/strategy', () => ({
  strategyListByAccountQueryOptions: (id: string) => ({
    queryKey: ['strategies', 'list', 'account', id],
    queryFn: async () => [],
  }),
}))
vi.mock('@entities/trade', () => ({ getAccountPortfolio: vi.fn() }))
vi.mock('@entities/order', () => ({ getAccountOrderPreviews: vi.fn().mockResolvedValue({}) }))
vi.mock('@widgets/account-detail', () => ({
  AccountDetailTabs: () => null,
  AccountDetailContent: () => null,
}))
vi.mock('@widgets/page-header', () => ({ PageHeader: () => null }))

import AccountDetailPage from './page'

describe('AccountDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('propagates an account transport failure instead of converting it to not found', async () => {
    const backendError = new Error('backend unavailable')
    getAuthTokenMock.mockResolvedValue('server-token')
    listAccountsMock.mockRejectedValue(backendError)

    await expect(AccountDetailPage({ params: Promise.resolve({ id: 'account-1' }) })).rejects.toBe(backendError)
    expect(notFoundMock).not.toHaveBeenCalled()
  })
})

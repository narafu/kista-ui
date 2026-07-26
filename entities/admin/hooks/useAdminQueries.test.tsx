import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AdminStats, AdminUser } from '../model/types'
import { adminKeys } from '../model/queryKeys'
import {
  useApproveUserMutation,
  useChangeUserRoleMutation,
  useDeleteAdminUserMutation,
  useRejectUserMutation,
} from './useAdminQueries'

const {
  approveAdminUserMock,
  rejectAdminUserMock,
  changeAdminUserRoleMock,
  deleteAdminUserMock,
} = vi.hoisted(() => ({
  approveAdminUserMock: vi.fn(),
  rejectAdminUserMock: vi.fn(),
  changeAdminUserRoleMock: vi.fn(),
  deleteAdminUserMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('../api', () => ({
  listAdminUsers: vi.fn(),
  approveAdminUser: approveAdminUserMock,
  rejectAdminUser: rejectAdminUserMock,
  changeAdminUserRole: changeAdminUserRoleMock,
  deleteAdminUser: deleteAdminUserMock,
}))

const pendingUser: AdminUser = {
  id: 'user-1',
  nickname: 'pending user',
  status: 'PENDING',
  role: 'USER',
  createdAt: '2026-07-01T00:00:00Z',
}

const activeUser: AdminUser = {
  id: 'user-2',
  nickname: 'active user',
  status: 'ACTIVE',
  role: 'USER',
  createdAt: '2026-07-02T00:00:00Z',
}

const stats: AdminStats = {
  totalUsers: 2,
  pendingCount: 1,
  activeCount: 1,
  rejectedCount: 0,
  totalAccounts: 0,
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

describe('admin user mutation ownership', () => {
  beforeEach(() => {
    approveAdminUserMock.mockReset().mockResolvedValue(undefined)
    rejectAdminUserMock.mockReset().mockResolvedValue(undefined)
    changeAdminUserRoleMock.mockReset().mockResolvedValue(undefined)
    deleteAdminUserMock.mockReset().mockResolvedValue(undefined)
  })

  it('removes an approved user from pending lists while updating all-user lists and stats', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(adminKeys.users(), [pendingUser, activeUser])
    queryClient.setQueryData(adminKeys.users('PENDING', { from: '2026-07-01', to: '2026-07-31' }), [pendingUser])
    queryClient.setQueryData(adminKeys.users('ACTIVE', { from: '2026-07-01', to: '2026-07-31' }), [{ ...pendingUser, status: 'PENDING' }])
    queryClient.setQueryData(adminKeys.stats(), stats)
    const { result } = renderHook(() => useApproveUserMutation(), { wrapper: createWrapper(queryClient) })

    await result.current.mutateAsync(pendingUser.id)

    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users())).toEqual([
      { ...pendingUser, status: 'ACTIVE' },
      activeUser,
    ])
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users('PENDING', { from: '2026-07-01', to: '2026-07-31' }))).toEqual([])
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users('ACTIVE', { from: '2026-07-01', to: '2026-07-31' }))).toEqual([
      { ...pendingUser, status: 'ACTIVE' },
    ])
    expect(queryClient.getQueryData<AdminStats>(adminKeys.stats())).toEqual({ ...stats, pendingCount: 0, activeCount: 2 })
  })

  it('removes a rejected user from pending lists while updating all-user lists and stats', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(adminKeys.users(), [pendingUser, activeUser])
    queryClient.setQueryData(adminKeys.users('PENDING'), [pendingUser])
    queryClient.setQueryData(adminKeys.users('REJECTED'), [{ ...pendingUser, status: 'PENDING' }])
    queryClient.setQueryData(adminKeys.stats(), stats)
    const { result } = renderHook(() => useRejectUserMutation(), { wrapper: createWrapper(queryClient) })

    await result.current.mutateAsync(pendingUser.id)

    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users())).toEqual([
      { ...pendingUser, status: 'REJECTED' },
      activeUser,
    ])
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users('PENDING'))).toEqual([])
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users('REJECTED'))).toEqual([
      { ...pendingUser, status: 'REJECTED' },
    ])
    expect(queryClient.getQueryData<AdminStats>(adminKeys.stats())).toEqual({ ...stats, pendingCount: 0, rejectedCount: 1 })
  })

  it('updates a changed role in the affected user row without a route refresh', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(adminKeys.users(), [activeUser])
    const { result } = renderHook(() => useChangeUserRoleMutation(), { wrapper: createWrapper(queryClient) })

    await result.current.mutateAsync({ userId: activeUser.id, role: 'ADMIN' })

    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users())).toEqual([
      { ...activeUser, role: 'ADMIN' },
    ])
  })

  it('removes a deleted user row and decrements its overview count without a route refresh', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(adminKeys.users(), [pendingUser, activeUser])
    queryClient.setQueryData(adminKeys.stats(), stats)
    const { result } = renderHook(() => useDeleteAdminUserMutation(), { wrapper: createWrapper(queryClient) })

    await result.current.mutateAsync(pendingUser.id)

    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users())).toEqual([activeUser])
    expect(queryClient.getQueryData<AdminStats>(adminKeys.stats())).toEqual({
      ...stats,
      totalUsers: 1,
      pendingCount: 0,
    })
  })
})

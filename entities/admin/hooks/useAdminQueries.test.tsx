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

const oldestActiveUser: AdminUser = {
  id: 'user-3',
  nickname: 'oldest active user',
  status: 'ACTIVE',
  role: 'USER',
  createdAt: '2026-06-15T00:00:00Z',
}

const rejectedUser: AdminUser = {
  id: 'user-4',
  nickname: 'rejected user',
  status: 'REJECTED',
  role: 'USER',
  createdAt: '2026-07-04T00:00:00Z',
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

  it('adds an approved user once to every loaded matching target and all-user list in created-at order', async () => {
    const queryClient = createTestQueryClient()
    const transitioningUser = { ...pendingUser, createdAt: '2026-07-03T00:00:00Z' }
    const julyRange = { from: '2026-07-01', to: '2026-07-31' }
    const juneRange = { from: '2026-06-01', to: '2026-06-30' }
    const unloadedKey = adminKeys.users('ACTIVE', { from: '2026-05-01', to: '2026-05-31' })

    queryClient.setQueryData(adminKeys.users('PENDING', julyRange), [transitioningUser])
    queryClient.setQueryData(adminKeys.users('ACTIVE'), [activeUser, oldestActiveUser])
    queryClient.setQueryData(adminKeys.users('ACTIVE', julyRange), [activeUser])
    queryClient.setQueryData(adminKeys.users('ACTIVE', juneRange), [oldestActiveUser])
    queryClient.setQueryData(adminKeys.users('REJECTED'), [rejectedUser])
    queryClient.setQueryData(adminKeys.users(), [activeUser, oldestActiveUser])
    queryClient.setQueryData(adminKeys.users(undefined, julyRange), [activeUser])
    queryClient.setQueryData(adminKeys.users(undefined, juneRange), [oldestActiveUser])

    const { result } = renderHook(() => useApproveUserMutation(), { wrapper: createWrapper(queryClient) })

    await result.current.mutateAsync(transitioningUser.id)

    const approvedUser = { ...transitioningUser, status: 'ACTIVE' as const }
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users('PENDING', julyRange))).toEqual([])
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users('ACTIVE'))).toEqual([approvedUser, activeUser, oldestActiveUser])
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users('ACTIVE', julyRange))).toEqual([approvedUser, activeUser])
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users('ACTIVE', juneRange))).toEqual([oldestActiveUser])
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users('REJECTED'))).toEqual([rejectedUser])
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users())).toEqual([approvedUser, activeUser, oldestActiveUser])
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users(undefined, julyRange))).toEqual([approvedUser, activeUser])
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users(undefined, juneRange))).toEqual([oldestActiveUser])
    expect(queryClient.getQueryState(unloadedKey)).toBeUndefined()
  })

  it('uses the API KST date semantics when adding a transitioned user to a loaded range', async () => {
    const queryClient = createTestQueryClient()
    const kstJulyUser = { ...pendingUser, createdAt: '2026-06-30T15:30:00Z' }
    const julyRange = { from: '2026-07-01', to: '2026-07-01' }
    const juneRange = { from: '2026-06-30', to: '2026-06-30' }

    queryClient.setQueryData(adminKeys.users('PENDING', julyRange), [kstJulyUser])
    queryClient.setQueryData(adminKeys.users('ACTIVE', julyRange), [])
    queryClient.setQueryData(adminKeys.users('ACTIVE', juneRange), [])
    queryClient.setQueryData(adminKeys.users(undefined, julyRange), [])

    const { result } = renderHook(() => useApproveUserMutation(), { wrapper: createWrapper(queryClient) })

    await result.current.mutateAsync(kstJulyUser.id)

    const approvedUser = { ...kstJulyUser, status: 'ACTIVE' as const }
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users('ACTIVE', julyRange))).toEqual([approvedUser])
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users('ACTIVE', juneRange))).toEqual([])
    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users(undefined, julyRange))).toEqual([approvedUser])
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

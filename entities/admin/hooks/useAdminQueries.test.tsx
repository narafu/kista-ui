import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AdminUser } from '../model/types'
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

  it('updates an approved user row without a route refresh', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(adminKeys.users(), [pendingUser, activeUser])
    const { result } = renderHook(() => useApproveUserMutation(), { wrapper: createWrapper(queryClient) })

    await result.current.mutateAsync(pendingUser.id)

    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users())).toEqual([
      { ...pendingUser, status: 'ACTIVE' },
      activeUser,
    ])
  })

  it('updates a rejected user row without a route refresh', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(adminKeys.users(), [pendingUser, activeUser])
    const { result } = renderHook(() => useRejectUserMutation(), { wrapper: createWrapper(queryClient) })

    await result.current.mutateAsync(pendingUser.id)

    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users())).toEqual([
      { ...pendingUser, status: 'REJECTED' },
      activeUser,
    ])
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

  it('removes a deleted user row without a route refresh', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(adminKeys.users(), [pendingUser, activeUser])
    const { result } = renderHook(() => useDeleteAdminUserMutation(), { wrapper: createWrapper(queryClient) })

    await result.current.mutateAsync(pendingUser.id)

    expect(queryClient.getQueryData<AdminUser[]>(adminKeys.users())).toEqual([activeUser])
  })
})

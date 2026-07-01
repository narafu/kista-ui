import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminUser, User } from '../model/types'
import { useAdminUsersQuery, useMeQuery } from './useUserQueries'

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

vi.mock('../api', () => ({
  listAdminUsers: vi.fn(),
  reapply: vi.fn(),
  deleteMe: vi.fn(),
  updateNotificationChannel: vi.fn(),
  updateTelegram: vi.fn(),
  deleteTelegram: vi.fn(),
  approveAdminUser: vi.fn(),
  rejectAdminUser: vi.fn(),
  changeAdminUserRole: vi.fn(),
  deleteAdminUser: vi.fn(),
  getMeClient: vi.fn(),
  updateBalanceCheckEnabled: vi.fn(),
  updateNickname: vi.fn(),
  updateNotificationPref: vi.fn(),
}))

const baseUser: User = {
  id: 'user-1',
  nickname: 'narafu',
  status: 'ACTIVE',
  role: 'USER',
  hasTelegram: false,
  balanceCheckEnabled: true,
  notificationPrefs: {},
}

const baseAdminUser: AdminUser = {
  id: 'admin-user-1',
  nickname: 'pending user',
  status: 'PENDING',
  role: 'USER',
  createdAt: '2026-07-01T00:00:00Z',
}

describe('useMeQuery', () => {
  it('marks initial user data stale so settings refetch immediately on mount', () => {
    useQueryMock.mockReturnValue({ data: baseUser })

    renderHook(() => useMeQuery(baseUser))

    expect(useQueryMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      queryKey: ['me'],
      initialData: baseUser,
      initialDataUpdatedAt: 0,
    }))
  })
})

describe('useAdminUsersQuery', () => {
  it('marks initial admin user data stale so admin lists refetch immediately on mount', () => {
    useQueryMock.mockReturnValue({ data: [baseAdminUser] })

    renderHook(() => useAdminUsersQuery('PENDING', [baseAdminUser]))

    expect(useQueryMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      queryKey: ['adminUsers', 'PENDING'],
      initialData: [baseAdminUser],
      initialDataUpdatedAt: 0,
    }))
  })
})

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminUser } from '../model/types'
import { useAdminUsersQuery } from './useAdminQueries'
import { adminKeys } from '../model/queryKeys'

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
  approveAdminUser: vi.fn(),
  rejectAdminUser: vi.fn(),
  changeAdminUserRole: vi.fn(),
  deleteAdminUser: vi.fn(),
}))

const baseAdminUser: AdminUser = {
  id: 'admin-user-1',
  nickname: 'pending user',
  status: 'PENDING',
  role: 'USER',
  createdAt: '2026-07-01T00:00:00Z',
}

describe('useAdminUsersQuery', () => {
  it('marks initial admin user data stale so admin lists refetch immediately on mount', () => {
    useQueryMock.mockReturnValue({ data: [baseAdminUser] })

    renderHook(() => useAdminUsersQuery('PENDING', [baseAdminUser]))

    expect(useQueryMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      queryKey: adminKeys.users('PENDING'),
      initialData: [baseAdminUser],
      initialDataUpdatedAt: 0,
    }))
  })
})

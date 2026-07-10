import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { User } from '../model/types'
import { useMeQuery } from './useUserQueries'

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

vi.mock('../api', () => ({
  reapply: vi.fn(),
  deleteMe: vi.fn(),
  updateNotificationChannel: vi.fn(),
  updateTelegram: vi.fn(),
  deleteTelegram: vi.fn(),
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

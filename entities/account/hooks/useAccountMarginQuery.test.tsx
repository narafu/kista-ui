import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDeleteAccountMutation } from './useAccountMarginQuery'

const {
  mockPush,
  mockRefresh,
  mockRemoveQueries,
  mockToastSuccess,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  mockRemoveQueries: vi.fn(),
  mockToastSuccess: vi.fn(),
}))

let deleteAccountOnSuccess: (() => void) | undefined

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: vi.fn(),
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useQueryClient: () => ({
    removeQueries: mockRemoveQueries,
  }),
  useMutation: (options: { onSuccess?: () => void }) => {
    deleteAccountOnSuccess = options.onSuccess
    return { mutate: vi.fn(), isPending: false }
  },
}))

vi.mock('../api', () => ({
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  getMargin: vi.fn(),
  getPrices: vi.fn(),
  testKisConnection: vi.fn(),
}))

describe('useDeleteAccountMutation', () => {
  it('redirects to the accounts list after deleting an account', () => {
    renderHook(() => useDeleteAccountMutation('account-1'))

    deleteAccountOnSuccess?.()

    expect(mockToastSuccess).toHaveBeenCalledWith('계좌가 삭제되었습니다')
    expect(mockRemoveQueries).toHaveBeenCalledWith({ queryKey: ['accounts'] })
    expect(mockPush).toHaveBeenCalledWith('/accounts')
    expect(mockRefresh).toHaveBeenCalled()
  })
})

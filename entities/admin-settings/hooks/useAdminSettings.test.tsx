import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminSettingsQuery, useUpdateAdminSettingsMutation } from './useAdminSettings'
import { adminSettingsKeys } from '../model/queryKeys'

const { useQueryMock, useMutationMock, invalidateQueriesMock, successMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(() => ({})),
  useMutationMock: vi.fn((_options: unknown) => ({})),
  invalidateQueriesMock: vi.fn(),
  successMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}))
vi.mock('sonner', () => ({ toast: { success: successMock, error: vi.fn() } }))
vi.mock('../api', () => ({ getAdminSettings: vi.fn(), updateAdminSettings: vi.fn() }))

describe('admin settings hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses server data but refetches it on mount', () => {
    const settings = { auth: { approvalRequired: true } }
    renderHook(() => useAdminSettingsQuery(settings as never))
    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: adminSettingsKeys.all, initialData: settings, initialDataUpdatedAt: 0,
    }))
  })

  it('refetches admin and runtime settings only after a successful update', async () => {
    renderHook(() => useUpdateAdminSettingsMutation())
    const options = useMutationMock.mock.calls.at(-1)?.[0] as unknown as { onSuccess: () => Promise<void> }
    await options.onSuccess()
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: adminSettingsKeys.all })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['runtime-config'], refetchType: 'all' })
    expect(successMock).toHaveBeenCalled()
  })
})

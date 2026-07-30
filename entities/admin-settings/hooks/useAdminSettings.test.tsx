import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminSettingsQuery, useUpdateAdminSettingsMutation } from './useAdminSettings'
import { adminSettingsKeys } from '../model/queryKeys'

const { useQueryMock, useMutationMock, invalidateQueriesMock, setQueryDataMock, successMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(() => ({})),
  useMutationMock: vi.fn((_options: unknown) => ({})),
  invalidateQueriesMock: vi.fn(),
  setQueryDataMock: vi.fn(),
  successMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock, setQueryData: setQueryDataMock }),
  queryOptions: (options: unknown) => options,
}))
vi.mock('sonner', () => ({ toast: { success: successMock, error: vi.fn() } }))
vi.mock('../api', () => ({ getAdminSettings: vi.fn(), updateAdminSettings: vi.fn() }))

describe('admin settings hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads the hydrated canonical admin settings query without server initial data props', () => {
    renderHook(() => useAdminSettingsQuery())
    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: adminSettingsKeys.all,
    }))
    const queryOptions = (useQueryMock.mock.calls as unknown as Array<[Record<string, unknown>]>).at(-1)?.[0]
    expect(queryOptions).not.toHaveProperty('initialData')
  })

  it('stores a successful update in the canonical admin settings cache', async () => {
    let resolveEffect!: () => void
    const effectPromise = new Promise<void>((resolve) => {
      resolveEffect = resolve
    })
    const onSuccess = vi.fn(() => effectPromise)
    renderHook(() => useUpdateAdminSettingsMutation({ onSuccess }))
    const settings = { auth: { approvalRequired: false } }
    const options = (useMutationMock.mock.calls as unknown as Array<[{ onSuccess: (settings: unknown) => Promise<void> }]>).at(-1)?.[0]
    if (!options) throw new Error('mutation options were not registered')
    let settled = false
    const mutationSuccess = options.onSuccess(settings).then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(setQueryDataMock).toHaveBeenCalledWith(adminSettingsKeys.all, settings)
    expect(onSuccess).toHaveBeenCalledWith(settings)
    expect(settled).toBe(false)
    resolveEffect()
    await mutationSuccess
    expect(settled).toBe(true)
    expect(invalidateQueriesMock).not.toHaveBeenCalled()
    expect(successMock).not.toHaveBeenCalled()
  })
})

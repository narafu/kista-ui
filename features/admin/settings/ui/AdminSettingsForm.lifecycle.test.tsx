import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminKeys } from '@entities/admin'
import { adminSettingsKeys } from '@entities/admin-settings'
import { runtimeConfigKeys, type RuntimeConfig } from '@entities/runtime-config'
import { AdminSettingsForm } from './AdminSettingsForm'

const {
  getAdminSettingsMock,
  updateAdminSettingsMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  getAdminSettingsMock: vi.fn(),
  updateAdminSettingsMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock('@entities/admin-settings/api', () => ({
  getAdminSettings: getAdminSettingsMock,
  updateAdminSettings: updateAdminSettingsMock,
}))

vi.mock('sonner', () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}))

const BROKER_LABELS: Record<string, string> = { KIS: '한국투자증권', TOSS: '토스증권', MOCK: '모의계좌' }

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      tickers: [
        { code: 'SOXL', name: 'Direxion Daily Semiconductor Bull 3X Shares' },
        { code: 'TQQQ', name: 'ProShares UltraPro QQQ' },
        { code: 'QLD', name: 'ProShares Ultra QQQ' },
        { code: 'IBIT', name: 'iShares Bitcoin Trust' },
      ],
    },
    labelOf: (_category: string, code: string) => BROKER_LABELS[code] ?? code,
  }),
}))

const settings: RuntimeConfig = {
  auth: { approvalRequired: true },
  brokers: { KIS: { enabled: true }, TOSS: { enabled: true }, MOCK: { enabled: true } },
  benchmarks: {
    etf: { allowedValues: ['SPY', 'QQQ'], defaultValue: 'SPY' },
  },
  strategies: {
    INFINITE: { enabled: true, fields: {
      ticker: { customizable: true, allowedValues: ['SOXL', 'TQQQ'], defaultValue: 'SOXL' },
      divisionCount: { customizable: true, allowedValues: [20, 30], defaultValue: 20 },
    } },
    PRIVACY: { enabled: true, fields: { ticker: { customizable: false, allowedValues: ['SOXL'], defaultValue: 'SOXL' } } },
    VR: { enabled: true, fields: {
      ticker: { customizable: false, allowedValues: ['TQQQ'], defaultValue: 'TQQQ' },
      recurringMode: { customizable: true, allowedValues: ['DEPOSIT', 'HOLD', 'WITHDRAW'], defaultValue: 'HOLD' },
      bandWidth: { customizable: true, allowedValues: [10, 15], defaultValue: 15 },
      intervalWeeks: { customizable: true, allowedValues: [1, 2], defaultValue: 2 },
    } },
  },
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, reject, resolve }
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
}

function prepareRequiredRefetches(queryClient: QueryClient) {
  const runtime = deferred<RuntimeConfig>()
  const users = deferred<unknown[]>()
  const stats = deferred<Record<string, number>>()
  const usersKey = adminKeys.users()

  queryClient.setQueryDefaults(runtimeConfigKeys.all, { queryFn: () => runtime.promise })
  queryClient.setQueryDefaults(usersKey, { queryFn: () => users.promise })
  queryClient.setQueryDefaults(adminKeys.stats(), { queryFn: () => stats.promise })
  queryClient.setQueryData(runtimeConfigKeys.all, settings)
  queryClient.setQueryData(usersKey, [])
  queryClient.setQueryData(adminKeys.stats(), { pendingUsers: 1 })

  return { runtime, stats, users }
}

async function renderLoadedForm(queryClient: QueryClient) {
  queryClient.setQueryData(adminSettingsKeys.all, settings)
  render(
    <QueryClientProvider client={queryClient}>
      <AdminSettingsForm />
    </QueryClientProvider>,
  )
  await waitFor(() => expect(queryClient.isFetching({ queryKey: adminSettingsKeys.all })).toBe(0))
}

describe('AdminSettingsForm mutation lifecycle', () => {
  beforeEach(() => {
    getAdminSettingsMock.mockReset().mockResolvedValue(settings)
    updateAdminSettingsMock.mockReset().mockImplementation(async (next: RuntimeConfig) => structuredClone(next))
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
  })

  it('stays pending and defers success UI until every required approval refetch settles', async () => {
    const queryClient = createTestQueryClient()
    const refetches = prepareRequiredRefetches(queryClient)
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const user = userEvent.setup()

    try {
      await renderLoadedForm(queryClient)
      await user.click(screen.getByRole('switch', { name: '관리자 승인 필요' }))
      await user.click(screen.getByRole('button', { name: /변경 저장/ }))

      await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(3))
      expect(invalidateSpy.mock.calls).toEqual([
        [{ queryKey: runtimeConfigKeys.all, refetchType: 'all' }, { throwOnError: true }],
        [{ queryKey: adminKeys.usersRoot(), refetchType: 'all' }, { throwOnError: true }],
        [{ queryKey: adminKeys.stats(), refetchType: 'all' }, { throwOnError: true }],
      ])
      expect(screen.getByRole('button', { name: /저장 중/ })).toBeDisabled()
      expect(toastSuccessMock).not.toHaveBeenCalled()

      await user.type(screen.getByRole('combobox', { name: 'ETF 벤치마크 자산 추가' }), 'xyz')
      await user.click(screen.getByRole('button', { name: 'ETF 벤치마크 자산 추가 확정' }))
      expect(screen.getByRole('alert')).toHaveTextContent('지원하지 않는 ETF 심볼입니다: XYZ')

      await act(async () => {
        refetches.runtime.resolve({ ...settings, auth: { approvalRequired: false } })
        await Promise.resolve()
      })
      expect(screen.getByRole('button', { name: /저장 중/ })).toBeDisabled()
      expect(toastSuccessMock).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toBeInTheDocument()

      await act(async () => {
        refetches.users.resolve([])
        await Promise.resolve()
      })
      expect(screen.getByRole('button', { name: /저장 중/ })).toBeDisabled()
      expect(toastSuccessMock).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toBeInTheDocument()

      await act(async () => {
        refetches.stats.resolve({ pendingUsers: 0 })
      })
      await waitFor(() => expect(screen.queryByRole('button', { name: /저장 중/ })).not.toBeInTheDocument())
      expect(toastSuccessMock).toHaveBeenCalledWith('운영 설정을 저장했습니다.')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    } finally {
      queryClient.clear()
    }
  })

  it('routes a required refetch rejection through mutation error handling after all effects settle', async () => {
    const queryClient = createTestQueryClient()
    const refetches = prepareRequiredRefetches(queryClient)
    const unhandledRejection = vi.fn()
    const user = userEvent.setup()
    process.on('unhandledRejection', unhandledRejection)

    try {
      await renderLoadedForm(queryClient)
      await user.click(screen.getByRole('switch', { name: '관리자 승인 필요' }))
      await user.click(screen.getByRole('button', { name: /변경 저장/ }))

      await waitFor(() => expect(queryClient.isMutating()).toBe(1))
      await act(async () => {
        refetches.runtime.resolve({ ...settings, auth: { approvalRequired: false } })
        refetches.stats.reject(new Error('stats refetch failed'))
        await Promise.resolve()
      })
      expect(screen.getByRole('button', { name: /저장 중/ })).toBeDisabled()
      expect(toastErrorMock).not.toHaveBeenCalled()
      expect(toastSuccessMock).not.toHaveBeenCalled()

      await act(async () => {
        refetches.users.resolve([])
      })
      await waitFor(() => expect(queryClient.isMutating()).toBe(0))
      expect(toastErrorMock).toHaveBeenCalledWith('운영 설정을 저장하지 못했습니다.')
      expect(toastSuccessMock).not.toHaveBeenCalled()
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      expect(unhandledRejection).not.toHaveBeenCalled()
    } finally {
      process.off('unhandledRejection', unhandledRejection)
      queryClient.clear()
    }
  })
})

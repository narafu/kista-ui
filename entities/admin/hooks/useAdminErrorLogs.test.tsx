import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { adminKeys } from '../model/queryKeys'
import type { AppErrorLog } from '../model/types'
import { useDeleteAdminErrorLogsMutation } from './useAdminErrorLogs'

const { softDeleteAdminErrorLogMock } = vi.hoisted(() => ({ softDeleteAdminErrorLogMock: vi.fn() }))

vi.mock('../api', () => ({ softDeleteAdminErrorLog: softDeleteAdminErrorLogMock }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const logs: AppErrorLog[] = [
  { id: 'log-1', errorType: 'API', message: 'first', stackTrace: 'trace', context: {}, createdAt: '2026-07-01T00:00:00Z' },
  { id: 'log-2', errorType: 'AUTH', message: 'second', stackTrace: 'trace', context: {}, createdAt: '2026-07-02T00:00:00Z' },
]

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('admin error-log mutation ownership', () => {
  it('removes only successfully deleted logs from every matching range cache', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    queryClient.setQueryData(adminKeys.errorLogs({ from: '2026-07-01', to: '2026-07-31' }), logs)
    queryClient.setQueryData(adminKeys.errorLogs({ from: '2026-07-01', to: '2026-07-02' }), logs)
    softDeleteAdminErrorLogMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('boom'))

    const { result } = renderHook(() => useDeleteAdminErrorLogsMutation(), { wrapper: createWrapper(queryClient) })
    const results = await result.current.mutateAsync(['log-1', 'log-2'])

    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected'])
    expect(queryClient.getQueryData<AppErrorLog[]>(adminKeys.errorLogs({ from: '2026-07-01', to: '2026-07-31' }))).toEqual([logs[1]])
    expect(queryClient.getQueryData<AppErrorLog[]>(adminKeys.errorLogs({ from: '2026-07-01', to: '2026-07-02' }))).toEqual([logs[1]])
  })
})

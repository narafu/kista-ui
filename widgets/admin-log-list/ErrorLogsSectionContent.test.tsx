import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { adminKeys } from '@entities/admin'
import type { AppErrorLog } from '@entities/admin'
import { ErrorLogsSectionContent } from './ErrorLogsSectionContent'

vi.mock('@features/admin/error-logs', () => ({
  ErrorLogsSectionClient: ({ logs }: { logs: AppErrorLog[] }) => <div>{logs.map((log) => <span key={log.id}>{log.message}</span>)}</div>,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/logs',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const logs: AppErrorLog[] = [
  { id: 'log-1', errorType: 'API', message: 'first', stackTrace: 'trace', context: {}, createdAt: '2026-07-01T00:00:00Z' },
  { id: 'log-2', errorType: 'AUTH', message: 'second', stackTrace: 'trace', context: {}, createdAt: '2026-07-02T00:00:00Z' },
]

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('ErrorLogsSectionContent', () => {
  it('derives visible rows and total from the canonical error-log cache after deletion', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const params = { from: '2026-07-01', to: '2026-07-31' }
    queryClient.setQueryData(adminKeys.errorLogs(params), logs)

    render(<ErrorLogsSectionContent page={1} size={10} range="custom" from={params.from} to={params.to} />, { wrapper: createWrapper(queryClient) })
    expect(screen.getByText('총 2건')).toBeInTheDocument()
    expect(screen.getByText('first')).toBeInTheDocument()

    act(() => queryClient.setQueryData(adminKeys.errorLogs(params), [logs[1]]))

    await waitFor(() => {
      expect(screen.getByText('총 1건')).toBeInTheDocument()
      expect(screen.queryByText('first')).not.toBeInTheDocument()
      expect(screen.getByText('second')).toBeInTheDocument()
    })
  })
})

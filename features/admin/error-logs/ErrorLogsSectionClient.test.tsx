import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { AppErrorLog } from '@entities/user'
import { ErrorLogsSectionClient } from './ErrorLogsSectionClient'

const {
  refreshMock,
  successMock,
  errorMock,
  warningMock,
  softDeleteAdminErrorLogMock,
} = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  successMock: vi.fn(),
  errorMock: vi.fn(),
  warningMock: vi.fn(),
  softDeleteAdminErrorLogMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: successMock,
    error: errorMock,
    warning: warningMock,
  },
}))

vi.mock('@/components/ui/button-variants', () => ({
  buttonVariants: () => '',
}))

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
  AlertDialogAction: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
}))

vi.mock('@entities/user', () => ({
  softDeleteAdminErrorLog: softDeleteAdminErrorLogMock,
}))

const logs: AppErrorLog[] = [
  {
    id: 'log-1',
    errorType: 'API',
    message: 'first',
    stackTrace: 'trace-1',
    context: {},
    createdAt: '2026-07-02T00:00:00Z',
  },
  {
    id: 'log-2',
    errorType: 'AUTH',
    message: 'second',
    stackTrace: 'trace-2',
    context: {},
    createdAt: '2026-07-02T01:00:00Z',
  },
]

describe('ErrorLogsSectionClient', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    successMock.mockReset()
    errorMock.mockReset()
    warningMock.mockReset()
    softDeleteAdminErrorLogMock.mockReset()
  })

  it('selects the current page logs with the master checkbox', async () => {
    const user = userEvent.setup()

    render(<ErrorLogsSectionClient logs={logs} />)

    await user.click(screen.getByRole('checkbox', { name: '현재 페이지 오류 로그 전체 선택' }))

    expect(screen.getByRole('checkbox', { name: '오류 로그 선택 log-1' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '오류 로그 선택 log-2' })).toBeChecked()
    expect(screen.getByText('2건 선택됨')).toBeInTheDocument()
  })

  it('soft deletes selected logs on the current page and refreshes the list', async () => {
    const user = userEvent.setup()
    softDeleteAdminErrorLogMock.mockResolvedValue(undefined)

    render(<ErrorLogsSectionClient logs={logs} />)

    await user.click(screen.getByRole('checkbox', { name: '오류 로그 선택 log-1' }))
    await user.click(screen.getByRole('button', { name: '선택 1건 삭제' }))
    await user.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(softDeleteAdminErrorLogMock).toHaveBeenCalledWith('log-1')
      expect(refreshMock).toHaveBeenCalled()
      expect(successMock).toHaveBeenCalledWith('1건을 삭제했습니다')
    })
  })

  it('reports partial failures while still refreshing successful deletions', async () => {
    const user = userEvent.setup()
    softDeleteAdminErrorLogMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('boom'))

    render(<ErrorLogsSectionClient logs={logs} />)

    await user.click(screen.getByRole('checkbox', { name: '현재 페이지 오류 로그 전체 선택' }))
    await user.click(screen.getByRole('button', { name: '선택 2건 삭제' }))
    await user.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled()
      expect(warningMock).toHaveBeenCalledWith('1건 삭제, 1건 실패')
    })
  })
})

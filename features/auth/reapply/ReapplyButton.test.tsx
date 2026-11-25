import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReapplyButton } from './ReapplyButton'

const { reapplyMock, toastErrorMock, toastSuccessMock, meMock } = vi.hoisted(() => ({
  meMock: vi.fn(),
  reapplyMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}))

vi.mock('@entities/user', () => ({
  reapply: reapplyMock,
  useMeQuery: () => ({ data: meMock() }),
  userKeys: { me: () => ['me'] },
}))

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

describe('ReapplyButton', () => {
  beforeEach(() => {
    meMock.mockReset()
    reapplyMock.mockReset()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
  })

  it('requests reapproval', async () => {
    reapplyMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<ReapplyButton />, { wrapper })

    await user.click(screen.getByRole('button', { name: '승인 재신청' }))

    expect(reapplyMock).toHaveBeenCalled()
    expect(toastSuccessMock).toHaveBeenCalledWith('승인 재신청을 완료했습니다')
  })

  it('blocks a repeat request while reapplyAvailableAt is in the future without calling reapply', async () => {
    meMock.mockReturnValue({ reapplyAvailableAt: new Date(Date.now() + 30 * 60000).toISOString() })
    const user = userEvent.setup()
    render(<ReapplyButton />, { wrapper })

    const button = screen.getByRole('button', { name: /분 후 재신청 가능/ })
    await user.click(button)

    expect(reapplyMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining('분 후 다시 요청할 수 있습니다'))
  })
})

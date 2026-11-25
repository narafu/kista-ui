import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RejectedReapplyButton } from './RejectedReapplyButton'

const reapplyMock = vi.fn()
const routerPushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock }),
}))

vi.mock('@entities/user', () => ({
  reapply: () => reapplyMock(),
  userKeys: { me: () => ['me'] },
}))

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

describe('RejectedReapplyButton', () => {
  beforeEach(() => {
    reapplyMock.mockReset()
    routerPushMock.mockReset()
  })

  it('navigates to the pending page after a successful reapply request', async () => {
    reapplyMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<RejectedReapplyButton />, { wrapper })

    await user.click(screen.getByRole('button', { name: '승인 재신청' }))

    expect(reapplyMock).toHaveBeenCalled()
    expect(routerPushMock).toHaveBeenCalledWith('/pending')
  })

  it('shows an error message and stays on the page when the request fails', async () => {
    reapplyMock.mockRejectedValue(new Error('network error'))
    const user = userEvent.setup()
    render(<RejectedReapplyButton />, { wrapper })

    await user.click(screen.getByRole('button', { name: '승인 재신청' }))

    expect(await screen.findByText('재신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')).toBeInTheDocument()
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('is enabled when reapplyAvailableAt is null', () => {
    render(<RejectedReapplyButton reapplyAvailableAt={null} />, { wrapper })

    expect(screen.getByRole('button', { name: '승인 재신청' })).toBeEnabled()
  })

  it('disables the button and blocks the request while reapplyAvailableAt is in the future', () => {
    const future = new Date(Date.now() + 90 * 60000).toISOString()
    render(<RejectedReapplyButton reapplyAvailableAt={future} />, { wrapper })

    expect(screen.getByRole('button', { name: /후 재신청 가능/ })).toBeDisabled()
    expect(screen.getByText('1시간 30분 후 재신청 가능')).toBeInTheDocument()
  })
})

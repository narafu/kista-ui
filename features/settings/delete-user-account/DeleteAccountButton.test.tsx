import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeleteAccountButton } from './DeleteAccountButton'

const mutateAsyncMock = vi.fn()

vi.mock('@entities/user', () => ({
  useDeleteMeMutation: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe('DeleteAccountButton', () => {
  beforeEach(() => {
    mutateAsyncMock.mockClear()
  })

  it('does not call the delete mutation just by opening the confirmation dialog', async () => {
    const user = userEvent.setup()

    render(<DeleteAccountButton />)

    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))

    expect(screen.getByText('정말 탈퇴하시겠습니까?')).toBeInTheDocument()
    expect(mutateAsyncMock).not.toHaveBeenCalled()
  })

  it('calls the delete mutation when the withdrawal is confirmed', async () => {
    const user = userEvent.setup()

    render(<DeleteAccountButton />)

    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))
    await user.click(screen.getByRole('button', { name: '탈퇴 확인' }))

    expect(mutateAsyncMock).toHaveBeenCalledTimes(1)
  })

  it('does not call the delete mutation when cancelled', async () => {
    const user = userEvent.setup()

    render(<DeleteAccountButton />)

    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))
    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(mutateAsyncMock).not.toHaveBeenCalled()
    expect(screen.queryByText('정말 탈퇴하시겠습니까?')).not.toBeInTheDocument()
  })
})

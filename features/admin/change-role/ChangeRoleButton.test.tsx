import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChangeRoleButton } from './ChangeRoleButton'

const mutateMock = vi.fn()

vi.mock('@entities/admin', () => ({
  useChangeUserRoleMutation: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe('ChangeRoleButton', () => {
  beforeEach(() => {
    mutateMock.mockClear()
  })

  it('opens a confirmation dialog without triggering the mutation on click', async () => {
    const user = userEvent.setup()

    render(<ChangeRoleButton userId="user-1" currentRole="USER" />)

    await user.click(screen.getByRole('button', { name: '→ ADMIN' }))

    expect(screen.getByText('역할을 변경하시겠습니까?')).toBeInTheDocument()
    expect(screen.getByText(/ADMIN은 모든 관리자 기능에 접근할 수 있습니다/)).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('changes a USER to ADMIN on confirm', async () => {
    const user = userEvent.setup()

    render(<ChangeRoleButton userId="user-1" currentRole="USER" />)

    await user.click(screen.getByRole('button', { name: '→ ADMIN' }))
    await user.click(screen.getByRole('button', { name: '변경' }))

    expect(mutateMock).toHaveBeenCalledWith(
      { userId: 'user-1', role: 'ADMIN' },
      expect.anything(),
    )
  })

  it('changes an ADMIN back to USER on confirm', async () => {
    const user = userEvent.setup()

    render(<ChangeRoleButton userId="user-2" currentRole="ADMIN" />)

    await user.click(screen.getByRole('button', { name: '→ USER' }))
    await user.click(screen.getByRole('button', { name: '변경' }))

    expect(mutateMock).toHaveBeenCalledWith(
      { userId: 'user-2', role: 'USER' },
      expect.anything(),
    )
  })

  it('does not trigger the mutation when the dialog is cancelled', async () => {
    const user = userEvent.setup()

    render(<ChangeRoleButton userId="user-3" currentRole="USER" />)

    await user.click(screen.getByRole('button', { name: '→ ADMIN' }))
    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('disables the button and blocks the mutation for the current admin account', async () => {
    const user = userEvent.setup()

    render(<ChangeRoleButton userId="admin-1" currentRole="ADMIN" isSelf />)

    const button = screen.getByRole('button', { name: '→ USER' })
    expect(button).toBeDisabled()

    await user.click(button)

    expect(mutateMock).not.toHaveBeenCalled()
  })
})

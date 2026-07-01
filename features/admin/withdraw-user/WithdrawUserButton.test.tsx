import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WithdrawUserButton } from './WithdrawUserButton'

const mutateMock = vi.fn()

vi.mock('@entities/user', () => ({
  useDeleteAdminUserMutation: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}))

describe('WithdrawUserButton', () => {
  it('opens the forced-withdraw modal for other users', async () => {
    const user = userEvent.setup()

    render(<WithdrawUserButton userId="user-1" nickname="홍길동" />)

    await user.click(screen.getByRole('button', { name: '탈퇴' }))

    expect(screen.getByText('회원 강제 탈퇴')).toBeInTheDocument()
    expect(screen.getByText(/홍길동/)).toBeInTheDocument()
  })

  it('disables the button for the current admin account', () => {
    render(<WithdrawUserButton userId="admin-1" nickname="관리자" isSelf />)

    expect(screen.getByRole('button', { name: '탈퇴' })).toBeDisabled()
    expect(screen.queryByText('회원 강제 탈퇴')).not.toBeInTheDocument()
  })
})

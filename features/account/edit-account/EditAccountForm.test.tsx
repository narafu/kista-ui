import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditAccountForm } from './EditAccountForm'
import type { Account } from '@entities/account'

const {
  updateMutateMock,
  deleteMutateMock,
  pushMock,
  invalidateQueriesMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  updateMutateMock: vi.fn(),
  deleteMutateMock: vi.fn(),
  pushMock: vi.fn(),
  invalidateQueriesMock: vi.fn(() => Promise.resolve()),
  toastSuccessMock: vi.fn(),
}))

vi.mock('@entities/account', () => ({
  useUpdateAccountMutation: () => ({ mutate: updateMutateMock, isPending: false }),
  useDeleteAccountMutation: () => ({ mutate: deleteMutateMock, isPending: false }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock },
}))

vi.mock('@entities/strategy', () => ({
  strategyKeys: { all: ['strategies'] },
}))

vi.mock('@entities/stats', () => ({
  statsKeys: { all: ['stats'] },
}))

vi.mock('@entities/order', () => ({
  orderKeys: { all: ['orders'] },
}))

vi.mock('@entities/trade', () => ({
  tradeKeys: { all: ['trades'] },
}))

const account: Account = {
  id: 'acc-1',
  nickname: '메인 계좌',
  accountNoMasked: '7442****',
  broker: 'KIS',
}

describe('EditAccountForm', () => {
  it('submits the trimmed nickname on save', async () => {
    const user = userEvent.setup()
    render(<EditAccountForm account={account} />)

    const nicknameInput = screen.getByLabelText('계좌 별칭')
    await user.clear(nicknameInput)
    await user.type(nicknameInput, '  새 별칭  ')
    await user.click(screen.getAllByRole('button', { name: '저장' })[0])

    expect(updateMutateMock).toHaveBeenCalledWith(
      { nickname: '새 별칭' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('keeps the permanent-delete action disabled until the nickname is typed exactly', async () => {
    const user = userEvent.setup()
    render(<EditAccountForm account={account} />)

    await user.click(screen.getByText('계좌 삭제'))
    const confirmInput = screen.getByPlaceholderText(account.nickname)
    const deleteButton = screen.getByRole('button', { name: '영구 삭제' })

    await user.type(confirmInput, '틀린 별칭')
    expect(deleteButton).toBeDisabled()
    expect(deleteMutateMock).not.toHaveBeenCalled()

    await user.clear(confirmInput)
    await user.type(confirmInput, account.nickname)
    expect(deleteButton).not.toBeDisabled()

    await user.click(deleteButton)
    expect(deleteMutateMock).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('navigates after account update succeeds', async () => {
    const user = userEvent.setup()
    render(<EditAccountForm account={account} />)

    await user.click(screen.getAllByRole('button', { name: '저장' })[0])

    const options = updateMutateMock.mock.calls.at(-1)?.[1] as { onSuccess: () => void }
    options.onSuccess()

    expect(toastSuccessMock).toHaveBeenCalledWith('계좌가 수정되었습니다')
    expect(pushMock).toHaveBeenCalledWith('/accounts/acc-1')
  })

  it('invalidates dependent domains before navigating after delete succeeds', async () => {
    const user = userEvent.setup()
    render(<EditAccountForm account={account} />)

    await user.click(screen.getByText('계좌 삭제'))
    await user.type(screen.getByPlaceholderText(account.nickname), account.nickname)
    await user.click(screen.getByRole('button', { name: '영구 삭제' }))

    const options = deleteMutateMock.mock.calls.at(-1)?.[1] as { onSuccess: () => Promise<void> }
    await options.onSuccess()

    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['strategies'] })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['stats'] })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['orders'] })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['trades'] })
    expect(pushMock).toHaveBeenCalledWith('/accounts')
  })

  it('still navigates after delete succeeds even if one dependent invalidation rejects', async () => {
    invalidateQueriesMock.mockRejectedValueOnce(new Error('stats refetch failed'))
    const user = userEvent.setup()
    render(<EditAccountForm account={account} />)

    await user.click(screen.getByText('계좌 삭제'))
    await user.type(screen.getByPlaceholderText(account.nickname), account.nickname)
    await user.click(screen.getByRole('button', { name: '영구 삭제' }))

    const options = deleteMutateMock.mock.calls.at(-1)?.[1] as { onSuccess: () => Promise<void> }
    await options.onSuccess()

    expect(toastSuccessMock).toHaveBeenCalledWith('계좌가 삭제되었습니다')
    expect(pushMock).toHaveBeenCalledWith('/accounts')
  })
})

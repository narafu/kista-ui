import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditAccountForm } from './EditAccountForm'
import type { Account } from '@entities/account'

const updateMutateMock = vi.fn()
const deleteMutateMock = vi.fn()

vi.mock('@entities/account', () => ({
  useUpdateAccountMutation: () => ({ mutate: updateMutateMock, isPending: false }),
  useDeleteAccountMutation: () => ({ mutate: deleteMutateMock, isPending: false }),
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

    expect(updateMutateMock).toHaveBeenCalledWith({ nickname: '새 별칭' })
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
    expect(deleteMutateMock).toHaveBeenCalled()
  })
})

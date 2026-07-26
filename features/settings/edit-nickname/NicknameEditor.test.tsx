import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NicknameEditor } from './NicknameEditor'

const mutateMock = vi.fn()
const routerRefreshMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}))

vi.mock('@entities/user', () => ({
  useUpdateNicknameMutation: () => ({ mutate: mutateMock, isPending: false }),
}))

describe('NicknameEditor', () => {
  beforeEach(() => {
    mutateMock.mockReset()
    routerRefreshMock.mockReset()
  })

  it('rejects an empty nickname without calling the mutation', async () => {
    const user = userEvent.setup()
    render(<NicknameEditor initialNickname="홍길동" />)

    await user.click(screen.getByRole('button', { name: '닉네임 수정' }))
    await user.clear(screen.getByLabelText('닉네임'))
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByText('닉네임을 입력해 주세요.')).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('saves a valid nickname and exits editing mode on success', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_value, { onSuccess }: { onSuccess: () => void }) => onSuccess())
    render(<NicknameEditor initialNickname="홍길동" />)

    await user.click(screen.getByRole('button', { name: '닉네임 수정' }))
    await user.clear(screen.getByLabelText('닉네임'))
    await user.type(screen.getByLabelText('닉네임'), ' 새 닉네임 ')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(mutateMock).toHaveBeenCalledWith('새 닉네임', expect.objectContaining({ onSuccess: expect.any(Function) }))
    expect(screen.queryByLabelText('닉네임')).not.toBeInTheDocument()
    expect(routerRefreshMock).not.toHaveBeenCalled()
  })

  it('cancels editing with the escape key without saving', async () => {
    const user = userEvent.setup()
    render(<NicknameEditor initialNickname="홍길동" />)

    await user.click(screen.getByRole('button', { name: '닉네임 수정' }))
    await user.type(screen.getByLabelText('닉네임'), '변경중')
    await user.keyboard('{Escape}')

    expect(screen.queryByLabelText('닉네임')).not.toBeInTheDocument()
    expect(screen.getByText('홍길동')).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })
})

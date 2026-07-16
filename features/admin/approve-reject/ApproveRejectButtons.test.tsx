import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApproveRejectButtons } from './ApproveRejectButtons'

const approveMutateMock = vi.fn()
const rejectMutateMock = vi.fn()
let approvePending = false
let rejectPending = false

vi.mock('@entities/admin', () => ({
  useApproveUserMutation: () => ({
    mutate: approveMutateMock,
    isPending: approvePending,
  }),
  useRejectUserMutation: () => ({
    mutate: rejectMutateMock,
    isPending: rejectPending,
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe('ApproveRejectButtons', () => {
  beforeEach(() => {
    approveMutateMock.mockClear()
    rejectMutateMock.mockClear()
    approvePending = false
    rejectPending = false
  })

  it('calls the approve mutation with the userId on approve click', async () => {
    const user = userEvent.setup()

    render(<ApproveRejectButtons userId="user-1" nickname="홍길동" />)

    await user.click(screen.getByRole('button', { name: '승인' }))

    expect(approveMutateMock).toHaveBeenCalledWith('user-1', expect.anything())
    expect(rejectMutateMock).not.toHaveBeenCalled()
  })

  it('has no confirmation step before triggering the approve mutation', async () => {
    const user = userEvent.setup()

    render(<ApproveRejectButtons userId="user-3" nickname="이영희" />)

    await user.click(screen.getByRole('button', { name: '승인' }))

    expect(approveMutateMock).toHaveBeenCalledTimes(1)
  })

  it('opens a confirmation dialog without triggering the reject mutation on click', async () => {
    const user = userEvent.setup()

    render(<ApproveRejectButtons userId="user-2" nickname="김철수" />)

    await user.click(screen.getByRole('button', { name: '거절' }))

    expect(screen.getByText('가입을 거절하시겠습니까?')).toBeInTheDocument()
    expect(screen.getByText(/김철수/)).toBeInTheDocument()
    expect(rejectMutateMock).not.toHaveBeenCalled()
    expect(approveMutateMock).not.toHaveBeenCalled()
  })

  it('calls the reject mutation with the userId on confirm', async () => {
    const user = userEvent.setup()

    render(<ApproveRejectButtons userId="user-2" nickname="김철수" />)

    await user.click(screen.getByRole('button', { name: '거절' }))
    await user.click(screen.getByRole('button', { name: '거절' }))

    expect(rejectMutateMock).toHaveBeenCalledWith('user-2', expect.anything())
    expect(approveMutateMock).not.toHaveBeenCalled()
  })

  it('does not trigger the reject mutation when the dialog is cancelled', async () => {
    const user = userEvent.setup()

    render(<ApproveRejectButtons userId="user-4" nickname="박민수" />)

    await user.click(screen.getByRole('button', { name: '거절' }))
    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(rejectMutateMock).not.toHaveBeenCalled()
  })

  it('disables both buttons while a mutation is pending', () => {
    approvePending = true

    render(<ApproveRejectButtons userId="user-5" nickname="박민수" />)

    expect(screen.getByRole('button', { name: '승인' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '거절' })).toBeDisabled()
  })
})

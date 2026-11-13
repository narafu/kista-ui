import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { describe, expect, it } from 'vitest'
import { mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { AcceptInvitationForm } from './AcceptInvitationForm'

describe('AcceptInvitationForm', () => {
  it('코드를 넣고 참여하면 수락 요청을 보내고 입력을 비운다', async () => {
    const user = userEvent.setup()
    const { requests } = mockApi({ 'PATCH /api/finance/invitations/{code}': { id: 'g1' } })
    renderApp(<AcceptInvitationForm />)

    expect(screen.getByRole('button', { name: '참여' })).toBeDisabled()
    await user.type(screen.getByLabelText('초대 코드가 있으신가요?'), ' ABC123 ')
    await user.click(screen.getByRole('button', { name: '참여' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('그룹에 참여했습니다'))
    const posts = requests.filter((r) => r.method === 'PATCH')
    expect(posts).toHaveLength(1)
    expect(posts[0].path).toBe('/api/finance/invitations/ABC123')
    expect(posts[0].body).toEqual({ status: 'ACCEPTED' })
    expect(screen.getByLabelText('초대 코드가 있으신가요?')).toHaveValue('')
  })
})

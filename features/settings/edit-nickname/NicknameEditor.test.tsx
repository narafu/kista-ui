import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { apiError, mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { NicknameEditor } from './NicknameEditor'

async function startEdit() {
  await userEvent.click(screen.getByRole('button', { name: '닉네임 수정' }))
  return screen.getByLabelText('닉네임')
}

describe('NicknameEditor', () => {
  it('rejects an empty nickname without sending a request', async () => {
    const { requests } = mockApi({})
    renderApp(<NicknameEditor initialNickname="홍길동" />)

    await userEvent.clear(await startEdit())
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('닉네임을 입력하세요.')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('rejects a nickname with symbols without sending a request', async () => {
    const { requests } = mockApi({})
    renderApp(<NicknameEditor initialNickname="홍길동" />)

    const input = await startEdit()
    await userEvent.clear(input)
    await userEvent.type(input, 'a!b')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('한글·영문·숫자·공백 1~10자로 입력하세요.')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('PATCHes the trimmed nickname and leaves editing mode on success', async () => {
    const { requests } = mockApi({ 'PATCH /api/settings/nickname': undefined as never })
    renderApp(<NicknameEditor initialNickname="홍길동" />)

    const input = await startEdit()
    await userEvent.clear(input)
    await userEvent.type(input, ' 새 닉네임 ')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(screen.queryByLabelText('닉네임')).not.toBeInTheDocument())
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({ method: 'PATCH', path: '/api/settings/nickname', body: { nickname: '새 닉네임' } })
  })

  it('submits with the enter key', async () => {
    const { requests } = mockApi({ 'PATCH /api/settings/nickname': undefined as never })
    renderApp(<NicknameEditor initialNickname="홍길동" />)

    const input = await startEdit()
    await userEvent.clear(input)
    await userEvent.type(input, '엔터{Enter}')

    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests[0].body).toEqual({ nickname: '엔터' })
  })

  it('stays in editing mode when the server rejects the nickname', async () => {
    mockApi({ 'PATCH /api/settings/nickname': apiError(409, { detail: '이미 사용 중인 닉네임입니다.' }) })
    renderApp(<NicknameEditor initialNickname="홍길동" />)

    const input = await startEdit()
    await userEvent.clear(input)
    await userEvent.type(input, '중복')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled())
    expect(screen.getByLabelText('닉네임')).toHaveValue('중복')
  })

  it('cancels editing with the escape key without saving', async () => {
    const { requests } = mockApi({})
    renderApp(<NicknameEditor initialNickname="홍길동" />)

    await userEvent.type(await startEdit(), '변경중')
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByLabelText('닉네임')).not.toBeInTheDocument()
    expect(screen.getByText('홍길동')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('restarts from the saved nickname after cancel', async () => {
    mockApi({})
    renderApp(<NicknameEditor initialNickname="홍길동" />)

    await userEvent.type(await startEdit(), '변경중')
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    expect(await startEdit()).toHaveValue('홍길동')
  })
})

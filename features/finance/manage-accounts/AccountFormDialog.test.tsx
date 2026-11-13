import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { describe, expect, it } from 'vitest'
import { mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { AccountFormDialog } from './AccountFormDialog'
import type { FinanceAccount } from '@entities/finance'

const saved: FinanceAccount = { id: 'acc-1', accountType: 'SECURITIES', name: '새 계좌' }

function setup(handlers: Parameters<typeof mockApi>[0] = {}, groups = true) {
  return mockApi({ 'GET /api/finance/accounts': [], 'GET /api/finance/groups': groups ? [{ id: 'g1' }] : [], ...handlers })
}

describe('AccountFormDialog 제출 요청', () => {
  it('생성은 POST로 보내고 그룹 소속이면 shareToGroup=true 쿼리를 붙인다', async () => {
    const user = userEvent.setup()
    const { requests } = setup({ 'POST /api/finance/accounts': saved as never })
    renderApp(<AccountFormDialog open onClose={() => {}} />)
    expect(await screen.findByRole('switch', { name: '그룹으로 저장' })).toBeChecked()

    await user.type(screen.getByLabelText('계좌 이름'), ' 새 계좌 ')
    await user.type(screen.getByLabelText('계좌번호', { exact: false }), '12ab-34')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('계좌가 추가되었습니다'))
    const posts = requests.filter((r) => r.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0].query.get('shareToGroup')).toBe('true')
    expect(posts[0].body).toEqual({ accountType: 'SECURITIES', name: '새 계좌', accountNo: '1234' })
  })

  it('그룹으로 저장을 끄면 쿼리가 없고, 그룹 미소속이면 스위치 자체가 없다', async () => {
    const user = userEvent.setup()
    const { requests } = setup({ 'POST /api/finance/accounts': saved as never })
    renderApp(<AccountFormDialog open onClose={() => {}} />)
    await user.click(await screen.findByRole('switch', { name: '그룹으로 저장' }))
    await user.type(screen.getByLabelText('계좌 이름'), '새 계좌')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true))
    expect(requests.find((r) => r.method === 'POST')!.query.has('shareToGroup')).toBe(false)
  })

  it('그룹 미소속이면 스위치가 없다', async () => {
    setup({}, false)
    renderApp(<AccountFormDialog open onClose={() => {}} />)
    await screen.findByLabelText('계좌 이름')
    expect(screen.queryByRole('switch', { name: '그룹으로 저장' })).not.toBeInTheDocument()
  })

  it('이름이 비면 요청 없이 막는다', async () => {
    const user = userEvent.setup()
    const { requests } = setup()
    renderApp(<AccountFormDialog open onClose={() => {}} />)
    await user.click(await screen.findByRole('button', { name: '저장' }))
    expect(requests.filter((r) => r.method === 'POST')).toHaveLength(0)
  })

  it('수정은 PUT — legacy accountNo는 숫자만 정규화하고 비운 필드는 생략한다', async () => {
    const user = userEvent.setup()
    const account: FinanceAccount = { id: 'acc-9', accountType: 'BANK', name: '신한은행', institution: '신한', owner: '홍길동', accountNo: '123-456-789' }
    const { requests } = setup({ 'PUT /api/finance/accounts/{id}': account as never })
    renderApp(<AccountFormDialog open onClose={() => {}} account={account} />)

    await user.clear(screen.getByLabelText('소유자', { exact: false }))
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('계좌가 수정되었습니다'))
    const puts = requests.filter((r) => r.method === 'PUT')
    expect(puts).toHaveLength(1)
    expect(puts[0].path).toBe('/api/finance/accounts/acc-9')
    expect(puts[0].query.has('shareToGroup')).toBe(false)
    expect(puts[0].body).toEqual({ accountType: 'BANK', name: '신한은행', institution: '신한', accountNo: '123456789' })
  })
})

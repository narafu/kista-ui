import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@shared/lib/query/createQueryClient'
import { apiError, mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { EditAccountForm } from './EditAccountForm'
import type { Account } from '@entities/account'

const account: Account = { id: 'acc-1', nickname: '메인 계좌', accountNoMasked: '7442****', broker: 'KIS' }
const upbitAccount: Account = { id: 'u1', nickname: '코인', accountNoMasked: null, broker: 'UPBIT', apiKeyExpiresAt: null }

// 저장·삭제 뒤 계좌 목록 동기화가 부르는 조회까지 한 객체로 등록한다
const base = { 'GET /api/accounts': [] as never }
const expiryLabel = /^API 키 만료일/

describe('EditAccountForm', () => {
  it('업비트 계좌는 계좌번호 입력을 보여주지 않는다', () => {
    mockApi({})
    renderApp(<EditAccountForm account={upbitAccount} />)
    expect(screen.queryByLabelText('계좌번호')).not.toBeInTheDocument()
  })

  it('키 재등록은 새 Access Key·Secret Key를 보낸다', async () => {
    const { requests } = mockApi({ ...base, 'PUT /api/accounts/{id}/credentials': { id: 'u1' } as never })
    renderApp(<EditAccountForm account={upbitAccount} />)
    await userEvent.type(screen.getByLabelText('Access Key'), 'new-key-1234')
    await userEvent.type(screen.getByLabelText('Secret Key'), 'new-secret-1234')
    await userEvent.click(screen.getByRole('button', { name: 'API 키 재등록' }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('API 키가 재등록되었습니다'))
    expect(requests[0]).toMatchObject({ method: 'PUT', path: '/api/accounts/u1/credentials', body: { appKey: 'new-key-1234', secretKey: 'new-secret-1234' } })
    // 성공하면 입력을 비운다
    expect(screen.getByLabelText('Access Key')).toHaveValue('')
    expect(screen.getByLabelText('Secret Key')).toHaveValue('')
  })

  it('키 재등록 실패는 거래소 오류 코드별 문구로 보여주고, 다시 입력하면 사라진다', async () => {
    mockApi({ 'PUT /api/accounts/{id}/credentials': apiError(422, { code: 'BROKER_IP_NOT_ALLOWED' }) })
    renderApp(<EditAccountForm account={upbitAccount} />)
    await userEvent.type(screen.getByLabelText('Access Key'), 'k')
    await userEvent.type(screen.getByLabelText('Secret Key'), 's')
    await userEvent.click(screen.getByRole('button', { name: 'API 키 재등록' }))
    expect(await screen.findByText(/허용 IP가 등록되지 않았습니다/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Access Key'), 'x')
    await waitFor(() => expect(screen.queryByText(/허용 IP가 등록되지 않았습니다/)).not.toBeInTheDocument())
  })

  it('키·시크릿이 비어 있으면 키 재등록 버튼이 잠겨 있다', async () => {
    mockApi({})
    renderApp(<EditAccountForm account={upbitAccount} />)
    expect(screen.getByRole('button', { name: 'API 키 재등록' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Access Key'), 'k')
    expect(screen.getByRole('button', { name: 'API 키 재등록' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Secret Key'), 's')
    expect(screen.getByRole('button', { name: 'API 키 재등록' })).toBeEnabled()
  })

  it('추정 만료일 broker(KIS)에서만 만료일 입력란을 보여주고 오늘(KST)을 min으로 둔다', () => {
    mockApi({})
    const { unmount } = renderApp(<EditAccountForm account={account} />)
    const inputs = screen.getAllByLabelText(expiryLabel)
    expect(inputs).toHaveLength(2) // 계좌 정보 수정 + 키 재등록
    expect(inputs[0]).toHaveAttribute('min', new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }))
    expect(inputs[0]).toHaveValue('')
    unmount()
    renderApp(<EditAccountForm account={upbitAccount} />)
    expect(screen.queryByLabelText(expiryLabel)).not.toBeInTheDocument()
  })

  it('만료일을 입력하지 않으면 저장 바디에 apiKeyExpiresOn이 없다', async () => {
    const { requests } = mockApi({ ...base, 'PUT /api/accounts/{id}': account as never })
    renderApp(<EditAccountForm account={{ ...account, apiKeyExpiresAt: '2020-01-01T00:00:00+09:00' }} />)
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(requests.some((r) => r.method === 'PUT')).toBe(true))
    expect(requests.find((r) => r.method === 'PUT')).toMatchObject({ path: '/api/accounts/acc-1', body: { nickname: '메인 계좌' } })
  })

  it('만료일을 입력하면 저장 바디에 포함한다', async () => {
    const { requests } = mockApi({ ...base, 'PUT /api/accounts/{id}': account as never })
    renderApp(<EditAccountForm account={account} />)
    await userEvent.type(screen.getAllByLabelText(expiryLabel)[0], '2027-03-01')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(requests.some((r) => r.method === 'PUT')).toBe(true))
    expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({ nickname: '메인 계좌', apiKeyExpiresOn: '2027-03-01' })
  })

  it('키 재등록 시 만료일을 입력했을 때만 apiKeyExpiresOn을 보낸다', async () => {
    const { requests } = mockApi({ ...base, 'PUT /api/accounts/{id}/credentials': account as never })
    renderApp(<EditAccountForm account={account} />)
    await userEvent.type(screen.getByLabelText('App Key'), 'new-key-1234')
    await userEvent.type(screen.getByLabelText('App Secret'), 'new-secret-1234')
    await userEvent.click(screen.getByRole('button', { name: 'API 키 재등록' }))
    const puts = () => requests.filter((r) => r.method === 'PUT')
    await waitFor(() => expect(puts()).toHaveLength(1))
    expect(puts()[0].body).toEqual({ appKey: 'new-key-1234', secretKey: 'new-secret-1234' })
    // 성공하면 입력이 비워지므로 다시 채운다
    await waitFor(() => expect(screen.getByLabelText('App Key')).toHaveValue(''))
    await userEvent.type(screen.getByLabelText('App Key'), 'new-key-1234')
    await userEvent.type(screen.getByLabelText('App Secret'), 'new-secret-1234')
    await userEvent.type(screen.getAllByLabelText(expiryLabel)[1], '2027-03-01')
    await userEvent.click(screen.getByRole('button', { name: 'API 키 재등록' }))
    await waitFor(() => expect(puts()).toHaveLength(2))
    expect(puts()[1].body).toEqual({ appKey: 'new-key-1234', secretKey: 'new-secret-1234', apiKeyExpiresOn: '2027-03-01' })
  })

  it('모의계좌는 키 재등록 섹션이 없다', () => {
    mockApi({})
    renderApp(<EditAccountForm account={{ ...upbitAccount, broker: 'MOCK', accountNoMasked: '****1234' }} />)
    expect(screen.queryByRole('button', { name: 'API 키 재등록' })).not.toBeInTheDocument()
  })

  it('저장하면 앞뒤 공백을 뗀 별칭을 PUT하고 토스트 후 상세로 이동한다', async () => {
    const { requests } = mockApi({ ...base, 'PUT /api/accounts/{id}': account as never })
    renderApp(<EditAccountForm account={account} />)
    const input = screen.getByLabelText('계좌 별칭')
    await userEvent.clear(input)
    await userEvent.type(input, '  새 별칭  ')
    await userEvent.click(screen.getAllByRole('button', { name: '저장' })[0])
    await waitFor(() => expect(useRouter().push).toHaveBeenCalledWith('/accounts/acc-1'))
    expect(requests.find((r) => r.method === 'PUT')).toMatchObject({ path: '/api/accounts/acc-1', body: { nickname: '새 별칭' } })
    expect(toast.success).toHaveBeenCalledWith('계좌가 수정되었습니다')
  })

  it('별칭이 비어 있으면 요청을 보내지 않는다', async () => {
    const { requests } = mockApi({})
    renderApp(<EditAccountForm account={account} />)
    await userEvent.clear(screen.getByLabelText('계좌 별칭'))
    await userEvent.click(screen.getAllByRole('button', { name: '저장' })[0])
    expect(requests).toHaveLength(0)
  })

  it('영구 삭제는 별칭을 정확히 입력해야 켜진다', async () => {
    const { requests } = mockApi({ ...base, 'DELETE /api/accounts/{id}': undefined as never })
    renderApp(<EditAccountForm account={account} />)

    await userEvent.click(screen.getByText('계좌 삭제'))
    const confirmInput = screen.getByPlaceholderText(account.nickname)
    const deleteButton = screen.getByRole('button', { name: '영구 삭제' })

    await userEvent.type(confirmInput, '틀린 별칭')
    expect(deleteButton).toBeDisabled()
    expect(requests).toHaveLength(0)

    await userEvent.clear(confirmInput)
    await userEvent.type(confirmInput, account.nickname)
    expect(deleteButton).toBeEnabled()

    await userEvent.click(deleteButton)
    await waitFor(() => expect(useRouter().push).toHaveBeenCalledWith('/accounts'))
    expect(requests.find((r) => r.method === 'DELETE')?.path).toBe('/api/accounts/acc-1')
    expect(toast.success).toHaveBeenCalledWith('계좌가 삭제되었습니다')
  })

  it('종속 도메인 캐시 무효화가 하나 실패해도 삭제 뒤 이동한다', async () => {
    mockApi({ ...base, 'DELETE /api/accounts/{id}': undefined as never })
    const queryClient = createQueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockRejectedValueOnce(new Error('stats refetch failed')).mockResolvedValue(undefined)
    renderApp(<EditAccountForm account={account} />, { queryClient })

    await userEvent.click(screen.getByText('계좌 삭제'))
    await userEvent.type(screen.getByPlaceholderText(account.nickname), account.nickname)
    await userEvent.click(screen.getByRole('button', { name: '영구 삭제' }))

    await waitFor(() => expect(useRouter().push).toHaveBeenCalledWith('/accounts'))
    expect(invalidate).toHaveBeenCalledTimes(4)
    expect(toast.success).toHaveBeenCalledWith('계좌가 삭제되었습니다')
  })
})

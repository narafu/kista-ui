import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import type { Strategy } from '@entities/strategy'
import { apiError, mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { WithdrawCapitalForm } from './WithdrawCapitalForm'

const strategy: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'TQQQ',
  cycleSeedType: 'NONE',
  isReverseMode: false,
  cycleInProgress: true,
  ledgerDeposit: 1000,
}

function renderForm(handlers: Parameters<typeof mockApi>[0] = {}) {
  const api = mockApi({
    'POST /api/trading-cycles/{id}/capital-withdrawal': strategy as never,
    // 저장 뒤 훅이 전략 목록을 다시 맞춘다
    'GET /api/trading-cycles': [strategy] as never,
    'GET /api/accounts/{accountId}/trading-cycles': [strategy] as never,
    ...handlers,
  })
  const onDone = vi.fn()
  const view = renderApp(<WithdrawCapitalForm currency="USD" accountId="account-1" strategy={strategy} onDone={onDone} />)
  return { ...api, onDone, ...view }
}

function type(value: string) {
  fireEvent.change(screen.getByLabelText('인출 예수금'), { target: { value } })
}

const posts = (requests: { method: string }[]) => requests.filter((r) => r.method === 'POST')

describe('WithdrawCapitalForm', () => {
  it('장부 예수금과 전략 유형별 효과 안내를 보여준다', () => {
    const { rerender } = renderForm()
    expect(screen.getByText('현재 장부 예수금 $1,000.00')).toBeInTheDocument()
    expect(screen.getByText(/1회 매수금이 줄고 회차가 뒤로 밀립니다/)).toBeInTheDocument()
    rerender(<WithdrawCapitalForm currency="USD" accountId="account-1" strategy={{ ...strategy, type: 'PRIVACY' }} onDone={() => {}} />)
    expect(screen.getByText(/배수가 다시 계산되고/)).toBeInTheDocument()
  })

  it('빈 값으로 제출하면 칸 아래에 오류를 보이고 포커스·aria를 연결하며 다이얼로그를 열지 않는다', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '인출' }))
    expect(await screen.findByText('인출할 예수금을 입력하세요.')).toBeInTheDocument()
    const input = screen.getByLabelText('인출 예수금')
    await waitFor(() => expect(input).toHaveFocus())
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')).toContain('amount-error')
    expect(screen.queryByText('투자금을 인출하시겠습니까?')).not.toBeInTheDocument()
  })

  it('장부 예수금을 넘으면 한도 오류를 보이고 요청을 보내지 않는다', async () => {
    const { requests } = renderForm()
    type('1000.5')
    fireEvent.click(screen.getByRole('button', { name: '인출' }))
    expect(await screen.findByText('장부 예수금 $1,000.00 이하로 입력하세요.')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('제출 → 확인 다이얼로그 → 확정하면 { amount } 바디로 보내고 끝나면 onDone을 부른다', async () => {
    const { requests, onDone, queryClient } = renderForm()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    type('250.5')
    fireEvent.click(screen.getByRole('button', { name: '인출' }))
    expect(await screen.findByText('투자금을 인출하시겠습니까?')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: '인출 확정' }))

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce())
    expect(posts(requests)).toHaveLength(1)
    expect(posts(requests)[0]).toMatchObject({ path: '/api/trading-cycles/strategy-1/capital-withdrawal', body: { amount: 250.5 } })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: orderKeys.preview('strategy-1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: tradeKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: statsKeys.all })
  })

  it('서버가 거절하면 onDone을 부르지 않는다', async () => {
    const { onDone, requests } = renderForm({ 'POST /api/trading-cycles/{id}/capital-withdrawal': apiError(400, { detail: 'no' }) })
    type('100')
    fireEvent.click(screen.getByRole('button', { name: '인출' }))
    fireEvent.click(await screen.findByRole('button', { name: '인출 확정' }))
    await waitFor(() => expect(posts(requests)).toHaveLength(1))
    await waitFor(() => expect(screen.getByRole('button', { name: '인출 확정' })).toBeEnabled())
    expect(onDone).not.toHaveBeenCalled()
  })

  it('취소하면 onDone을 부른다', () => {
    const { onDone } = renderForm()
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onDone).toHaveBeenCalledOnce()
  })
})

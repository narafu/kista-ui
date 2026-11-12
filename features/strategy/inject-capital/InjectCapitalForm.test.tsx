import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import type { Strategy } from '@entities/strategy'
import { apiError, mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { InjectCapitalForm } from './InjectCapitalForm'

const strategy: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'TQQQ',
  cycleSeedType: 'NONE',
  isReverseMode: false,
  cycleInProgress: true,
}

function renderForm(s: Strategy = strategy, handlers: Parameters<typeof mockApi>[0] = {}) {
  const api = mockApi({
    'POST /api/trading-cycles/{id}/capital-injection': strategy as never,
    // 저장 뒤 훅이 전략 목록을 다시 맞춘다
    'GET /api/trading-cycles': [strategy] as never,
    'GET /api/accounts/{accountId}/trading-cycles': [strategy] as never,
    ...handlers,
  })
  const onDone = vi.fn()
  const view = renderApp(<InjectCapitalForm currency="USD" accountId="account-1" strategy={s} onDone={onDone} />)
  return { ...api, onDone, ...view }
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('InjectCapitalForm', () => {
  it('전략 유형별 효과 안내를 보여준다', () => {
    const { rerender } = renderForm()
    expect(screen.getByText(/1회 매수금이 커지고 회차가 앞당겨집니다/)).toBeInTheDocument()
    rerender(<InjectCapitalForm currency="USD" accountId="account-1" strategy={{ ...strategy, type: 'PRIVACY' }} onDone={() => {}} />)
    expect(screen.getByText(/배수가 다시 계산됩니다/)).toBeInTheDocument()
  })

  it('빈 값으로 제출하면 예수금 칸 아래에 오류를 보이고 다이얼로그를 열지 않는다', async () => {
    const { requests } = renderForm()
    fireEvent.click(screen.getByRole('button', { name: '추가' }))
    expect(await screen.findByText('추가할 예수금을 입력하세요.')).toBeInTheDocument()
    expect(screen.queryByText('투자금을 추가하시겠습니까?')).not.toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('주식 편입 입력칸은 없다', () => {
    renderForm()
    expect(screen.queryByLabelText('편입 주식 수')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('매수단가')).not.toBeInTheDocument()
  })

  it('제출 실패 시 첫 오류 칸으로 포커스를 옮기고 오류를 aria로 연결한다', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '추가' }))
    const deposit = await screen.findByLabelText('추가 예수금')
    await waitFor(() => expect(deposit).toHaveFocus())
    expect(deposit).toHaveAttribute('aria-invalid', 'true')
    expect(deposit.getAttribute('aria-describedby')).toContain('depositAmount-error')
    expect(document.getElementById('depositAmount-error')).toHaveTextContent('추가할 예수금을 입력하세요.')
  })

  it('제출 → 확인 다이얼로그 → 확정하면 입력값을 요청 바디로 보내고 끝나면 onDone을 부른다', async () => {
    const { requests, onDone, queryClient } = renderForm()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    type('추가 예수금', '500')
    fireEvent.click(screen.getByRole('button', { name: '추가' }))
    expect(await screen.findByText('투자금을 추가하시겠습니까?')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: '추가 확정' }))

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce())
    const posts = requests.filter((r) => r.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0]).toMatchObject({ method: 'POST', path: '/api/trading-cycles/strategy-1/capital-injection', body: { depositAmount: 500 } })
    // 주문 미리보기·잔고 이력·성과 무효화는 onDone보다 먼저 끝난다
    expect(invalidate).toHaveBeenCalledWith({ queryKey: orderKeys.preview('strategy-1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: tradeKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: statsKeys.all })
  })

  it('서버가 거절하면 onDone을 부르지 않는다', async () => {
    const { onDone, requests } = renderForm(strategy, { 'POST /api/trading-cycles/{id}/capital-injection': apiError(400, { detail: 'no' }) })
    type('추가 예수금', '500')
    fireEvent.click(screen.getByRole('button', { name: '추가' }))
    fireEvent.click(await screen.findByRole('button', { name: '추가 확정' }))
    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true))
    await waitFor(() => expect(screen.getByRole('button', { name: '추가 확정' })).toBeEnabled())
    expect(onDone).not.toHaveBeenCalled()
  })

  it('취소하면 onDone을 부른다', () => {
    const { onDone } = renderForm()
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onDone).toHaveBeenCalledOnce()
  })
})

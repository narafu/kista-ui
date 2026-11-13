import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import type { Strategy } from '@entities/strategy'
import { apiError, mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { CapitalForm, type CapitalKind } from './CapitalForm'

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

const CASES = {
  inject: { path: 'capital-injection', label: '추가 예수금', action: '추가', field: 'depositAmount', title: '투자금을 추가하시겠습니까?', empty: '추가할 예수금을 입력하세요.' },
  withdraw: { path: 'capital-withdrawal', label: '인출 예수금', action: '인출', field: 'amount', title: '투자금을 인출하시겠습니까?', empty: '인출할 예수금을 입력하세요.' },
} as const

function renderForm(kind: CapitalKind, handlers: Parameters<typeof mockApi>[0] = {}, s: Strategy = strategy) {
  const api = mockApi({
    'POST /api/trading-cycles/{id}/capital-injection': strategy as never,
    'POST /api/trading-cycles/{id}/capital-withdrawal': strategy as never,
    // 저장 뒤 훅이 전략 목록을 다시 맞춘다
    'GET /api/trading-cycles': [strategy] as never,
    'GET /api/accounts/{accountId}/trading-cycles': [strategy] as never,
    ...handlers,
  })
  const onDone = vi.fn()
  const view = renderApp(<CapitalForm kind={kind} currency="USD" accountId="account-1" strategy={s} onDone={onDone} />)
  return { ...api, onDone, ...view }
}

const posts = (requests: { method: string }[]) => requests.filter((r) => r.method === 'POST')

describe.each(['inject', 'withdraw'] as const)('CapitalForm(%s)', (kind) => {
  const c = CASES[kind]
  const type = (value: string) => fireEvent.change(screen.getByLabelText(c.label), { target: { value } })

  it('빈 값으로 제출하면 칸 아래에 오류를 보이고 포커스·aria를 연결하며 다이얼로그를 열지 않는다', async () => {
    const { requests } = renderForm(kind)
    fireEvent.click(screen.getByRole('button', { name: c.action }))
    expect(await screen.findByText(c.empty)).toBeInTheDocument()
    const input = screen.getByLabelText(c.label)
    await waitFor(() => expect(input).toHaveFocus())
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')).toContain(`${c.field}-error`)
    expect(screen.queryByText(c.title)).not.toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('제출 → 확인 다이얼로그 → 확정하면 요청 바디를 보내고, 무효화가 끝난 뒤 onDone을 부른다', async () => {
    const { requests, onDone, queryClient } = renderForm(kind)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    type('250.5')
    fireEvent.click(screen.getByRole('button', { name: c.action }))
    expect(await screen.findByText(c.title)).toBeInTheDocument()
    expect(requests).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: `${c.action} 확정` }))

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce())
    expect(posts(requests)).toHaveLength(1)
    expect(posts(requests)[0]).toMatchObject({ path: `/api/trading-cycles/strategy-1/${c.path}`, body: { [c.field]: 250.5 } })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: orderKeys.preview('strategy-1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: tradeKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: statsKeys.all })
  })

  it('서버가 거절하면 onDone을 부르지 않는다', async () => {
    const { onDone, requests } = renderForm(kind, { [`POST /api/trading-cycles/{id}/${c.path}`]: apiError(400, { detail: 'no' }) })
    type('100')
    fireEvent.click(screen.getByRole('button', { name: c.action }))
    fireEvent.click(await screen.findByRole('button', { name: `${c.action} 확정` }))
    await waitFor(() => expect(posts(requests)).toHaveLength(1))
    await waitFor(() => expect(screen.getByRole('button', { name: `${c.action} 확정` })).toBeEnabled())
    expect(onDone).not.toHaveBeenCalled()
  })

  it('취소하면 onDone을 부른다', () => {
    const { onDone } = renderForm(kind)
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onDone).toHaveBeenCalledOnce()
  })
})

describe('CapitalForm 종류별 안내', () => {
  it('추가: 전략 유형별 효과 안내를 보여주고 주식 편입 입력칸은 없다', () => {
    const { rerender } = renderForm('inject')
    expect(screen.getByText(/1회 매수금이 커지고 회차가 앞당겨집니다/)).toBeInTheDocument()
    expect(screen.queryByText(/현재 장부 예수금/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('편입 주식 수')).not.toBeInTheDocument()
    rerender(<CapitalForm kind="inject" currency="USD" accountId="account-1" strategy={{ ...strategy, type: 'PRIVACY' }} onDone={() => {}} />)
    expect(screen.getByText(/추가 금액에 맞춰 배수가 다시 계산됩니다/)).toBeInTheDocument()
  })

  it('인출: 장부 예수금과 전략 유형별 효과 안내를 보여준다', () => {
    const { rerender } = renderForm('withdraw')
    expect(screen.getByText('현재 장부 예수금 $1,000.00')).toBeInTheDocument()
    expect(screen.getByText(/1회 매수금이 줄고 회차가 뒤로 밀립니다/)).toBeInTheDocument()
    rerender(<CapitalForm kind="withdraw" currency="USD" accountId="account-1" strategy={{ ...strategy, type: 'PRIVACY' }} onDone={() => {}} />)
    expect(screen.getByText(/배수가 다시 계산되고/)).toBeInTheDocument()
  })

  it('인출: 장부 예수금을 넘으면 한도 오류를 보이고 요청을 보내지 않는다', async () => {
    const { requests } = renderForm('withdraw')
    fireEvent.change(screen.getByLabelText('인출 예수금'), { target: { value: '1000.5' } })
    fireEvent.click(screen.getByRole('button', { name: '인출' }))
    expect(await screen.findByText('장부 예수금 $1,000.00 이하로 입력하세요.')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })
})

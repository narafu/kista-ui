import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import type { Strategy } from '@entities/strategy'
import { WithdrawCapitalForm } from './WithdrawCapitalForm'

const mutateMock = vi.fn()
const routerPushMock = vi.fn()
const routerBackMock = vi.fn()
const invalidateQueriesMock = vi.fn(() => Promise.resolve())
let successHandler: (() => void | Promise<void>) | undefined

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock, back: routerBackMock }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}))

vi.mock('@entities/strategy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@entities/strategy')>()),
  useWithdrawCapitalMutation: (_id: string, onSuccess?: () => void | Promise<void>) => {
    successHandler = onSuccess
    return { mutate: mutateMock, isPending: false }
  },
}))

const strategy: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'TQQQ',
  cycleSeedType: 'NONE',
  isReverseMode: false,
  cycleInProgress: true,
  ledgerUsdDeposit: 1000,
}

function type(value: string) {
  fireEvent.change(screen.getByLabelText('인출 예수금'), { target: { value } })
}

describe('WithdrawCapitalForm', () => {
  beforeEach(() => {
    mutateMock.mockClear()
    routerPushMock.mockClear()
    routerBackMock.mockClear()
    invalidateQueriesMock.mockClear()
    successHandler = undefined
  })

  it('장부 예수금과 전략 유형별 효과 안내를 보여준다', () => {
    const { rerender } = render(<WithdrawCapitalForm accountId="account-1" strategy={strategy} />)
    expect(screen.getByText('현재 장부 예수금 $1,000.00')).toBeInTheDocument()
    expect(screen.getByText(/1회 매수금이 줄고 회차가 뒤로 밀립니다/)).toBeInTheDocument()
    rerender(<WithdrawCapitalForm accountId="account-1" strategy={{ ...strategy, type: 'PRIVACY' }} />)
    expect(screen.getByText(/배수가 다시 계산되고/)).toBeInTheDocument()
  })

  it('빈 값으로 제출하면 칸 아래에 오류를 보이고 포커스·aria를 연결하며 다이얼로그를 열지 않는다', async () => {
    render(<WithdrawCapitalForm accountId="account-1" strategy={strategy} />)
    fireEvent.click(screen.getByRole('button', { name: '인출' }))
    expect(await screen.findByText('인출할 예수금을 입력하세요.')).toBeInTheDocument()
    const input = screen.getByLabelText('인출 예수금')
    await waitFor(() => expect(input).toHaveFocus())
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')).toContain('amount-error')
    expect(screen.queryByText('투자금을 인출하시겠습니까?')).not.toBeInTheDocument()
  })

  it('장부 예수금을 넘으면 한도 오류를 보이고 뮤테이션을 호출하지 않는다', async () => {
    render(<WithdrawCapitalForm accountId="account-1" strategy={strategy} />)
    type('1000.5')
    fireEvent.click(screen.getByRole('button', { name: '인출' }))
    expect(await screen.findByText('장부 예수금 $1,000.00 이하로 입력하세요.')).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('제출 → 확인 다이얼로그 → 확정하면 { amount }로 뮤테이션을 호출한다', async () => {
    render(<WithdrawCapitalForm accountId="account-1" strategy={strategy} />)
    type('250.5')
    fireEvent.click(screen.getByRole('button', { name: '인출' }))
    expect(await screen.findByText('투자금을 인출하시겠습니까?')).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '인출 확정' }))
    expect(mutateMock).toHaveBeenCalledWith({ amount: 250.5 })
  })

  it('성공하면 주문 미리보기를 무효화하고 상세로 이동한다(모달이면 뒤로)', async () => {
    const { unmount } = render(<WithdrawCapitalForm accountId="account-1" strategy={strategy} />)
    await successHandler?.()
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: orderKeys.preview('strategy-1') })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: tradeKeys.all })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: statsKeys.all })
    expect(routerPushMock).toHaveBeenCalledWith('/accounts/account-1/strategies/strategy-1')
    unmount()
    render(<WithdrawCapitalForm accountId="account-1" strategy={strategy} dismiss="back" />)
    await successHandler?.()
    expect(routerBackMock).toHaveBeenCalled()
  })
})

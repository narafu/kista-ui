import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import type { Strategy } from '@entities/strategy'
import { InjectCapitalForm } from './InjectCapitalForm'

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
  useInjectCapitalMutation: (_id: string, onSuccess?: () => void | Promise<void>) => {
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
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('InjectCapitalForm', () => {
  beforeEach(() => {
    mutateMock.mockClear()
    routerPushMock.mockClear()
    routerBackMock.mockClear()
    invalidateQueriesMock.mockClear()
    successHandler = undefined
  })

  it('전략 유형별 효과 안내를 보여준다', () => {
    const { rerender } = render(<InjectCapitalForm currency="USD" accountId="account-1" strategy={strategy} />)
    expect(screen.getByText(/1회 매수금이 커지고 회차가 앞당겨집니다/)).toBeInTheDocument()
    rerender(<InjectCapitalForm currency="USD" accountId="account-1" strategy={{ ...strategy, type: 'PRIVACY' }} />)
    expect(screen.getByText(/배수가 다시 계산됩니다/)).toBeInTheDocument()
  })

  it('빈 값으로 제출하면 예수금 칸 아래에 오류를 보이고 다이얼로그를 열지 않는다', async () => {
    render(<InjectCapitalForm currency="USD" accountId="account-1" strategy={strategy} />)
    fireEvent.click(screen.getByRole('button', { name: '추가' }))
    expect(await screen.findByText('추가할 예수금을 입력하세요.')).toBeInTheDocument()
    expect(screen.queryByText('투자금을 추가하시겠습니까?')).not.toBeInTheDocument()
  })

  it('주식 편입 입력칸은 없다', () => {
    render(<InjectCapitalForm currency="USD" accountId="account-1" strategy={strategy} />)
    expect(screen.queryByLabelText('편입 주식 수')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('매수단가')).not.toBeInTheDocument()
  })

  it('제출 실패 시 첫 오류 칸으로 포커스를 옮기고 오류를 aria로 연결한다', async () => {
    render(<InjectCapitalForm currency="USD" accountId="account-1" strategy={strategy} />)
    fireEvent.click(screen.getByRole('button', { name: '추가' }))
    const deposit = await screen.findByLabelText('추가 예수금')
    await waitFor(() => expect(deposit).toHaveFocus())
    expect(deposit).toHaveAttribute('aria-invalid', 'true')
    expect(deposit.getAttribute('aria-describedby')).toContain('depositAmount-error')
    expect(document.getElementById('depositAmount-error')).toHaveTextContent('추가할 예수금을 입력하세요.')
  })

  it('제출 → 확인 다이얼로그 → 확정하면 입력값으로 뮤테이션을 호출한다', async () => {
    render(<InjectCapitalForm currency="USD" accountId="account-1" strategy={strategy} />)
    type('추가 예수금', '500')
    fireEvent.click(screen.getByRole('button', { name: '추가' }))
    expect(await screen.findByText('투자금을 추가하시겠습니까?')).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '추가 확정' }))
    expect(mutateMock).toHaveBeenCalledWith({ depositAmount: 500 })
  })

  it('성공하면 주문 미리보기·잔고 이력·성과를 무효화하고 상세로 이동한다(모달이면 뒤로)', async () => {
    const { unmount } = render(<InjectCapitalForm currency="USD" accountId="account-1" strategy={strategy} />)
    await successHandler?.()
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: orderKeys.preview('strategy-1') })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: tradeKeys.all })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: statsKeys.all })
    expect(routerPushMock).toHaveBeenCalledWith('/accounts/account-1/strategies/strategy-1')
    unmount()
    render(<InjectCapitalForm currency="USD" accountId="account-1" strategy={strategy} dismiss="back" />)
    await successHandler?.()
    expect(routerBackMock).toHaveBeenCalled()
  })
})

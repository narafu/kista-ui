import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { orderKeys } from '@entities/order'
import { ReconfigureVrForm } from './ReconfigureVrForm'
import type { ReconfigureVrStrategy } from './model/loadStrategyForReconfigure'

const mutateMock = vi.fn()
const routerPushMock = vi.fn()
const routerBackMock = vi.fn()
const invalidateQueriesMock = vi.fn(() => Promise.resolve())
let reconfigureSuccessHandler: (() => void | Promise<void>) | undefined

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock, back: routerBackMock }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}))

vi.mock('@entities/strategy', () => ({
  useReconfigureVrMutation: (_strategyId: string, onSuccess?: () => void | Promise<void>) => {
    reconfigureSuccessHandler = onSuccess
    return { mutate: mutateMock, isPending: false }
  },
}))

const strategy: ReconfigureVrStrategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'VR',
  status: 'ACTIVE',
  ticker: 'TQQQ',
  cycleSeedType: 'NONE',
  isReverseMode: false,
  vr: {
    value: 3000,
    bandWidth: 15,
    intervalWeeks: 4,
    recurringAmount: -100,
    poolLimit: 1000,
    poolLimitRate: 0.5,
    gradient: 18, // 현재 스냅샷 — initialGradient(10)와 의도적으로 다르게 둠
    initialGradient: 10,
    gGraceWeeks: 52,
    gStepWeeks: 26,
    gMax: 20,
    initialPoolLimitRate: 0.75,
    pGraceWeeks: 52,
    pStepWeeks: 26,
    poolLimitFloor: 0.5,
  },
}

describe('ReconfigureVrForm', () => {
  beforeEach(() => {
    mutateMock.mockClear()
    routerPushMock.mockClear()
    routerBackMock.mockClear()
    invalidateQueriesMock.mockClear()
    reconfigureSuccessHandler = undefined
  })

  it('경고 배너를 상시 노출한다', () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    expect(screen.getByText(/진행 중인 사이클이 즉시 종료되고 새 사이클이 시작되며/)).toBeInTheDocument()
  })

  it('램프 필드 초깃값을 gradient/poolLimit이 아닌 initialGradient/initialPoolLimitRate에서 채운다', () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    const initialGradientInput = screen.getByLabelText('초기 gradient(G)') as HTMLInputElement
    const initialPoolLimitRateInput = screen.getByLabelText('초기 poolLimitRate (%)') as HTMLInputElement
    expect(initialGradientInput.value).toBe('10')
    // initialPoolLimitRate는 0~1 비율로 저장되지만 화면엔 %로 환산해 표시(0.75 → 75)
    expect(initialPoolLimitRateInput.value).toBe('75')
  })

  it('제출 시 즉시 뮤테이션을 호출하지 않고 확인 다이얼로그를 먼저 띄운다', async () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    expect(await screen.findByText('VR 전략을 재설정하시겠습니까?')).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('확인 다이얼로그에서 확정하면 현재 폼 값으로 뮤테이션을 호출한다', async () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    await waitFor(() => expect(mutateMock).toHaveBeenCalled())
    expect(mutateMock.mock.calls[0][0]).toEqual(expect.objectContaining({
      bandWidth: 15,
      intervalWeeks: 4,
      initialGradient: 10,
      initialPoolLimitRate: 0.75,
    }))
  })

  it('재설정 성공 시 사이클이 교체되므로 해당 전략의 주문 미리보기를 무효화한 뒤 이동한다', async () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)

    await reconfigureSuccessHandler?.()

    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: orderKeys.preview(strategy.id) })
    expect(routerPushMock).toHaveBeenCalledWith(`/accounts/account-1/strategies/${strategy.id}`)
  })

  it('인출 모드로 전환 후 금액을 입력하면 음수로 제출된다', async () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    fireEvent.click(screen.getByRole('button', { name: '- 인출' }))
    fireEvent.change(screen.getByLabelText('적립금(+)/인출금(-)'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    await waitFor(() => expect(mutateMock).toHaveBeenCalled())
    expect(mutateMock.mock.calls[0][0].recurringAmount).toBe(-200)
  })

  it('금액 재입력 없이 인출→적립 모드만 전환해도 부호가 양수로 재계산된다', async () => {
    // strategy fixture는 recurringAmount: -100 (인출식)으로 설정돼 있음 — 초기 recurringMode는 WITHDRAW
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    fireEvent.click(screen.getByRole('button', { name: '+ 적립' }))

    const amountInput = screen.getByLabelText('적립금(+)/인출금(-)') as HTMLInputElement
    expect(amountInput.value).toBe('100')

    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    await waitFor(() => expect(mutateMock).toHaveBeenCalled())
    expect(mutateMock.mock.calls[0][0].recurringAmount).toBe(100)
  })

  it('금액 재입력 없이 적립→인출 모드만 전환해도 부호가 음수로 재계산된다', async () => {
    // recurringAmount가 양수(적립식)인 상태에서 시작해야 인출 전환 시 부호 재계산 여부가 갈린다 —
    // strategy 원본 fixture(-100)로는 WITHDRAW로 전환해도 값이 그대로 -100이라 버그 유무를 구분하지 못한다.
    const depositStrategy: ReconfigureVrStrategy = { ...strategy, vr: { ...strategy.vr, recurringAmount: 100 } }
    render(<ReconfigureVrForm accountId="account-1" strategy={depositStrategy} />)
    fireEvent.click(screen.getByRole('button', { name: '- 인출' }))

    const amountInput = screen.getByLabelText('적립금(+)/인출금(-)') as HTMLInputElement
    expect(amountInput.value).toBe('100')

    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    await waitFor(() => expect(mutateMock).toHaveBeenCalled())
    expect(mutateMock.mock.calls[0][0].recurringAmount).toBe(-100)
  })

  it('gMax가 initialGradient보다 작으면 확인 다이얼로그를 열지 않는다', async () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    fireEvent.change(screen.getByLabelText('gradient 상한'), { target: { value: '5' } }) // initialGradient=10보다 작음
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))

    // form.trigger()가 실제로 끝났다는 확실한 신호 — 인라인 에러 메시지가 뜰 때까지 기다린다
    await screen.findByText('gradient 상한은 초기값 이상이어야 합니다.')

    expect(screen.queryByText('VR 전략을 재설정하시겠습니까?')).not.toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('injectShares>0인데 매수단가를 비우면 확인 다이얼로그를 열지 않는다', async () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    fireEvent.change(screen.getByLabelText('편입 주식 수'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))

    // form.trigger()가 실제로 끝났다는 확실한 신호 — 인라인 에러 메시지가 뜰 때까지 기다린다
    await screen.findByText('주식을 편입하려면 매수단가를 입력하세요.')

    expect(screen.queryByText('VR 전략을 재설정하시겠습니까?')).not.toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('injectShares가 0보다 클 때만 매수단가 필드를 노출한다', () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    expect(screen.queryByLabelText('매수단가 (USD)')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('편입 주식 수'), { target: { value: '10' } })

    expect(screen.getByLabelText('매수단가 (USD)')).toBeInTheDocument()
  })

  it('추가 예수금은 소수점 둘째 자리까지만 입력되고 제출값에도 그대로 반영된다', async () => {
    const user = userEvent.setup()
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    const input = screen.getByLabelText('추가 예수금 (USD)') as HTMLInputElement

    await user.type(input, '123.456')
    expect(input.value).toBe('123.45')

    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    await waitFor(() => expect(mutateMock).toHaveBeenCalled())
    expect(mutateMock.mock.calls[0][0].injectDeposit).toBe(123.45)
  })

  it('추가 예수금에 음수를 입력하면(부호가 조용히 사라지지 않고) 검증 에러가 표시되고 제출이 막힌다', async () => {
    const user = userEvent.setup()
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    const input = screen.getByLabelText('추가 예수금 (USD)') as HTMLInputElement

    await user.type(input, '-50')
    expect(input.value).toBe('-50')

    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    await screen.findByText('Too small: expected number to be >=0')

    expect(screen.queryByText('VR 전략을 재설정하시겠습니까?')).not.toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('인출 주식 수·인출 예수금을 입력하면 제출값에 그대로 반영된다', async () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    fireEvent.change(screen.getByLabelText('인출 주식 수'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('인출 예수금 (USD)'), { target: { value: '150' } })

    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    await waitFor(() => expect(mutateMock).toHaveBeenCalled())
    expect(mutateMock.mock.calls[0][0].withdrawShares).toBe(4)
    expect(mutateMock.mock.calls[0][0].withdrawDeposit).toBe(150)
  })

  it('인출 예수금은 소수점 둘째 자리까지만 입력되고 제출값에도 그대로 반영된다', async () => {
    const user = userEvent.setup()
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    const input = screen.getByLabelText('인출 예수금 (USD)') as HTMLInputElement

    await user.type(input, '99.999')
    expect(input.value).toBe('99.99')

    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    await waitFor(() => expect(mutateMock).toHaveBeenCalled())
    expect(mutateMock.mock.calls[0][0].withdrawDeposit).toBe(99.99)
  })

  it('인출 필드를 비워두면 제출값에 포함되지 않는다', async () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    await waitFor(() => expect(mutateMock).toHaveBeenCalled())
    expect(mutateMock.mock.calls[0][0].withdrawShares).toBeUndefined()
    expect(mutateMock.mock.calls[0][0].withdrawDeposit).toBeUndefined()
  })

  it('dismiss가 back이면 취소 클릭 시 router.back을 호출한다', () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} dismiss="back" />)
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(routerBackMock).toHaveBeenCalled()
  })
})

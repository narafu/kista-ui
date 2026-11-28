import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { describe, expect, it, vi } from 'vitest'
import { accountKeys } from '@entities/account'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import { apiError, mockApi, type ApiHandlers } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { ReconfigureVrForm } from './ReconfigureVrForm'
import type { ReconfigureVrStrategy } from './model/reconfigureVrStrategy'

const strategy: ReconfigureVrStrategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'VR',
  status: 'ACTIVE',
  ticker: 'TQQQ',
  cycleSeedType: 'NONE',
  isReverseMode: false,
  cycleInProgress: true,
  allowedActions: [],
  blockedActions: [],
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


let requests: { method: string; path: string; body: unknown }[] = []

const PASSED = { fieldErrors: [], warnings: [], derived: {} }

function renderForm(target: ReconfigureVrStrategy = strategy, validation: ApiHandlers['POST /api/trading-cycles/{id}/vr-config-validations'] = PASSED) {
  ;({ requests } = mockApi({
    'POST /api/trading-cycles/{id}/vr-config-validations': validation,
    'PUT /api/trading-cycles/{id}/vr-config': strategy as never,
    // 저장 뒤 훅이 전략 목록을 다시 맞춘다
    'GET /api/trading-cycles': [strategy] as never,
    'GET /api/accounts/{accountId}/trading-cycles': [strategy] as never,
  }))
  return renderApp(<ReconfigureVrForm accountId="account-1" strategy={target} />)
}

// 보낸 PUT 바디 — JSON을 거치므로 undefined 필드는 없다
const submitted = () => requests.find((r) => r.method === 'PUT')?.body as Record<string, unknown> | undefined
const submittedAfterSend = async () => {
  await waitFor(() => expect(submitted()).toBeDefined())
  return submitted() as Record<string, unknown>
}

describe('ReconfigureVrForm', () => {
  it('경고 배너를 상시 노출한다', () => {
    renderForm(strategy)
    expect(screen.getByText(/진행 중인 사이클이 즉시 종료되고 새 사이클이 시작되며/)).toBeInTheDocument()
  })

  it('램프 필드 초깃값을 gradient/poolLimit이 아닌 initialGradient/initialPoolLimitRate에서 채운다', () => {
    renderForm(strategy)
    const initialGradientInput = screen.getByLabelText('초기 gradient(G)') as HTMLInputElement
    const initialPoolLimitRateInput = screen.getByLabelText('초기 poolLimitRate') as HTMLInputElement
    expect(initialGradientInput.value).toBe('10')
    // initialPoolLimitRate는 0~1 비율로 저장되지만 화면엔 %로 환산해 표시(0.75 → 75)
    expect(initialPoolLimitRateInput.value).toBe('75')
  })

  it('gradient 단계주기를 0으로 바꾸면 상한·유예가 0으로 비활성되고, 0에서 벗어나면 빈 칸으로 리셋된다', () => {
    renderForm(strategy)
    const step = screen.getByLabelText('gradient 단계주기') as HTMLInputElement
    const gMax = screen.getByLabelText('gradient 상한') as HTMLInputElement
    const grace = screen.getByLabelText('gradient 유예') as HTMLInputElement
    fireEvent.change(step, { target: { value: '0' } })
    expect(gMax).toBeDisabled()
    expect(gMax.value).toBe('0')
    expect(grace).toBeDisabled()
    expect(grace.value).toBe('0')
    fireEvent.change(step, { target: { value: '10' } })
    expect(gMax).not.toBeDisabled()
    expect(gMax.value).toBe('')
    expect(grace.value).toBe('')
  })

  it('poolLimitRate 단계주기를 0으로 바꾸면 하한·유예가 0으로 비활성되고, 0에서 벗어나면 빈 칸으로 리셋된다', () => {
    renderForm(strategy)
    const step = screen.getByLabelText('poolLimitRate 단계주기') as HTMLInputElement
    const floor = screen.getByLabelText('poolLimitRate 하한') as HTMLInputElement
    const grace = screen.getByLabelText('poolLimitRate 유예') as HTMLInputElement
    fireEvent.change(step, { target: { value: '0' } })
    expect(floor).toBeDisabled()
    expect(floor.value).toBe('0')
    expect(grace).toBeDisabled()
    fireEvent.change(step, { target: { value: '8' } })
    expect(floor).not.toBeDisabled()
    expect(floor.value).toBe('')
    expect(grace.value).toBe('')
  })

  it('제출 시 즉시 뮤테이션을 호출하지 않고 확인 다이얼로그를 먼저 띄운다', async () => {
    renderForm(strategy)
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    expect(await screen.findByText('VR 전략을 재설정하시겠습니까?')).toBeInTheDocument()
    expect(submitted()).toBeUndefined()
  })

  it('확인 다이얼로그에서 확정하면 현재 폼 값으로 뮤테이션을 호출한다', async () => {
    renderForm(strategy)
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    const body = await submittedAfterSend()
    expect(body).toEqual(expect.objectContaining({
      bandWidth: 15,
      intervalWeeks: 4,
      initialGradient: 10,
      initialPoolLimitRate: 0.75,
    }))
  })

  it('서버 검증은 제출과 같은 바디를 받고, 지금 입력에 대한 거절이면 확인 다이얼로그를 열지 않는다', async () => {
    renderForm(strategy, { fieldErrors: [{ field: 'withdrawShares', detail: '보유 수량보다 많이 인출할 수 없습니다.' }], warnings: [], derived: {} })
    expect(await screen.findByText('보유 수량보다 많이 인출할 수 없습니다.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    // onSubmit은 비동기 검증(form.trigger) 뒤에 다이얼로그를 연다 — 그 판정이 끝날 때까지 기다린 뒤 확인한다
    await act(() => new Promise((r) => setTimeout(r, 50)))
    expect(screen.queryByText('VR 전략을 재설정하시겠습니까?')).not.toBeInTheDocument()
    expect(screen.getByText('보유 수량보다 많이 인출할 수 없습니다.')).toHaveFocus()
    expect(requests.find((r) => r.method === 'POST')?.body).toEqual({
      bandWidth: 15, intervalWeeks: 4, recurringAmount: -100,
      initialGradient: 10, gGraceWeeks: 52, gStepWeeks: 26, gMax: 20,
      initialPoolLimitRate: 0.75, pGraceWeeks: 52, pStepWeeks: 26, poolLimitFloor: 0.5,
    })
  })

  it('검증 호출이 실패해도(503) 제출을 막지 않는다 — 제출에서 서버가 다시 거른다', async () => {
    renderForm(strategy, apiError(503, { detail: '증권사 응답 지연' }))
    // 막지 않고 안내만 한다(1회 재시도 뒤)
    expect(await screen.findByText('입력값 사전 확인을 불러오지 못했습니다. 제출하면 서버가 다시 확인합니다.', {}, { timeout: 3000 })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))
    expect(await submittedAfterSend()).toEqual(expect.objectContaining({ bandWidth: 15 }))
  })

  it('재설정 성공 시 사이클이 교체되므로 주문 미리보기 등을 무효화한 뒤 상세로 이동한다', async () => {
    const { queryClient } = renderForm(strategy)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    await waitFor(() => expect(useRouter().push).toHaveBeenCalledWith(`/accounts/account-1/strategies/${strategy.id}`))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: orderKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: tradeKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: statsKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: accountKeys.ledgerTotals('account-1') })
  })

  it('인출 모드로 전환 후 금액을 입력하면 음수로 제출된다', async () => {
    renderForm(strategy)
    fireEvent.click(screen.getByRole('button', { name: '- 인출' }))
    fireEvent.change(screen.getByLabelText('적립금(+)/인출금(-)'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    expect((await submittedAfterSend()).recurringAmount).toBe(-200)
  })

  it('금액 재입력 없이 인출→적립 모드만 전환해도 부호가 양수로 재계산된다', async () => {
    // strategy fixture는 recurringAmount: -100 (인출식)으로 설정돼 있음 — 초기 recurringMode는 WITHDRAW
    renderForm(strategy)
    fireEvent.click(screen.getByRole('button', { name: '+ 적립' }))

    const amountInput = screen.getByLabelText('적립금(+)/인출금(-)') as HTMLInputElement
    expect(amountInput.value).toBe('100')

    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    expect((await submittedAfterSend()).recurringAmount).toBe(100)
  })

  it('금액 재입력 없이 적립→인출 모드만 전환해도 부호가 음수로 재계산된다', async () => {
    // recurringAmount가 양수(적립식)인 상태에서 시작해야 인출 전환 시 부호 재계산 여부가 갈린다 —
    // strategy 원본 fixture(-100)로는 WITHDRAW로 전환해도 값이 그대로 -100이라 버그 유무를 구분하지 못한다.
    const depositStrategy: ReconfigureVrStrategy = { ...strategy, vr: { ...strategy.vr, recurringAmount: 100 } }
    renderForm(depositStrategy)
    fireEvent.click(screen.getByRole('button', { name: '- 인출' }))

    const amountInput = screen.getByLabelText('적립금(+)/인출금(-)') as HTMLInputElement
    expect(amountInput.value).toBe('100')

    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    expect((await submittedAfterSend()).recurringAmount).toBe(-100)
  })

  it('인출 모드에서 금액 칸을 비우면 거치로 바꾸지 않고 오류로 막는다', async () => {
    // fixture는 recurringAmount: -100 — 초기 모드 WITHDRAW
    renderForm(strategy)
    fireEvent.change(screen.getByLabelText('적립금(+)/인출금(-)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))

    expect(await screen.findByText('인출금을 0보다 크게 입력하세요.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '재설정 확정' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('적립금(+)/인출금(-)'), { target: { value: '50' } })
    await waitFor(() => expect(screen.queryByText('인출금을 0보다 크게 입력하세요.')).not.toBeInTheDocument())
  })

  it('거치에서 적립으로 바꾼 직후엔 오류를 띄우지 않고, 금액 없이 제출하면 적립금 오류로 막는다', async () => {
    const holdStrategy: ReconfigureVrStrategy = { ...strategy, vr: { ...strategy.vr, recurringAmount: 0 } }
    renderForm(holdStrategy)
    fireEvent.click(screen.getByRole('button', { name: '+ 적립' }))
    expect(screen.queryByText('적립금을 0보다 크게 입력하세요.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    expect(await screen.findByText('적립금을 0보다 크게 입력하세요.')).toBeInTheDocument()
  })

  it('거치 모드로 바꾸면 0으로 보낸다', async () => {
    renderForm(strategy)
    fireEvent.click(screen.getByRole('button', { name: '거치' }))
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    expect((await submittedAfterSend()).recurringAmount).toBe(0)
    expect(submitted()).not.toHaveProperty('recurringMode')
  })

  it('gMax가 initialGradient보다 작으면 확인 다이얼로그를 열지 않는다', async () => {
    renderForm(strategy)
    fireEvent.change(screen.getByLabelText('gradient 상한'), { target: { value: '5' } }) // initialGradient=10보다 작음
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))

    // form.trigger()가 실제로 끝났다는 확실한 신호 — 인라인 에러 메시지가 뜰 때까지 기다린다
    await screen.findByText('gradient 상한은 초기값 이상이어야 합니다.')
    await waitFor(() => expect(screen.getByLabelText('gradient 상한')).toHaveFocus())

    expect(screen.queryByText('VR 전략을 재설정하시겠습니까?')).not.toBeInTheDocument()
    expect(submitted()).toBeUndefined()
  })

  it('injectShares>0인데 매수단가를 비우면 확인 다이얼로그를 열지 않는다', async () => {
    renderForm(strategy)
    fireEvent.change(screen.getByLabelText('편입 주식 수'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))

    // form.trigger()가 실제로 끝났다는 확실한 신호 — 인라인 에러 메시지가 뜰 때까지 기다린다
    await screen.findByText('주식을 편입하려면 매수단가를 입력하세요.')

    expect(screen.queryByText('VR 전략을 재설정하시겠습니까?')).not.toBeInTheDocument()
    expect(submitted()).toBeUndefined()
  })

  it('injectShares가 0보다 클 때만 매수단가 필드를 노출한다', () => {
    renderForm(strategy)
    expect(screen.queryByLabelText('매수단가')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('편입 주식 수'), { target: { value: '10' } })

    expect(screen.getByLabelText('매수단가')).toBeInTheDocument()
  })

  it('매수단가는 소수점 둘째 자리까지만 입력되고 제출값에도 그대로 반영된다', async () => {
    const user = userEvent.setup()
    renderForm(strategy)
    fireEvent.change(screen.getByLabelText('편입 주식 수'), { target: { value: '10' } })
    const input = screen.getByLabelText('매수단가') as HTMLInputElement

    await user.type(input, '87.123')
    expect(input.value).toBe('87.12')

    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    expect((await submittedAfterSend()).injectSharePrice).toBe(87.12)
  })

  it('추가 예수금은 소수점 둘째 자리까지만 입력되고 제출값에도 그대로 반영된다', async () => {
    const user = userEvent.setup()
    renderForm(strategy)
    const input = screen.getByLabelText('추가 예수금') as HTMLInputElement

    await user.type(input, '123.456')
    expect(input.value).toBe('123.45')

    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    expect((await submittedAfterSend()).injectDeposit).toBe(123.45)
  })

  it('추가 예수금에 음수를 입력하면(부호가 조용히 사라지지 않고) 검증 에러가 표시되고 제출이 막힌다', async () => {
    const user = userEvent.setup()
    renderForm(strategy)
    const input = screen.getByLabelText('추가 예수금') as HTMLInputElement

    await user.type(input, '-50')
    expect(input.value).toBe('-50')

    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    await screen.findByText('0 이상으로 입력하세요.')

    expect(screen.queryByText('VR 전략을 재설정하시겠습니까?')).not.toBeInTheDocument()
    expect(submitted()).toBeUndefined()
  })

  it('인출 주식 수·인출 예수금을 입력하면 제출값에 그대로 반영된다', async () => {
    renderForm(strategy)
    fireEvent.change(screen.getByLabelText('인출 주식 수'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('인출 예수금'), { target: { value: '150' } })

    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    expect((await submittedAfterSend()).withdrawShares).toBe(4)
    expect(submitted()?.withdrawDeposit).toBe(150)
  })

  it('인출 예수금은 소수점 둘째 자리까지만 입력되고 제출값에도 그대로 반영된다', async () => {
    const user = userEvent.setup()
    renderForm(strategy)
    const input = screen.getByLabelText('인출 예수금') as HTMLInputElement

    await user.type(input, '99.999')
    expect(input.value).toBe('99.99')

    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    expect((await submittedAfterSend()).withdrawDeposit).toBe(99.99)
  })

  it('인출 필드를 비워두면 제출값에 포함되지 않는다', async () => {
    renderForm(strategy)
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

    const body = await submittedAfterSend()
    expect(body.withdrawShares).toBeUndefined()
    expect(body.withdrawDeposit).toBeUndefined()
  })

  it.each([
    ['밴드 폭', '0'],
    ['리밸런싱 주기', '0'],
    ['초기 gradient(G)', '0'],
    ['gradient 유예', '-1'],
    ['gradient 단계주기', '-1'],
    ['초기 poolLimitRate', '150'],
    ['poolLimitRate 유예', '-1'],
    ['poolLimitRate 단계주기', '-1'],
    ['편입 주식 수', '-1'],
    ['인출 주식 수', '-1'],
    ['추가 예수금', '-1'],
    ['인출 예수금', '-1'],
  ])('%s 칸의 오류를 표시하고 막힌 제출은 그 칸으로 포커스를 옮긴다', async (label, value) => {
    renderForm(strategy)
    const input = screen.getByLabelText(label)
    fireEvent.change(input, { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))

    await waitFor(() => expect(input).toHaveFocus())
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(/입력하세요/)
    expect(screen.queryByText('VR 전략을 재설정하시겠습니까?')).not.toBeInTheDocument()
  })

  it('오류가 여럿이면 화면에서 첫 오류 칸으로 포커스를 옮긴다', async () => {
    renderForm(strategy)
    fireEvent.change(screen.getByLabelText('인출 예수금'), { target: { value: '-1' } })
    fireEvent.change(screen.getByLabelText('밴드 폭'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))

    await waitFor(() => expect(screen.getByLabelText('밴드 폭')).toHaveFocus())
  })

  it('매수단가 오류가 남은 채 편입 주식 수를 지워도 칸을 숨기지 않는다', async () => {
    renderForm(strategy)
    fireEvent.change(screen.getByLabelText('편입 주식 수'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('매수단가'), { target: { value: '0' } })
    await waitFor(() => expect(screen.getByLabelText('매수단가')).toHaveAttribute('aria-invalid', 'true'))
    fireEvent.change(screen.getByLabelText('편입 주식 수'), { target: { value: '' } })

    expect(screen.getByLabelText('매수단가')).toBeInTheDocument()
  })

  it('매수단가 누락 오류는 편입 주식 수를 지우면 바로 사라진다', async () => {
    renderForm(strategy)
    const shares = screen.getByLabelText('편입 주식 수')
    fireEvent.change(shares, { target: { value: '10' } })
    // 한 번 입력했다가 지운 칸은 주식 수를 지워도 남으므로, 남은 오류가 화면에 보인다
    fireEvent.change(screen.getByLabelText('매수단가'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('매수단가'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    await screen.findByText('주식을 편입하려면 매수단가를 입력하세요.')

    fireEvent.change(shares, { target: { value: '' } })

    await waitFor(() => expect(screen.queryByText('주식을 편입하려면 매수단가를 입력하세요.')).not.toBeInTheDocument())
    expect(screen.getByLabelText('매수단가')).not.toHaveAttribute('aria-invalid')
  })

  it('제출 전에는 편입 주식 수를 바꿔도 매수단가 오류를 띄우지 않는다', async () => {
    renderForm(strategy)
    const shares = screen.getByLabelText('편입 주식 수')
    fireEvent.change(shares, { target: { value: '1' } })
    fireEvent.change(shares, { target: { value: '10' } })
    await act(() => new Promise((r) => setTimeout(r, 50)))

    expect(screen.getByLabelText('매수단가')).not.toHaveAttribute('aria-invalid')
  })

  it('편입 주식 수를 지운 채 매수단가를 고쳐도 입력 중인 칸이 사라지지 않는다', async () => {
    renderForm(strategy)
    fireEvent.change(screen.getByLabelText('편입 주식 수'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('매수단가'), { target: { value: '0' } })
    await waitFor(() => expect(screen.getByLabelText('매수단가')).toHaveAttribute('aria-invalid', 'true'))
    fireEvent.change(screen.getByLabelText('편입 주식 수'), { target: { value: '' } })

    fireEvent.change(screen.getByLabelText('매수단가'), { target: { value: '5' } })
    await waitFor(() => expect(screen.getByLabelText('매수단가')).not.toHaveAttribute('aria-invalid'))
    fireEvent.change(screen.getByLabelText('매수단가'), { target: { value: '' } })
    await act(() => new Promise((r) => setTimeout(r, 50)))
    expect(screen.getByLabelText('매수단가')).toBeInTheDocument()
  })

  it('주식 수 칸은 소수를 받지 않는다', () => {
    renderForm(strategy)
    for (const label of ['편입 주식 수', '인출 주식 수']) {
      const input = screen.getByLabelText(label)
      fireEvent.change(input, { target: { value: '1.5' } })
      expect(input).toHaveValue('')
    }
  })

  describe('인출 예수금 장부 한도', () => {
    const withLedger: ReconfigureVrStrategy = { ...strategy, ledgerDeposit: 100.009 }
    const message = '장부 예수금 $100.00 이하로 입력하세요.'
    const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
    const submit = () => fireEvent.click(screen.getByRole('button', { name: '재설정' }))

    it('장부 예수금을 센트 아래 버림으로 보여준다', () => {
      renderForm({ ...strategy, ledgerDeposit: 100.009 })
      expect(screen.getByText('현재 장부 예수금 $100.00')).toBeInTheDocument()
    })

    it('장부 예수금이 없으면 표시하지 않는다', () => {
      renderForm(strategy)
      expect(screen.queryByText(/현재 장부 예수금/)).not.toBeInTheDocument()
    })

    it('한도를 넘으면 칸 오류를 띄우고 포커스를 옮기며 확인 다이얼로그를 열지 않는다', async () => {
      renderForm(withLedger)
      type('인출 예수금', '100.01')
      submit()

      await waitFor(() => expect(screen.getByLabelText('인출 예수금')).toHaveFocus())
      expect(screen.getByText(message)).toBeInTheDocument()
      expect(screen.queryByText('VR 전략을 재설정하시겠습니까?')).not.toBeInTheDocument()
    })

    it('같은 요청의 추가 예수금은 한도에 합치지 않는다(서버 기준)', async () => {
      renderForm(withLedger)
      type('추가 예수금', '50')
      type('인출 예수금', '120')
      submit()

      expect(await screen.findByText(message)).toBeInTheDocument()
      expect(screen.queryByText('VR 전략을 재설정하시겠습니까?')).not.toBeInTheDocument()
    })

    it('같은 칸에 화면 오류가 있으면 서버의 같은 지적은 겹쳐 보이지 않는다', async () => {
      renderForm(withLedger, { fieldErrors: [{ field: 'withdrawDeposit', detail: '보유 예수금을 초과할 수 없습니다.' }], warnings: [], derived: {} })
      expect(await screen.findByText('보유 예수금을 초과할 수 없습니다.')).toBeInTheDocument()
      type('인출 예수금', '120')

      expect(await screen.findByText(message)).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByText('보유 예수금을 초과할 수 없습니다.')).not.toBeInTheDocument())
    })

    it('한도와 같은 금액은 제출한다', async () => {
      renderForm(withLedger)
      type('인출 예수금', '100')
      submit()
      fireEvent.click(await screen.findByRole('button', { name: '재설정 확정' }))

      expect((await submittedAfterSend()).withdrawDeposit).toBe(100)
    })
  })

  it('취소를 누르면 상세 페이지로 이동한다', () => {
    renderForm(strategy)
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(useRouter().push).toHaveBeenCalledWith(`/accounts/account-1/strategies/${strategy.id}`)
  })
})

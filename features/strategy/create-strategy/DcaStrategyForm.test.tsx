import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { accountKeys } from '@entities/account'
import { MetaProvider } from '@entities/meta'
import type { DcaRule, Strategy } from '@entities/strategy'
import { DcaStrategyForm } from './DcaStrategyForm'
import { testMeta } from '@entities/meta/__fixtures__/testMeta'

const createMutate = vi.fn()
const createPending = vi.hoisted(() => ({ value: false }))
const cashPreview = vi.hoisted(() => ({ data: undefined as number | null | undefined, enabled: [] as boolean[] }))
const hookSuccess = vi.hoisted(() => ({ create: undefined as (() => Promise<void>) | undefined }))
const reconfigureMutate = vi.fn()
const seedPreview = vi.hoisted(() => ({ availableCash: null as number | null, rejected: false, calls: [] as unknown[][], fieldErrors: [] as { field: string | null; detail: string }[] }))
vi.mock('@entities/strategy', async (orig) => ({
  ...(await orig<typeof import('@entities/strategy')>()),
  useCreateStrategyMutation: (_accountId: string, onSuccess?: () => Promise<void>) => {
    hookSuccess.create = onSuccess
    return { mutate: createMutate, isPending: createPending.value }
  },
  useReconfigureDcaMutation: () => ({ mutate: reconfigureMutate, isPending: false }),
  useDcaAvailableCashQuery: (_accountId: string, _ticker: string, options: { enabled: boolean }) => {
    cashPreview.enabled.push(options.enabled)
    return { data: cashPreview.data }
  },
  useStrategyValidationQuery: (...args: unknown[]) => {
    seedPreview.calls.push(args)
    const derived = seedPreview.rejected ? null : { basePrice: null, minSeed: null, skipReason: null, availableCash: seedPreview.availableCash }
    const data = { fieldErrors: seedPreview.fieldErrors, warnings: [], derived }
    return { data, current: data, isLoading: false, isError: false, refetch: vi.fn() }
  },
}))

const meta = {
  ...testMeta,
  strategyTypes: [{
    code: 'DCA', availableTickers: ['UPRO', 'QLD'], requiresPrivacyBase: false, tickerFixed: false, supportsReverseMode: false,
    divisionCounts: [], orderTypes: ['MOO', 'MOC'], directions: ['BUY', 'SELL'],
    frequencies: ['DAILY', 'WEEKLY', 'MONTHLY'], conditionIndicators: ['AVG_PRICE', 'SMA', 'RSI', 'FEAR_GREED'],
    enabled: true, fields: { ticker: { customizable: true, allowedValues: ['UPRO'], defaultValue: 'UPRO' } },
  }],
}

function rule(ruleKey: string, amount: number, o: Partial<DcaRule> = {}): DcaRule {
  return {
    ruleKey, direction: 'BUY', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOO',
    sizing: { type: 'AMOUNT', amount, percent: null }, shortfall: 'PARTIAL', conditions: [], nextExecution: null, lastExecution: null, ...o,
  }
}

function existing(rules: DcaRule[]): Strategy {
  return {
    id: 's1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'QLD', cycleSeedType: 'NONE', isReverseMode: false, cycleInProgress: true, allowedActions: [], blockedActions: [],
    dca: { rules, currentHoldings: null, avgPrice: null },
  }
}

const queryClient = new QueryClient()

function renderForm(initial?: Strategy, header?: React.ReactNode, props: Partial<React.ComponentProps<typeof DcaStrategyForm>> = {}) {
  return render(
    <QueryClientProvider client={queryClient}><MetaProvider meta={meta}>
      <DcaStrategyForm accountId="a1" initial={initial} availableTickers={['UPRO', 'QLD']} defaultTicker="UPRO" tickerCustomizable prices={null} header={header} {...props} />
    </MetaProvider></QueryClientProvider>,
  )
}

const row = (name: RegExp) => screen.getByRole('button', { name })

describe('DcaStrategyForm', () => {
  beforeEach(() => {
    createMutate.mockClear()
    reconfigureMutate.mockClear()
    seedPreview.availableCash = null
    seedPreview.calls = []
    seedPreview.fieldErrors = []
    createPending.value = false
    seedPreview.rejected = false
    cashPreview.data = undefined
    cashPreview.enabled = []
    // jsdom의 history.back은 popstate를 비동기로 쏘거나 생략할 수 있어 동기 popstate로 고정한다
    vi.spyOn(window.history, 'back').mockImplementation(() => window.dispatchEvent(new PopStateEvent('popstate', { state: null })))
  })
  afterEach(() => {
    window.history.replaceState(null, '')
    vi.restoreAllMocks()
  })

  it('등록: 규칙 0개면 제출을 막고 안내한다', async () => {
    renderForm()
    expect(screen.getByText('규칙을 추가하세요.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(screen.getByText('규칙을 추가하세요.')).toHaveClass('text-status-error'))
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('등록: 매수 규칙 추가 → 완료 → 요약 줄 → 등록 payload에 ruleKey 키가 없다', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '매수 규칙 추가' }))
    expect(screen.getByRole('heading', { level: 2, name: '매수 규칙' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: '등록' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))

    const summary = await screen.findByRole('button', { name: /주기 매일 · MOC 금액 \$300/ })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(screen.getByText('규칙 (1/10)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(createMutate).toHaveBeenCalled())
    const payload = createMutate.mock.calls[0][0]
    expect(payload).toMatchObject({ type: 'DCA', ticker: 'UPRO', dca: { rules: [{ direction: 'BUY', sizing: { type: 'AMOUNT', amount: 300, percent: null } }] } })
    expect(payload.dca.rules[0]).not.toHaveProperty('ruleKey')
    // 성공하면 전략 합산 예수금 캐시를 무효화한다
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await hookSuccess.create?.()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: accountKeys.ledgerTotals('a1') })
    expect(reconfigureMutate).not.toHaveBeenCalled()
  })

  it('등록: 평단가·수량 입력이 있고 수정 모드엔 없다', () => {
    const { unmount } = renderForm()
    expect(screen.getByLabelText('평단가')).toBeInTheDocument()
    expect(screen.getByLabelText('수량')).toBeInTheDocument()
    unmount()
    renderForm(existing([rule('a', 100)]))
    expect(screen.queryByLabelText('평단가')).not.toBeInTheDocument()
  })

  it('등록: 가용 예수금을 계좌 통화로 보여주고 100% 채우기 값이 initialDeposit으로 실린다', async () => {
    seedPreview.availableCash = 1500
    renderForm()
    expect(seedPreview.calls[0][0]).toEqual({ kind: 'create', accountId: 'a1' })
    expect(seedPreview.calls[0][1]).toMatchObject({ type: 'DCA', ticker: 'UPRO' })
    expect(screen.getByText('가용 예수금 $1,500.00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '100%' }))
    expect(screen.getByLabelText('예수금 (USD)')).toHaveValue('1500')
    fireEvent.click(screen.getByRole('button', { name: '매수 규칙 추가' }))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await screen.findByText('규칙 (1/10)')
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(createMutate).toHaveBeenCalled())
    expect(createMutate.mock.calls[0][0]).toMatchObject({ initialDeposit: 1500 })
  })

  it('등록: 서버 검증이 지금 입력을 거절하면 사유를 보이고 등록하지 않는다', async () => {
    seedPreview.fieldErrors = [{ field: 'ticker', detail: '이미 같은 종목의 전략이 있습니다.' }]
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '매수 규칙 추가' }))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await screen.findByText('규칙 (1/10)')
    const reason = screen.getByText('이미 같은 종목의 전략이 있습니다.')
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(reason).toHaveFocus())
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('등록: 규칙이 없을 때는 서버의 빈 규칙 거절을 보이지 않는다(손대기 전부터 뜨지 않게)', () => {
    seedPreview.fieldErrors = [{ field: 'dca', detail: 'DCA 규칙은 1개 이상이어야 합니다.' }]
    renderForm()
    expect(screen.queryByText('DCA 규칙은 1개 이상이어야 합니다.')).not.toBeInTheDocument()
  })

  it('수정: 예수금은 읽기전용이고 가용 예수금을 조회하지 않는다', () => {
    renderForm({ ...existing([rule('a', 100)]), initialDeposit: 1700, ledgerDeposit: 700.009 }, undefined, { prices: { QLD: 91.5 } })
    expect(screen.queryByLabelText(/^예수금/)).not.toBeInTheDocument()
    expect(screen.getByText('현재 장부 예수금')).toBeInTheDocument()
    expect(screen.getByText('$700.00')).toBeInTheDocument()
    expect(screen.queryByText('$1,700.00')).not.toBeInTheDocument() // 사이클 시작금액(보유 원가 포함)은 예수금이 아니다
    expect(screen.getByText('$91.50')).toBeInTheDocument()
    expect(screen.getByText('예수금은 투자금 추가·인출로 바꿉니다')).toBeInTheDocument()
    expect(cashPreview.enabled).not.toContain(true)
    expect(seedPreview.calls.some((c) => (c[2] as { enabled: (body: unknown) => boolean }).enabled(c[1]))).toBe(false)
  })

  it('등록: 매도 규칙이 있고 수량이 비면 보유 0 캡션, 매수만이면 없다', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '매수 규칙 추가' }))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await screen.findByText('규칙 (1/10)')
    expect(screen.queryByText('보유 0에서 시작합니다. 이미 보유 중이면 입력하세요.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '매도 규칙 추가' }))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await screen.findByText('규칙 (2/10)')
    expect(screen.getByText('보유 0에서 시작합니다. 이미 보유 중이면 입력하세요.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('수량'), { target: { value: '5' } })
    expect(screen.queryByText('보유 0에서 시작합니다. 이미 보유 중이면 입력하세요.')).not.toBeInTheDocument()
  })

  it('등록: 수량·평단가를 입력하면 payload에 initialHoldings·initialAvgPrice', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '매수 규칙 추가' }))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await screen.findByText('규칙 (1/10)')
    fireEvent.change(screen.getByLabelText('평단가'), { target: { value: '45.5' } })
    fireEvent.change(screen.getByLabelText('수량'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(createMutate).toHaveBeenCalled())
    expect(createMutate.mock.calls[0][0]).toMatchObject({ initialHoldings: 10, initialAvgPrice: 45.5 })
  })

  it('주식 등록: 규칙 1개를 채워 제출하면 요청 payload 전체가 고정된다', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '매수 규칙 추가' }))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await screen.findByText('규칙 (1/10)')
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(createMutate).toHaveBeenCalled())
    expect(createMutate.mock.calls[0][0]).toEqual({
      type: 'DCA', ticker: 'UPRO', cycleSeedType: 'NONE', scheduledStartDate: expect.any(String),
      dca: { rules: [{
        direction: 'BUY', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOC', shortfall: 'PARTIAL',
        sizing: { type: 'AMOUNT', amount: 300, percent: null }, conditions: [],
      }] },
    })
  })

  it('수정: 편집·삭제·추가 후 기존 ruleKey는 보존하고 새 규칙은 null로 보낸다', async () => {
    renderForm(existing([rule('a', 100), rule('b', 200)]))
    fireEvent.click(row(/\$200/))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '250' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await screen.findByRole('button', { name: /\$250/ })

    fireEvent.click(row(/\$100/))
    fireEvent.click(screen.getByRole('button', { name: '규칙 삭제' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /\$100/ })).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: '매도 규칙 추가' }))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await screen.findByText('규칙 (2/10)')

    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    await waitFor(() => expect(reconfigureMutate).toHaveBeenCalled())
    expect(reconfigureMutate.mock.calls[0][0]).toEqual({
      rules: [
        expect.objectContaining({ ruleKey: 'b', direction: 'BUY', sizing: { type: 'AMOUNT', amount: 250, percent: null } }),
        expect.objectContaining({ ruleKey: null, direction: 'SELL', sizing: { type: 'AMOUNT', amount: 50, percent: null } }),
      ],
    })
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('이전·← 규칙 목록은 편집 내용을 버리고 해당 줄로 포커스를 돌린다', async () => {
    renderForm(existing([rule('a', 100)]))
    fireEvent.click(row(/\$100/))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '999' } })
    fireEvent.click(screen.getByRole('button', { name: '이전' }))
    await waitFor(() => expect(row(/\$100/)).toHaveFocus())

    fireEvent.click(row(/\$100/))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '999' } })
    fireEvent.click(screen.getByRole('button', { name: '← 규칙 목록' }))
    await waitFor(() => expect(row(/\$100/)).toHaveFocus())
    expect(screen.queryByRole('button', { name: /\$999/ })).not.toBeInTheDocument()
  })

  it('새 규칙에서 이전을 누르면 규칙이 늘지 않고 누른 추가 버튼으로 포커스가 돌아간다', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '매도 규칙 추가' }))
    fireEvent.click(screen.getByRole('button', { name: '이전' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '매도 규칙 추가' })).toHaveFocus())
    expect(screen.getByText('규칙 (0/10)')).toBeInTheDocument()
  })

  it('브라우저 뒤로가기(표식 없는 popstate)도 이전과 같다', async () => {
    renderForm(existing([rule('a', 100)]))
    fireEvent.click(row(/\$100/))
    expect(screen.getByRole('heading', { level: 2, name: '매수 규칙' })).toBeInTheDocument()
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
    await waitFor(() => expect(row(/\$100/)).toHaveFocus())
  })

  it('header(유형 선택)는 목록 화면에만 있고 편집 화면엔 없다', async () => {
    renderForm(existing([rule('a', 100)]), <div>type-section</div>)
    expect(screen.getByText('type-section')).toBeInTheDocument()
    fireEvent.click(row(/\$100/))
    expect(screen.queryByText('type-section')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '이전' }))
    await screen.findByText('type-section')
  })

  it('등록: 매수 규칙에 평단가 조건이 있고 수량이 비면 보유 0 캡션', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '매수 규칙 추가' }))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '조건 추가' })) // 메타 첫 지표 = AVG_PRICE
    fireEvent.change(screen.getByRole('spinbutton', { name: '조건 1 기준값' }), { target: { value: '-5' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await screen.findByText('규칙 (1/10)')
    expect(screen.getByText('보유 0에서 시작합니다. 이미 보유 중이면 입력하세요.')).toBeInTheDocument()
  })

  it('완료를 연타해도 규칙은 한 번만 반영된다', async () => {
    // 이력 이동이 끝나기 전(popstate 전) 두 번째 클릭이 들어오는 상황 — back을 no-op으로 두고 popstate는 직접 쏜다
    vi.spyOn(window.history, 'back').mockImplementation(() => {})
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '매수 규칙 추가' }))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await waitFor(() => expect(window.history.back).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 0)) // 두 번째 제출의 비동기 검증까지 끝낸다
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
    await screen.findByText('규칙 (1/10)')
    expect(window.history.back).toHaveBeenCalledTimes(1)
  })

  it('등록 시도 후 보유 시작값 오류는 두 필드에 따로 표시되고, 고치면 반대쪽 오류도 사라진다', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '매수 규칙 추가' }))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await screen.findByText('규칙 (1/10)')
    fireEvent.change(screen.getByLabelText('수량'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(screen.getByLabelText('평단가')).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByLabelText('평단가')).toHaveAccessibleDescription(/보유 수량을 입력하면 평단가는 0보다 커야 합니다/)
    fireEvent.change(screen.getByLabelText('수량'), { target: { value: '' } })
    await waitFor(() => expect(screen.getByLabelText('평단가')).not.toHaveAttribute('aria-invalid'))
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('편집 진입 시 이력을 한 칸 쌓는다', () => {
    const push = vi.spyOn(window.history, 'pushState')
    renderForm(existing([rule('a', 100)]))
    fireEvent.click(row(/\$100/))
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('규칙 10개면 추가 버튼 두 개 모두 숨긴다', () => {
    renderForm(existing(Array.from({ length: 10 }, (_, i) => rule(`r${i}`, 100 + i))))
    expect(screen.getByText('규칙 (10/10)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '매수 규칙 추가' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '매도 규칙 추가' })).not.toBeInTheDocument()
  })

  const addBuyRule = async () => {
    fireEvent.click(screen.getByRole('button', { name: '매수 규칙 추가' }))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await screen.findByText('규칙 (1/10)')
  }

  it('등록: 검증 파생값이 없으면(규칙 추가 전 400) 시드 미리보기의 가용 예수금으로 채우기 버튼을 보인다', () => {
    seedPreview.rejected = true
    cashPreview.data = 1500
    renderForm()
    expect(cashPreview.enabled.at(-1)).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '100%' }))
    expect(screen.getByLabelText('예수금 (USD)')).toHaveValue('1500')
  })

  it('등록: 검증 파생값이 있으면 그 값을 쓰고 미리보기를 조회하지 않는다', () => {
    seedPreview.availableCash = 700
    cashPreview.data = 1500
    renderForm()
    expect(screen.getByText('가용 예수금 $700.00')).toBeInTheDocument()
    expect(cashPreview.enabled).not.toContain(true)
  })

  it('등록: 미리보기가 값을 못 주면 버튼 없이 입력만 둔다', () => {
    seedPreview.rejected = true
    renderForm()
    expect(screen.queryByRole('button', { name: '100%' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('예수금 (USD)')).toBeEnabled()
  })

  it('등록: 예수금은 0에서 시작한다', () => {
    renderForm()
    expect(screen.getByLabelText('예수금 (USD)')).toHaveValue('0')
  })

  it('등록: 종목 버튼에 현재가를 보인다', () => {
    renderForm(undefined, undefined, { prices: { UPRO: 80, QLD: 91.5 } })
    expect(screen.getByRole('button', { name: /QLD/ })).toHaveTextContent('$91.50')
  })

  it('등록: 종목이 고정(customizable=false)이면 선택 없이 기본 종목을 보여 주고 payload도 기본 종목이다', async () => {
    const { rerender } = renderForm()
    // 폼이 마운트된 뒤 관리자 설정이 바뀌어도 고정값이 실린다
    fireEvent.click(screen.getByRole('button', { name: 'QLD' }))
    rerender(
      <QueryClientProvider client={queryClient}><MetaProvider meta={meta}>
        <DcaStrategyForm accountId="a1" availableTickers={['UPRO', 'QLD']} defaultTicker="UPRO" tickerCustomizable={false} prices={null} />
      </MetaProvider></QueryClientProvider>,
    )
    expect(screen.queryByRole('button', { name: 'QLD' })).not.toBeInTheDocument()
    expect(screen.getByText('UPRO')).toBeInTheDocument()
    await addBuyRule()
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(createMutate).toHaveBeenCalled())
    expect(createMutate.mock.calls[0][0]).toMatchObject({ ticker: 'UPRO' })
    expect(seedPreview.calls.at(-1)?.[1]).toMatchObject({ ticker: 'UPRO' })
  })

  it('등록: 막힌 제출은 첫 오류 칸으로 포커스를 옮긴다(보유 → 규칙)', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(screen.getByText('규칙을 추가하세요.')).toHaveFocus())
    fireEvent.change(screen.getByLabelText('수량'), { target: { value: '5' } })
    // 제출 전에도 바로 보인다(다른 유형과 같다)
    await waitFor(() => expect(screen.getByLabelText('평단가')).toHaveAttribute('aria-invalid', 'true'))
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(screen.getByLabelText('평단가')).toHaveFocus())
  })

  it.each([
    ['initialAvgPrice', () => screen.getByLabelText('평단가')],
    ['scheduledStartDate', () => screen.getByLabelText('시작예정일')],
    ['dca.rules[0].amount', () => screen.getByText('서버 사유')],
  ])('등록: 서버 거절 %s는 해당 칸에 한 번만 보이고 막힌 제출은 그 칸으로 간다', async (field, target) => {
    seedPreview.fieldErrors = [{ field, detail: '서버 사유' }]
    renderForm()
    await addBuyRule()
    expect(screen.getAllByText('서버 사유')).toHaveLength(1)
    expect(screen.getByText('서버 사유')).toHaveAttribute('role', 'alert')
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(target()).toHaveFocus())
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('등록 중에는 유형 선택·규칙 줄·추가 버튼을 잠근다', async () => {
    createPending.value = true
    renderForm(existing([rule('a', 100)]), <button type="button">유형 선택</button>)
    expect(screen.getByRole('button', { name: '유형 선택' })).toBeDisabled()
    expect(row(/\$100/)).toBeDisabled()
    expect(screen.getByRole('button', { name: '매수 규칙 추가' })).toBeDisabled()
  })

  it('수정: 종목 변경 UI가 없다', () => {
    renderForm(existing([rule('a', 100)]))
    expect(screen.queryByRole('button', { name: 'UPRO' })).not.toBeInTheDocument()
  })

  it('줄 2행에 조건과 부족 시 정책 라벨을 보여 준다', () => {
    renderForm(existing([rule('a', 100, { shortfall: 'REJECT', conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 30 }] })]))
    expect(row(/RSI\(14\) 30 이하 · 주문하지 않음/)).toBeInTheDocument()
  })
})

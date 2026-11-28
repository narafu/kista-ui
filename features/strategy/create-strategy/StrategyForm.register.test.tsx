import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MetaProvider, type MetaBundle, type StrategyTypeMeta } from '@entities/meta'
import { strategyTypeMeta, testMeta } from '@entities/meta/__fixtures__/testMeta'
import { StrategyForm } from './StrategyForm'

// 실제 useStrategyForm·섹션을 함께 렌더해 등록 화면의 경고 표시 시점과 가용 예수금을 본다
const createMutate = vi.fn()
const cash = vi.hoisted(() => ({ value: 1000.5 as number | null }))

vi.mock('@entities/account', async (orig) => ({
  ...(await orig<typeof import('@entities/account')>()),
  useAccountPricesQuery: () => ({ data: undefined, isError: false }),
}))

vi.mock('@entities/strategy', async (orig) => ({
  ...(await orig<typeof import('@entities/strategy')>()),
  useCreateStrategyMutation: () => ({ mutate: createMutate, isPending: false }),
  useUpdateStrategyMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useStrategyValidationQuery: (_target: unknown, body: { type: string } | null) => {
    const derived = { basePrice: 100, minSeed: body?.type === 'VR' ? null : 500, skipReason: null, availableCash: cash.value }
    const data = { fieldErrors: [], warnings: [], derived }
    return { data, current: data, isLoading: false, isError: false, refetch: vi.fn() }
  },
}))

const type = (code: string, fields: Partial<StrategyTypeMeta['fields']> = {}) => strategyTypeMeta({
  code, availableTickers: ['TQQQ'],
  fields: { ticker: { customizable: false, allowedValues: ['TQQQ'], defaultValue: 'TQQQ' }, ...fields },
})
const meta = {
  ...testMeta,
  tickers: [{ code: 'TQQQ' }] as MetaBundle['tickers'],
  strategyTypes: [
    type('INFINITE'),
    type('VR', {
      recurringMode: { customizable: true, allowedValues: ['HOLD'], defaultValue: 'HOLD' },
      bandWidth: { customizable: false, allowedValues: [15], defaultValue: 15 },
      intervalWeeks: { customizable: false, allowedValues: [2], defaultValue: 2 },
    }),
  ],
}

function renderForm(broker?: React.ComponentProps<typeof StrategyForm>['broker']) {
  return render(
    <QueryClientProvider client={new QueryClient()}><MetaProvider meta={meta}>
      <StrategyForm accountId="a1" broker={broker} />
    </MetaProvider></QueryClientProvider>,
  )
}

const seed = () => screen.getByLabelText('예수금 (USD)')
const submit = () => screen.getByRole('button', { name: '등록' })
const selectType = (code: string) => fireEvent.click(screen.getByRole('button', { name: code }))

describe('전략 등록 화면의 입력값 경고', () => {
  beforeEach(() => {
    createMutate.mockClear()
    cash.value = 1000.5
  })

  it('처음에는 경고가 없고, 제출하면 사유를 보이며 포커스를 옮기고, 유형을 바꾸면 다시 숨긴다', async () => {
    renderForm()
    expect(screen.queryByText(/이상이 필요합니다/)).not.toBeInTheDocument()
    expect(screen.queryByText('최소 투자금 미달')).not.toBeInTheDocument()
    expect(screen.getByText('최소 $500.00')).toBeInTheDocument()
    expect(submit()).toBeEnabled()

    fireEvent.click(submit())
    await waitFor(() => expect(screen.getByText('최소 투자금 $500.00 이상이 필요합니다.')).toHaveFocus())
    expect(screen.getByText('최소 투자금 미달')).toBeInTheDocument()
    expect(createMutate).not.toHaveBeenCalled()

    selectType('VR')
    expect(screen.queryByText(/0보다 커야 합니다/)).not.toBeInTheDocument()
    selectType('INFINITE')
    expect(screen.queryByText(/이상이 필요합니다/)).not.toBeInTheDocument()
    expect(screen.queryByText('최소 투자금 미달')).not.toBeInTheDocument()
  })

  it('미달 금액을 입력하면 바로 보인다', () => {
    renderForm()
    fireEvent.change(seed(), { target: { value: '100' } })
    expect(screen.getByText('최소 투자금 $500.00 이상이 필요합니다.')).toBeInTheDocument()
    expect(screen.getByText('최소 투자금 미달')).toBeInTheDocument()
  })

  it.each([
    [undefined, true],
    ['MOCK', false],
  ] as const)('VR 등록은 가용 예수금과 비율 버튼을, 모의계좌(%s)는 배지를 보인다', (broker, hasCash) => {
    cash.value = broker ? null : 1000.5
    renderForm(broker)
    selectType('VR')
    expect(screen.queryByText(/0보다 커야 합니다/)).not.toBeInTheDocument()
    if (!hasCash) {
      expect(screen.getByText('모의계좌')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '100%' })).not.toBeInTheDocument()
      return
    }
    expect(screen.getByText('가용 예수금 $1,000.50')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '25%' })).toBeInTheDocument()
    // 100%는 내림해 채운다
    fireEvent.click(screen.getByRole('button', { name: '100%' }))
    expect(seed()).toHaveValue('1000')
  })
})

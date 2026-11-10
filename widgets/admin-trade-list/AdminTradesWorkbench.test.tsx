import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  listAdminAccounts,
  listAdminStrategies,
  updateAdminStrategyStatus,
} from '@entities/admin/api'
import { adminKeys } from '@entities/admin'
import type { AdminAccount, AdminStrategy, AdminTrade } from '@entities/admin'
import { AdminTradesWorkbench } from './AdminTradesWorkbench'

vi.mock('@entities/meta', async () => {
  const { testLabelOf } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({ labelOf: testLabelOf, findTicker: () => undefined }) }
})

const toastError = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

// 훅(entities/admin/hooks/useAdminQueries.ts)이 '../api'(=이 경로)를 직접 import해서 호출한다 —
// '@entities/admin'(index.ts 배럴) 자체를 mock하면 훅 내부에서 쓰는 실제 api 함수는 그대로 남아
// 실제 네트워크 호출을 시도한다. 훅이 실제로 참조하는 모듈 경로를 mock해야 한다.
vi.mock('@entities/admin/api', async () => {
  const actual = await vi.importActual<typeof import('@entities/admin/api')>('@entities/admin/api')

  return {
    ...actual,
    listAdminAccounts: vi.fn(),
    listAdminStrategies: vi.fn(),
    updateAdminStrategyStatus: vi.fn(),
  }
})

const trades: AdminTrade[] = [
  {
    id: 'trade-1',
    userId: 'user-1',
    accountId: 'account-1',
    strategyId: 'strategy-1',
    ownerNickname: '홍길동',
    strategyType: 'INFINITE',
    tradeDate: '2026-07-01',
    ticker: 'TSLA',
    direction: 'BUY',
    orderType: 'MOC',
    quantity: 3,
    price: 312.45,
    status: 'PLACED',
    currency: null,
  },
  {
    id: 'trade-2',
    userId: 'user-2',
    accountId: 'account-2',
    strategyId: 'strategy-2',
    ownerNickname: '김영희',
    strategyType: 'SINGLE',
    tradeDate: '2026-06-30',
    ticker: 'NVDA',
    direction: 'SELL',
    orderType: 'LIMIT',
    quantity: 1,
    price: 144.3,
    status: 'FILLED',
    currency: null,
  },
]

const accounts: AdminAccount[] = [
  {
    id: 'account-1',
    userId: 'user-1',
    ownerNickname: '홍길동',
    nickname: '홍길동 계좌',
    accountNoMasked: '123-45****',
    broker: 'KIS',
    strategies: [],
  },
  {
    id: 'account-2',
    userId: 'user-2',
    ownerNickname: '김영희',
    nickname: '김영희 계좌',
    accountNoMasked: '987-65****',
    broker: 'KIS',
    strategies: [],
  },
]

const strategies: AdminStrategy[] = [
  {
    id: 'strategy-1',
    type: 'INFINITE',
    status: 'ACTIVE',
    ticker: 'TSLA',
    cycleSeedType: 'MANUAL',
  },
  {
    id: 'strategy-2',
    type: 'SINGLE',
    status: 'PAUSED',
    ticker: 'NVDA',
    cycleSeedType: 'AUTO',
  },
]

const listAdminAccountsMock = vi.mocked(listAdminAccounts)
const listAdminStrategiesMock = vi.mocked(listAdminStrategies)
const updateAdminStrategyStatusMock = vi.mocked(updateAdminStrategyStatus)

function createWrapper(seedTrades: AdminTrade[] = trades) {
  // 거래 내역은 서버가 prefetch한 캐시를 읽는다 — staleTime을 무한으로 두어 시드한 값을 네트워크 없이 쓴다
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  queryClient.setQueryData(adminKeys.trades({}), seedTrades)
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function renderWorkbench(props: Partial<React.ComponentProps<typeof AdminTradesWorkbench>> = {}, seedTrades?: AdminTrade[]) {
  return render(
    <AdminTradesWorkbench initialPage={1} initialSize={10} {...props} />,
    { wrapper: createWrapper(seedTrades) },
  )
}

async function pick(user: ReturnType<typeof userEvent.setup>, name: string, option: string) {
  await user.click(await screen.findByRole('combobox', { name }))
  await user.click(await screen.findByRole('option', { name: option }))
}

async function selectBrokeredAccount(user: ReturnType<typeof userEvent.setup>) {
  await pick(user, '사용자 선택', '홍길동')
  await pick(user, '증권사 선택', '한국투자증권')
  await pick(user, '계좌 선택', '홍길동 계좌 · 123-45****')
}


describe('AdminTradesWorkbench', () => {
  beforeEach(() => {
    listAdminAccountsMock.mockReset().mockResolvedValue(accounts)
    listAdminStrategiesMock.mockReset().mockResolvedValue(strategies.slice(0, 1))
    updateAdminStrategyStatusMock.mockReset().mockResolvedValue(undefined)
  })

  it('supports user-broker-account-strategy selection and resets lower steps', async () => {
    const user = userEvent.setup()
    listAdminAccountsMock.mockReset().mockImplementation(async () => accounts)

    renderWorkbench()

    const brokerSelect = screen.getByRole('combobox', { name: '증권사 선택' })
    const accountSelect = screen.getByRole('combobox', { name: '계좌 선택' })
    const strategySelect = screen.getByRole('combobox', { name: '전략 선택' })

    expect(screen.getByRole('heading', { name: '거래 내역 필터' })).toBeInTheDocument()
    expect(brokerSelect).toBeDisabled()
    expect(accountSelect).toBeDisabled()
    expect(strategySelect).toBeDisabled()

    await pick(user, '사용자 선택', '홍길동')

    await waitFor(() => expect(listAdminAccountsMock).toHaveBeenCalled())
    await waitFor(() => expect(brokerSelect).not.toBeDisabled())
    await pick(user, '증권사 선택', '한국투자증권')

    await waitFor(() => expect(accountSelect).not.toBeDisabled())

    await pick(user, '계좌 선택', '홍길동 계좌 · 123-45****')

    await waitFor(() => expect(listAdminStrategiesMock).toHaveBeenCalledWith('account-1'))
    await waitFor(() => expect(strategySelect).not.toBeDisabled())

    await pick(user, '전략 선택', 'INFINITE · TSLA')

    expect(screen.getByText('현재 전략 상태: 운영중')).toBeInTheDocument()

    // 사용자 재선택 시 하위 단계 초기화
    await pick(user, '사용자 선택', '김영희')

    await waitFor(() => expect(brokerSelect).toHaveTextContent('증권사 선택'))
    expect(accountSelect).toHaveTextContent('계좌 선택')
    expect(strategySelect).toHaveTextContent('전략 선택')
    expect(brokerSelect).not.toBeDisabled()
    expect(strategySelect).toBeDisabled()
    // Select를 다섯 번 열고 고르는 흐름이라 전체 스위트 부하에서 기본 5초를 넘긴다
  }, 15000)

  it('계좌를 찾지 못한 거래(userId null)는 사용자 선택지에 나오지 않는다', async () => {
    const user = userEvent.setup()
    renderWorkbench({}, [...trades, { ...trades[0], id: 'trade-orphan', userId: null, ownerNickname: '(알 수 없음)' }])

    await user.click(await screen.findByRole('combobox', { name: '사용자 선택' }))
    expect(await screen.findByRole('option', { name: '홍길동' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '(알 수 없음)' })).not.toBeInTheDocument()
  })

  it('크립토 계좌도 증권사 선택지에 나온다', async () => {
    const user = userEvent.setup()
    listAdminAccountsMock.mockReset().mockResolvedValue([
      ...accounts,
      { id: 'account-upbit', userId: 'user-1', ownerNickname: '홍길동', nickname: '업비트', accountNoMasked: '', broker: 'UPBIT', strategies: [] },
    ])

    renderWorkbench()

    await pick(user, '사용자 선택', '홍길동')
    await waitFor(() => expect(screen.getByRole('combobox', { name: '증권사 선택' })).not.toBeDisabled())
    await user.click(screen.getByRole('combobox', { name: '증권사 선택' }))
    expect(await screen.findByRole('option', { name: '한국투자증권' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '업비트' })).toBeInTheDocument()
  })

  it('계좌 선택지는 계좌명과 마스킹 번호로, 계좌번호가 없는 계좌는 계좌명만으로 보여 준다', async () => {
    const user = userEvent.setup()
    listAdminAccountsMock.mockReset().mockResolvedValue([
      ...accounts,
      { id: 'account-no-number', userId: 'user-1', ownerNickname: '홍길동', nickname: '메리츠 계좌', accountNoMasked: null, broker: 'KIS', strategies: [] },
    ])

    renderWorkbench()

    await pick(user, '사용자 선택', '홍길동')
    await pick(user, '증권사 선택', '한국투자증권')
    await user.click(await screen.findByRole('combobox', { name: '계좌 선택' }))
    expect(await screen.findByRole('option', { name: '홍길동 계좌 · 123-45****' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '메리츠 계좌' })).toBeInTheDocument()
  })

  it('toggles selected strategy status and refreshes the strategy list', async () => {
    const user = userEvent.setup()
    listAdminStrategiesMock.mockReset()
      .mockResolvedValueOnce(strategies.slice(0, 1))
      .mockResolvedValueOnce([{ ...strategies[0], status: 'PAUSED' }])

    renderWorkbench()

    await selectBrokeredAccount(user)
    await pick(user, '전략 선택', 'INFINITE · TSLA')

    await waitFor(() => expect(screen.getByText('현재 전략 상태: 운영중')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: '전략 일시중지' }))

    await waitFor(() => expect(updateAdminStrategyStatusMock).toHaveBeenCalledWith('account-1', 'strategy-1', 'PAUSED'))
    await waitFor(() => expect(listAdminStrategiesMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByText('현재 전략 상태: 일시중지')).toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: '전략 선택' })).toHaveTextContent('INFINITE · TSLA')
    expect(screen.getByRole('button', { name: '전략 재개' })).toBeInTheDocument()
  })

  it('reports a failed strategy status toggle via the hook toast only (no duplicate banner)', async () => {
    const user = userEvent.setup()
    updateAdminStrategyStatusMock.mockReset().mockRejectedValue(new Error('toggle failed'))

    renderWorkbench()

    await selectBrokeredAccount(user)
    await pick(user, '전략 선택', 'INFINITE · TSLA')
    await user.click(screen.getByRole('button', { name: '전략 일시중지' }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('전략 상태 변경에 실패했습니다.'))
    expect(screen.queryByLabelText('조회 오류')).not.toBeInTheDocument()
  })

  it('filters the table rows as the selection changes', async () => {
    const user = userEvent.setup()

    renderWorkbench()

    const table = screen.getByRole('table')

    expect(within(table).getByText('홍길동')).toBeInTheDocument()
    expect(within(table).getByText('김영희')).toBeInTheDocument()

    await pick(user, '사용자 선택', '홍길동')

    await waitFor(() => expect(within(table).queryByText('김영희')).not.toBeInTheDocument())
    expect(within(table).getAllByText('홍길동').length).toBeGreaterThan(0)

    await pick(user, '증권사 선택', '한국투자증권')
    await pick(user, '계좌 선택', '홍길동 계좌 · 123-45****')
    await pick(user, '전략 선택', 'INFINITE · TSLA')

    await waitFor(() => expect(within(table).queryByText('김영희')).not.toBeInTheDocument())
    expect(within(table).getByText('TSLA')).toBeInTheDocument()
    expect(within(table).queryByText('NVDA')).not.toBeInTheDocument()
  })

  it('renders the action error as an alert with status-error tokens', async () => {
    const user = userEvent.setup()
    listAdminAccountsMock.mockReset().mockRejectedValue(new Error('accounts failed'))

    renderWorkbench()

    await pick(user, '사용자 선택', '홍길동')

    const errorSection = await screen.findByLabelText('조회 오류')
    expect(errorSection).toHaveAttribute('role', 'alert')
    expect(errorSection).toHaveClass('text-status-error')
  })

  it('retries the accounts query when a different user is selected after a failed load', async () => {
    // accountsQuery는 userId 무관 공용 키를 쓴다 — 실패 후 다른 사용자를 골랐을 때 자동으로
    // 재조회되지 않으면(같은 키, enabled 유지) 오류 배너가 세션 내내 고정되는 회귀가 있었다.
    const user = userEvent.setup()
    // 첫 호출은 마운트 시 사용자 후보 조회(useAdminAllAccountsQuery), 둘째가 사용자 선택 시 재조회
    listAdminAccountsMock.mockReset().mockRejectedValueOnce(new Error('accounts failed')).mockRejectedValueOnce(new Error('accounts failed')).mockResolvedValue(accounts)

    renderWorkbench()

    await pick(user, '사용자 선택', '홍길동')
    await screen.findByLabelText('조회 오류')

    await pick(user, '사용자 선택', '김영희')

    await waitFor(() => expect(screen.queryByLabelText('조회 오류')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('combobox', { name: '증권사 선택' })).not.toBeDisabled())
  })
})

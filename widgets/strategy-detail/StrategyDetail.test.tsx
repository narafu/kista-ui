import { cloneElement } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import type { Strategy } from '@entities/strategy'
import { vrSummary } from '@entities/strategy/model/fixtures'
import type { NextOrderPreview } from '@entities/order'
import { StrategyDetail } from './StrategyDetail'

const mockPush = vi.fn()
const deleteMutate = vi.fn()
const pauseMutate = vi.fn()
const resumeMutate = vi.fn()
let deleteSuccessHandler: (() => void) | undefined
let archiveSuccessHandler: (() => void) | undefined
const archiveMutate = vi.fn()
let holidayQueryResult: { holidays: string[]; isError?: boolean; loading?: boolean } = { holidays: [] }
let sessionQueryResult: { session?: { tradeDateKst?: string | null; tradingDay?: boolean }; loading?: boolean; isError?: boolean } = {}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/button-variants', () => ({
  buttonVariants: () => '',
}))

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children, render, ...props }: React.ComponentProps<'button'> & { render?: React.ReactElement }) => (render ? cloneElement(render, props) : <button {...props}>{children}</button>),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
  AlertDialogAction: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
}))

vi.mock('@widgets/kpi-card', () => ({
  KpiCard: ({ label, value, sub }: { label: string; value?: React.ReactNode; sub?: React.ReactNode }) => (
    <div>
      {label}
      {value}
      {sub}
    </div>
  ),
}))

vi.mock('@widgets/cycle-history', () => ({
  StrategyTradesTab: () => <div>strategy-trades-tab</div>,
}))

vi.mock('@entities/strategy', async () => {
  const actual = await vi.importActual<typeof import('@entities/strategy')>('@entities/strategy')
  return {
    ...actual,
    seedBadgeClass: () => 'seed-badge',
  }
})

vi.mock('@features/strategy/manage-strategy', async (orig) => ({
  ...(await orig<typeof import('@features/strategy/manage-strategy')>()),
  useManageStrategyMutations: ({ onDeleted, onArchived }: { onDeleted?: () => void; onArchived?: () => void }) => {
    deleteSuccessHandler = onDeleted
    archiveSuccessHandler = onArchived
    return {
      pause: pauseMutate,
      resume: resumeMutate,
      remove: deleteMutate,
      archive: archiveMutate,
      isArchiving: false,
      isPausing: false,
      isResuming: false,
      isDeleting: false,
    }
  },
}))

const mockPreviewQuery = vi.fn(() => ({
  data: { todayOrders: [], position: null, orders: [], skipReason: 'NO_CYCLE_HISTORY', otherStrategiesPlannedBuyUsd: '0', ledgerCheck: null } as Partial<NextOrderPreview> | undefined,
  isLoading: false,
  isError: false,
  error: null as unknown,
}))

let cancelAllSuccessHandler: ((r: { cancelledCount: number; failedCount: number; credentialFailedCount: number }) => void) | undefined

vi.mock('@entities/order', async () => {
  const actual = await vi.importActual<typeof import('@entities/order')>('@entities/order')
  return {
    ...actual,
    useStrategyOrderPreviewQuery: () => mockPreviewQuery(),
    useCancelAllOrdersMutation: () => ({
      mutate: (_: undefined, opts?: { onSuccess?: (r: { cancelledCount: number; failedCount: number; credentialFailedCount: number }) => void }) => {
        cancelAllSuccessHandler = opts?.onSuccess
      },
      isPending: false,
    }),
    useCancelOneOrderMutation: () => ({ mutate: vi.fn(), isPending: false, variables: null }),
  }
})

vi.mock('@entities/market', () => ({
  useMonthlyHolidaysQuery: () => holidayQueryResult,
  useMarketSessionQuery: () => sessionQueryResult,
}))

vi.mock('@entities/meta', async () => {
  const { testLabelOf } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({
    labelOf: testLabelOf,
    findStrategyType: (code: string) => {
      if (code === 'INFINITE') return { divisionCounts: [20, 30, 40] }
      return { divisionCounts: [] }
    },
  }) }
})

vi.mock('./OrderRows', () => ({
  OrderRows: ({ orders }: { orders: Array<{ ticker: string; direction: string }> }) => (
    <div data-testid="order-rows">{orders.map((o) => `${o.direction}-${o.ticker}`).join(',')}</div>
  ),
}))

vi.mock('./StrategyOrderHistory', () => ({
  StrategyOrderHistory: () => <div>strategy-order-history</div>,
}))

const baseStrategy: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'TSLA',
  cycleSeedType: 'MAX',
  initialDeposit: 1200,
  divisionCount: 20,
  isReverseMode: false,
  cycleInProgress: true,
  allowedActions: [],
  blockedActions: [],
  currentRound: 0,
}

describe('StrategyDetail header card', () => {
  beforeEach(() => {
    holidayQueryResult = { holidays: [] }
    sessionQueryResult = {}
    pauseMutate.mockReset()
    resumeMutate.mockReset()
  })

  it('shows strategy type and next cycle in the header metadata cards', () => {
    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText('123-45')).not.toBeInTheDocument()
    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('전략타입')
    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('INFINITE')
    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('다음 사이클')
    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('MAX')
    expect(screen.getByTestId('strategy-summary-grid')).toHaveTextContent('분할')
    expect(screen.getByTestId('strategy-summary-grid')).toHaveTextContent('20분할')
    expect(screen.queryByText('ACTIVE')).not.toBeInTheDocument()
  })

  it('shows the "시작예정" badge when startDate is in the future', () => {
    const future = new Date()
    future.setDate(future.getDate() + 7)
    const futureDate = future.toISOString().slice(0, 10)

    render(<StrategyDetail accountId="account-1" strategy={{ ...baseStrategy, startDate: futureDate }} />)

    expect(screen.getByTestId('strategy-status-group')).toHaveTextContent('시작예정')
  })

  it('hides the "시작예정" badge when startDate is today or absent', () => {
    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByTestId('strategy-status-group')).not.toHaveTextContent('시작예정')
  })

  it('shows the localized paused badge and keeps reverse mode as a badge near status', () => {
    render(<StrategyDetail accountId="account-1" strategy={{ ...baseStrategy, status: 'PAUSED', isReverseMode: true }} />)

    expect(screen.getByTestId('strategy-status-group')).toHaveTextContent('일시중지')
    expect(screen.queryByText('PAUSED')).not.toBeInTheDocument()
    expect(screen.getByTestId('strategy-status-group')).toHaveTextContent('리버스모드')
    expect(screen.getByText('리버스모드')).toBeInTheDocument()
  })

  it('switches to the synchronized paused status and resume action from its query-owned parent', () => {
    const paused = { ...baseStrategy, status: 'PAUSED' }
    const { rerender } = render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    fireEvent.click(screen.getByRole('button', { name: '일시중지' }))
    expect(pauseMutate).toHaveBeenCalledWith(baseStrategy)
    rerender(<StrategyDetail accountId="account-1" strategy={paused} />)

    expect(screen.getByText('일시중지')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '재개' }))
    expect(resumeMutate).toHaveBeenCalledWith(paused)
  })

  describe('주문이 없는 사유 안내 위치', () => {
    const defaultPreviewImpl = mockPreviewQuery.getMockImplementation()!
    afterEach(() => mockPreviewQuery.mockImplementation(defaultPreviewImpl))

    it('일시중지 + 사이클 종료 사유는 다음 주문 카드에만 보이고 전략 정보에는 없다', () => {
      mockPreviewQuery.mockReturnValue({
        data: { todayOrders: [], position: null, orders: [], skipReason: 'CYCLE_ENDED', otherStrategiesPlannedBuyUsd: '0', ledgerCheck: null } as Partial<NextOrderPreview>,
        isLoading: false,
        isError: false,
        error: null,
      })
      render(<StrategyDetail accountId="account-1" strategy={{ ...baseStrategy, status: 'PAUSED' }} />)

      expect(screen.getAllByText(/사이클이 종료되었습니다/)).toHaveLength(1)
      expect(screen.getByText(/재개하면 새 사이클이 시작됩니다/)).toBeInTheDocument()
      expect(screen.queryByText(/일시중지 후 재개/)).not.toBeInTheDocument()
      expect(screen.queryByText(/이 계획대로 매매가 진행됩니다/)).not.toBeInTheDocument()
    })

    it('미리보기 오류 문구는 화면에 한 번만 나온다', () => {
      mockPreviewQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error('boom') })
      render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

      expect(screen.getAllByText('주문 미리보기를 불러오는 중 오류가 발생했습니다.')).toHaveLength(1)
    })
  })

  it('shows an alternate operating mode label when the strategy type has no division count', () => {
    render(<StrategyDetail accountId="account-1" strategy={{ ...baseStrategy, type: 'PRIVACY', divisionCount: undefined }} />)

    expect(screen.getByTestId('strategy-summary-grid')).toHaveTextContent('운용 방식')
    expect(screen.getByTestId('strategy-summary-grid')).toHaveTextContent('매매표')
    expect(screen.getByTestId('strategy-summary-grid')).not.toHaveTextContent('분할')
  })

  it('redirects to the strategies list after deleting a strategy', () => {
    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    deleteSuccessHandler?.()

    expect(mockPush).toHaveBeenCalledWith('/accounts/account-1')
  })

  it('redirects to the account page after archiving a strategy', () => {
    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    archiveSuccessHandler?.()

    expect(mockPush).toHaveBeenCalledWith('/accounts/account-1')
  })

  it('보유 수량이 없으면 기본 선택이 보관이고 확인 시 archive를 호출한다', () => {
    render(<StrategyDetail accountId="account-1" strategy={{ ...baseStrategy, currentHoldings: 0 }} />)

    expect(screen.getByRole('radio', { name: /^보관/ })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: '보관' })) // 모킹된 다이얼로그는 항상 열려 있다
    expect(archiveMutate).toHaveBeenCalled()
  })

  it('삭제를 고르고 확인하면 remove를 호출한다', () => {
    render(<StrategyDetail accountId="account-1" strategy={{ ...baseStrategy, currentHoldings: 0 }} />)

    fireEvent.click(screen.getByRole('radio', { name: /^삭제/ }))
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(deleteMutate).toHaveBeenCalled()
  })

  it('보유 수량이 있으면 보관 선택지를 막고 삭제가 선택된다', () => {
    render(<StrategyDetail accountId="account-1" strategy={{ ...baseStrategy, currentHoldings: 5 }} />)

    expect(screen.getByText('보유 수량이 남아 있으면 보관할 수 없습니다.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^보관/ })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('radio', { name: /^삭제/ })).toBeChecked()
  })

  it('shows recurring withdrawal mode in the operating-mode card without duplicating the strategy type', () => {
    render(<StrategyDetail
      accountId="account-1"
      strategy={{
        ...baseStrategy,
        type: 'VR',
        ticker: 'TQQQ',
        divisionCount: undefined,
        initialDeposit: 2000,
        vr: {
          value: 3000,
          bandWidth: 15,
          intervalWeeks: 4,
          recurringAmount: -100,
          currentPool: 2000,
          poolLimit: 500,
          poolLimitRate: 0.5,
          gradient: 20,
          initialGradient: 20,
          gGraceWeeks: 52,
          gStepWeeks: 26,
          gMax: 20,
          initialPoolLimitRate: 0.5,
          pGraceWeeks: 52,
          pStepWeeks: 26,
          poolLimitFloor: 0.3,
        },
      }}
    />)

    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('전략타입')
    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('VR')
    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('운용 방식')
    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('인출식($100.00)')
    expect(screen.getByTestId('strategy-meta-grid')).not.toHaveTextContent('다음 사이클')
    expect(screen.queryByTestId('strategy-summary-grid')).not.toBeInTheDocument()

    const vrGrid = screen.getByTestId('strategy-vr-grid')
    expect(vrGrid).toHaveTextContent('밴드 폭')
    expect(vrGrid).toHaveTextContent('15%')
    expect(vrGrid).toHaveTextContent('주기')
    expect(vrGrid).toHaveTextContent('4주')
    expect(vrGrid).toHaveTextContent('시작일')
    expect(vrGrid).toHaveTextContent('다음 사이클 시작')
    expect(vrGrid).toHaveTextContent('미설정')
    expect(vrGrid).toHaveTextContent('G')
    expect(vrGrid).toHaveTextContent('V')
    expect(vrGrid).toHaveTextContent('$3,000.00')
    expect(vrGrid).not.toHaveTextContent('V값')
    expect(vrGrid).toHaveTextContent('pool')
    expect(vrGrid).toHaveTextContent('$2,000.00')
    expect(vrGrid).toHaveTextContent('pool 상한')
    expect(vrGrid).toHaveTextContent('$500.00')
    expect(vrGrid).toHaveTextContent('50%')
    expect(screen.queryByText('매매표')).not.toBeInTheDocument()
  })

  it('shows the VR start date and next rollover date when startDate is set', () => {
    render(<StrategyDetail
      accountId="account-1"
      strategy={{
        ...baseStrategy,
        type: 'VR',
        ticker: 'TQQQ',
        divisionCount: undefined,
        initialDeposit: 2000,
        startDate: '2026-08-01',
        vr: {
          value: 3000,
          bandWidth: 15,
          intervalWeeks: 4,
          nextRolloverDate: '2026-08-29',
          recurringAmount: -100,
          poolLimit: 500,
          poolLimitRate: 0.5,
          gradient: 20,
          initialGradient: 20,
          gGraceWeeks: 52,
          gStepWeeks: 26,
          gMax: 20,
          initialPoolLimitRate: 0.5,
          pGraceWeeks: 52,
          pStepWeeks: 26,
          poolLimitFloor: 0.3,
        },
      }}
    />)

    const vrGrid = screen.getByTestId('strategy-vr-grid')
    expect(vrGrid).toHaveTextContent('시작일')
    expect(vrGrid).toHaveTextContent('2026. 8. 1.')
    expect(vrGrid).toHaveTextContent('다음 사이클 시작')
    expect(vrGrid).toHaveTextContent('2026. 8. 29.')
  })

  it('shows a dash for the next rollover when the server gives none but startDate is set', () => {
    render(<StrategyDetail
      accountId="account-1"
      strategy={{ ...baseStrategy, type: 'VR', ticker: 'TQQQ', divisionCount: undefined, initialDeposit: 2000, startDate: '2026-08-01', vr: vrSummary() }}
    />)

    expect(screen.getByTestId('strategy-vr-grid')).toHaveTextContent(/다음 사이클 시작-/)
  })

  it('shows the saving mode amount when recurringAmount is positive', () => {
    render(<StrategyDetail
      accountId="account-1"
      strategy={{
        ...baseStrategy,
        type: 'VR',
        ticker: 'TQQQ',
        divisionCount: undefined,
        initialDeposit: 2000,
        vr: {
          value: 3000,
          bandWidth: 15,
          intervalWeeks: 4,
          recurringAmount: 200,
          poolLimit: 1500,
          poolLimitRate: 0.75,
          gradient: 10,
          initialGradient: 10,
          gGraceWeeks: 52,
          gStepWeeks: 26,
          gMax: 20,
          initialPoolLimitRate: 0.5,
          pGraceWeeks: 52,
          pStepWeeks: 26,
          poolLimitFloor: 0.3,
        },
      }}
    />)

    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('적립식($200.00)')
  })

  it('shows the hold mode label when recurringAmount is zero', () => {
    render(<StrategyDetail
      accountId="account-1"
      strategy={{
        ...baseStrategy,
        type: 'VR',
        ticker: 'TQQQ',
        divisionCount: undefined,
        initialDeposit: 2000,
        vr: {
          value: 3000,
          bandWidth: 15,
          intervalWeeks: 4,
          recurringAmount: 0,
          poolLimit: 1000,
          poolLimitRate: 0.5,
          gradient: 10,
          initialGradient: 10,
          gGraceWeeks: 52,
          gStepWeeks: 26,
          gMax: 20,
          initialPoolLimitRate: 0.5,
          pGraceWeeks: 52,
          pStepWeeks: 26,
          poolLimitFloor: 0.3,
        },
      }}
    />)

    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('거치식')
  })
})

describe('StrategyDetail server trading day (KST 토요일 새벽 = 미국 금요일 장 중)', () => {
  const previewWithOrder = {
    data: {
      todayOrders: [],
      position: null,
      orders: [{ ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '20.00' }],
      skipReason: null,
      otherStrategiesPlannedBuyUsd: '0',
      ledgerCheck: null,
      warnings: [],
    },
    isLoading: false,
    isError: false,
    error: null,
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-07T00:50:00+09:00')) // KST 토요일
    vi.mocked(toast.info).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    sessionQueryResult = {}
  })

  it('KST 주말이어도 서버가 거래일이라 하면 휴장 배너를 띄우지 않는다', () => {
    sessionQueryResult = { session: { tradeDateKst: '2026-11-07', tradingDay: true } }
    mockPreviewQuery.mockReturnValueOnce(previewWithOrder)

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText('오늘은 휴장일입니다')).not.toBeInTheDocument()
  })

  it('서버가 거래일이 아니라고 하면 휴장 배너를 띄운다', () => {
    sessionQueryResult = { session: { tradeDateKst: '2026-11-07', tradingDay: false } }
    mockPreviewQuery.mockReturnValueOnce(previewWithOrder)

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('오늘은 휴장일입니다')).toBeInTheDocument()
  })

  it('서버 거래일이 null이면 KST 날짜 판정으로 폴백한다', () => {
    sessionQueryResult = { session: { tradeDateKst: null, tradingDay: false } }
    mockPreviewQuery.mockReturnValueOnce(previewWithOrder)

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('오늘은 휴장일입니다')).toBeInTheDocument()
  })
})

describe('StrategyDetail market-holiday failure', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T10:00:00+09:00'))
    holidayQueryResult = { holidays: [], isError: true }
    vi.mocked(toast.info).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    holidayQueryResult = { holidays: [] }
  })

  it('does not classify an unknown weekday market status as a confirmed trading day', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [],
        position: null,
        orders: [{ ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '20.00' }],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        ledgerCheck: null,
        warnings: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('미국 증시 휴장 여부를 확인하지 못했습니다')).toBeInTheDocument()
  })

  it('shows the loading reason while weekday holiday status is still loading', () => {
    holidayQueryResult = { holidays: [], loading: true }
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [],
        position: null,
        orders: [{ ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '20.00' }],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        ledgerCheck: null,
        warnings: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('미국 증시 휴장 여부를 확인하는 중입니다')).toBeInTheDocument()
  })

  it('keeps the loading reason when a refetch retains today as a cached holiday', () => {
    holidayQueryResult = { holidays: ['2026-07-21'], loading: true }
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [],
        position: null,
        orders: [{ ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '20.00' }],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        ledgerCheck: null,
        warnings: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('미국 증시 휴장 여부를 확인하는 중입니다')).toBeInTheDocument()
  })
})

describe('StrategyDetail unplaced order banner', () => {
  it('lists an AT_CLOSE buy as pending (not unplaced) while only the AT_OPEN sell is pre-placed', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'TSLA', direction: 'SELL', orderType: 'LIMIT', timing: 'AT_OPEN', quantity: 1, price: '25.00', status: 'PLACED' },
        ],
        position: null,
        orders: [
          { ticker: 'TSLA', orderType: 'LOC', timing: 'AT_CLOSE', direction: 'BUY', quantity: 5, price: '20.00' },
          { ticker: 'TSLA', orderType: 'LIMIT', timing: 'AT_OPEN', direction: 'SELL', quantity: 1, price: '25.00' },
        ],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        ledgerCheck: null,
        warnings: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText(/미접수/)).not.toBeInTheDocument()
    expect(screen.getByText('장마감 30분 전 접수 예정')).toBeInTheDocument()
    const orderTables = screen.getAllByTestId('order-rows')
    expect(orderTables).toHaveLength(2)
    expect(orderTables[0]).toHaveTextContent('SELL-TSLA')
    expect(orderTables[1]).toHaveTextContent('BUY-TSLA')
  })

  it('shows a buy-unplaced banner when today plan has BUY but no BUY was placed', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'TSLA', direction: 'SELL', orderType: 'LIMIT', quantity: 1, price: '25.00', status: 'PLACED' },
        ],
        position: null,
        orders: [
          { ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 5, price: '20.00' },
          { ticker: 'TSLA', orderType: 'LIMIT', direction: 'SELL', quantity: 1, price: '25.00' },
        ],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        ledgerCheck: { remainingLedger: 100, requiredBuyUsd: 200, sufficient: false, trimmed: false },
        warnings: [
          { code: 'LEDGER_SHORTFALL', detail: '전략 원장 예수금이 부족해 매수가 접수되지 않습니다(원장 $100.00 / 필요 $200.00).' },
          { code: 'BUY_UNPLACED', detail: '접수 시점이 지난 매수 주문이 오늘 접수되지 않았습니다.' },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('전략 원장 예수금 부족으로 매수 미접수')).toBeInTheDocument()
    // 배너는 서버 문장 그대로
    expect(screen.getByText('전략 원장 예수금이 부족해 매수가 접수되지 않습니다(원장 $100.00 / 필요 $200.00).')).toBeInTheDocument()
    // 접수된 SELL 테이블 아래에 아직 마감 대기 중인 BUY 계획 주문 테이블도 별도로 렌더한다 —
    // 접수 테이블엔 SELL만, 미접수 테이블엔 BUY만 들어가는지 실제 필터 결과로 검증
    const orderTables = screen.getAllByTestId('order-rows')
    expect(orderTables).toHaveLength(2)
    expect(orderTables[0]).toHaveTextContent('SELL-TSLA')
    expect(orderTables[1]).toHaveTextContent('BUY-TSLA')
  })

  it('does not show a banner when every planned direction was placed', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'TSLA', direction: 'BUY', orderType: 'LOC', quantity: 5, price: '20.00', status: 'PLACED' },
          { id: 'o2', ticker: 'TSLA', direction: 'SELL', orderType: 'LIMIT', quantity: 1, price: '25.00', status: 'PLACED' },
        ],
        position: null,
        orders: [
          { ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 5, price: '20.00' },
          { ticker: 'TSLA', orderType: 'LIMIT', direction: 'SELL', quantity: 1, price: '25.00' },
        ],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        ledgerCheck: null,
        warnings: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText(/미접수/)).not.toBeInTheDocument()
  })

  it('does not show a banner in preview mode even if the plan has a BUY order', () => {
    // 오늘 아무것도 접수되지 않은 상태(preview) — "아직 시도 안 함"과 "전량 거절"을 구분 못하므로 숨긴다
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [],
        position: null,
        orders: [{ ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 5, price: '20.00' }],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        ledgerCheck: null,
        warnings: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText(/미접수/)).not.toBeInTheDocument()
  })
})

describe('StrategyDetail cancel-all toast', () => {
  it('전체 취소 성공 시 로컬 상태 없이도 성공 토스트를 보여준다', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'TSLA', direction: 'BUY', orderType: 'LOC', quantity: 5, price: '20.00', status: 'PLANNED' },
        ],
        position: null,
        orders: [],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        ledgerCheck: null,
        warnings: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)
    fireEvent.click(screen.getByText('전체 취소'))
    cancelAllSuccessHandler?.({ cancelledCount: 1, failedCount: 0, credentialFailedCount: 0 })

    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('1건을 모두 취소했습니다')
  })

  it('증권사 키 만료로 취소 실패하면 키 재등록을 안내한다', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'TSLA', direction: 'BUY', orderType: 'LOC', quantity: 5, price: '20.00', status: 'PLACED' },
        ],
        position: null,
        orders: [],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        ledgerCheck: null,
        warnings: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)
    fireEvent.click(screen.getByText('전체 취소'))
    cancelAllSuccessHandler?.({ cancelledCount: 0, failedCount: 1, credentialFailedCount: 1 })

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(expect.stringContaining('계좌 키를 다시 등록하세요'))
  })

  it.each([[undefined, '증권사에서 직접 확인하세요'], ['TOSS', '토스증권에서 직접 확인하세요']])('broker=%s로 일반 취소 실패하면 "%s"로 안내한다', (broker, text) => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'TSLA', direction: 'BUY', orderType: 'LOC', quantity: 5, price: '20.00', status: 'PLACED' },
        ],
        position: null,
        orders: [],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        ledgerCheck: null,
        warnings: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" broker={broker} strategy={baseStrategy} />)
    fireEvent.click(screen.getByText('전체 취소'))
    cancelAllSuccessHandler?.({ cancelledCount: 0, failedCount: 1, credentialFailedCount: 0 })

    expect(vi.mocked(toast.warning)).toHaveBeenCalledWith(expect.stringContaining(text))
  })
})

describe('StrategyDetail ledger check', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T10:00:00+09:00')) // 화요일 — 휴장일 배지에 가려지지 않도록 평일 고정
    vi.mocked(toast.info).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const BUY = { ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 5, price: '20.00' }
  const SELL = { ticker: 'TSLA', orderType: 'LIMIT', direction: 'SELL', quantity: 1, price: '25.00' }
  const PLACED_SELL = { id: 'o1', ticker: 'TSLA', direction: 'SELL', orderType: 'LIMIT', quantity: 1, price: '25.00', status: 'PLACED' }
  const SHORT = { remainingLedger: 50, requiredBuyUsd: 100, sufficient: false, trimmed: false }
  // 서버가 SHORT 점검값에서 만든 경고 — 문장은 서버 그대로
  const LEDGER_WARNING = { code: 'LEDGER_SHORTFALL', detail: '전략 원장 예수금이 부족해 매수가 접수되지 않습니다(원장 $50.00 / 필요 $100.00).' }
  const BUY_UNPLACED_WARNING = { code: 'BUY_UNPLACED', detail: '접수 시점이 지난 매수 주문이 오늘 접수되지 않았습니다.' }

  function mockPreview(overrides: Record<string, unknown>) {
    mockPreviewQuery.mockReturnValueOnce({
      data: { todayOrders: [], position: null, orders: [BUY], skipReason: null, otherStrategiesPlannedBuyUsd: '0', ledgerCheck: null, warnings: [], ...overrides },
      isLoading: false,
      isError: false,
      error: null,
    })
  }

  it('preview 모드에서 원장 부족 배너에 남은 원장과 필요 금액을 보여준다', () => {
    mockPreview({ ledgerCheck: SHORT, warnings: [LEDGER_WARNING] })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText(LEDGER_WARNING.detail)).toBeInTheDocument()
  })

  it('warnings가 없는 구버전 응답이면 부족 배너 없이 그려진다', () => {
    mockPreview({ ledgerCheck: SHORT, warnings: undefined })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText(/전략 원장 예수금/)).not.toBeInTheDocument()
  })

  it('원장이 충분하면 배너와 안내 문구를 보이지 않는다', () => {
    mockPreview({ ledgerCheck: { remainingLedger: 500, requiredBuyUsd: 100, sufficient: true, trimmed: false } })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText(/전략 원장 예수금 부족/)).not.toBeInTheDocument()
    expect(screen.queryByText('전략 원장에 맞춰 매수 주문을 줄여 접수합니다.')).not.toBeInTheDocument()
  })

  it('trimmed이면 부족 배너 없이 정보성 안내 한 줄만 보여준다', () => {
    mockPreview({ ledgerCheck: { remainingLedger: 80, requiredBuyUsd: 100, sufficient: true, trimmed: true } })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('전략 원장에 맞춰 매수 주문을 줄여 접수합니다.')).toBeInTheDocument()
    expect(screen.queryByText(/전략 원장 예수금 부족/)).not.toBeInTheDocument()
  })

  it('executed 모드에서 BUY가 원장 부족으로 미접수면 약속 문구 없이 배너와 사유를 보여준다', () => {
    mockPreview({ todayOrders: [PLACED_SELL], orders: [BUY, SELL], ledgerCheck: SHORT, warnings: [LEDGER_WARNING, BUY_UNPLACED_WARNING] })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText(LEDGER_WARNING.detail)).toBeInTheDocument()
    expect(screen.getByText('전략 원장 예수금 부족으로 매수 미접수')).toBeInTheDocument()
    expect(screen.queryByText(/장 마감 시 매수 예정/)).not.toBeInTheDocument()
    // 접수된 SELL 테이블 아래에 미접수 BUY 계획 주문 테이블이 따로 렌더된다
    const orderTables = screen.getAllByTestId('order-rows')
    expect(orderTables).toHaveLength(2)
    expect(orderTables[0]).toHaveTextContent('SELL-TSLA')
    expect(orderTables[1]).toHaveTextContent('BUY-TSLA')
  })

  it('executed 모드에서 원장이 충분한 미접수 BUY는 장 마감 시 매수 예정으로 안내한다', () => {
    mockPreview({ todayOrders: [PLACED_SELL], orders: [BUY, SELL], ledgerCheck: { remainingLedger: 500, requiredBuyUsd: 100, sufficient: true, trimmed: false }, warnings: [BUY_UNPLACED_WARNING] })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('장 마감 시 매수 예정')).toBeInTheDocument()
    expect(screen.queryByText(/전략 원장 예수금 부족/)).not.toBeInTheDocument()
  })

  it('executed 모드에서 미접수 SELL은 장 마감 시 매도 재시도 예정으로 안내한다', () => {
    mockPreview({ todayOrders: [{ ...PLACED_SELL, direction: 'BUY' }], orders: [BUY, SELL], warnings: [{ code: 'SELL_UNPLACED', detail: '접수 시점이 지난 매도 주문이 오늘 접수되지 않았습니다.' }] })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('장 마감 시 매도 재시도 예정')).toBeInTheDocument()
  })

  describe('휴장 표시', () => {
    const SUBTITLE = '12/1(화) 거래일 예상 주문'
    const DEFAULT_SUBTITLE = '매 거래일 개장 시 자동실행'
    const BANNER = '오늘은 휴장일입니다'

    beforeEach(() => {
      sessionQueryResult = { session: { tradeDateKst: '2026-07-21', tradingDay: false } }
    })
    afterEach(() => {
      sessionQueryResult = {}
    })

    function renderClosed(overrides: Record<string, unknown>, status = 'ACTIVE') {
      mockPreview({ tradeDate: '2026-12-01', marketClosedToday: true, ...overrides })
      render(<StrategyDetail accountId="account-1" strategy={{ ...baseStrategy, status }} />)
    }

    it('휴장이면 배지·거래일 부제·점선 예상 주문을 보이고 휴장 배너는 겹치지 않는다', () => {
      renderClosed({ warnings: [LEDGER_WARNING], position: { currentRound: 3, unitAmount: '100', referencePrice: '24.1', targetPrice: '26' } })

      expect(screen.getByText('휴장')).toBeInTheDocument()
      expect(screen.getByText(SUBTITLE)).toBeInTheDocument()
      expect(screen.getByTestId('estimated-orders')).toHaveClass('border-dashed')
      expect(screen.getByTestId('estimated-orders')).toHaveTextContent('BUY-TSLA')
      expect(screen.getByText(LEDGER_WARNING.detail)).toBeInTheDocument()
      expect(screen.queryByText(BANNER)).not.toBeInTheDocument()
      expect(screen.getByText(/3\.0회차/)).toBeInTheDocument()
    })

    it('거래일(false)이면 클라 판정이 휴장이어도 지금 모습 그대로다', () => {
      renderClosed({ marketClosedToday: false })

      expect(screen.queryByText('휴장')).not.toBeInTheDocument()
      expect(screen.queryByText(BANNER)).not.toBeInTheDocument()
      expect(screen.getByText(DEFAULT_SUBTITLE)).toBeInTheDocument()
      expect(screen.queryByTestId('estimated-orders')).not.toBeInTheDocument()
    })

    it('필드가 없는 구서버 응답이면 기존 휴장 배너만 보인다', () => {
      renderClosed({ marketClosedToday: undefined })

      expect(screen.getByText(BANNER)).toBeInTheDocument()
      expect(screen.queryByText('휴장')).not.toBeInTheDocument()
      expect(screen.getByText(DEFAULT_SUBTITLE)).toBeInTheDocument()
      expect(screen.queryByTestId('estimated-orders')).not.toBeInTheDocument()
    })

    it('NO_PRIVACY_BASE면 매매표 발행 안내를 보인다', () => {
      renderClosed({ orders: [], skipReason: 'NO_PRIVACY_BASE' })

      expect(screen.getByText(/거래일 P 매매표가 아직 없습니다/)).toHaveTextContent('거래일 전날 발행되면 예상 주문이 보입니다.')
      expect(screen.getByText('휴장')).toBeInTheDocument()
    })

    it('주문이 없고 사유도 없으면 기존 빈 상태 문구다', () => {
      renderClosed({ orders: [] })

      expect(screen.getByText('예정된 주문이 없습니다.')).toBeInTheDocument()
      expect(screen.queryByTestId('estimated-orders')).not.toBeInTheDocument()
    })

    it('개장일을 못 찾은 MARKET_CLOSED는 기존 문구이고 예상 주문 부제를 쓰지 않는다', () => {
      renderClosed({ orders: [], skipReason: 'MARKET_CLOSED' })

      expect(screen.getByText(/다음 거래일이 미국 증시 휴장일입니다/)).toBeInTheDocument()
      expect(screen.getByText(DEFAULT_SUBTITLE)).toBeInTheDocument()
      expect(screen.queryByText(SUBTITLE)).not.toBeInTheDocument()
    })

    it('일시중지 + PRIVACY_BASE_BLOCKED는 "오늘은"이라 하지 않는다', () => {
      renderClosed({ orders: [], skipReason: 'PRIVACY_BASE_BLOCKED' }, 'PAUSED')

      expect(screen.getByText('P 매매표 점검 이슈로 해당 거래일은 주문하지 않습니다.')).toBeInTheDocument()
    })

    it('사이클 종료는 거래일 예상 주문 부제를 쓰지 않는다', () => {
      renderClosed({ orders: [], skipReason: 'CYCLE_ENDED' })

      expect(screen.getByText(DEFAULT_SUBTITLE)).toBeInTheDocument()
      expect(screen.queryByText(SUBTITLE)).not.toBeInTheDocument()
    })

    it('일시중지면 주문을 숨기고 일시중지 부제를 쓴다', () => {
      renderClosed({}, 'PAUSED')

      expect(screen.getByText('휴장')).toBeInTheDocument()
      expect(screen.getByText('일시중지 중, 자동실행 되지 않음')).toBeInTheDocument()
      expect(screen.queryByText(SUBTITLE)).not.toBeInTheDocument()
      expect(screen.queryByTestId('order-rows')).not.toBeInTheDocument()
    })
  })
})

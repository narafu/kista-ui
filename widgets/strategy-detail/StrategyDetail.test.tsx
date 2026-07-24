import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPreview } from '@entities/order'
import { StrategyDetail } from './StrategyDetail'

const mockPush = vi.fn()
const deleteMutate = vi.fn()
const executeMutate = vi.fn()
let deleteSuccessHandler: (() => void) | undefined

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: React.ComponentProps<'div'>) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: React.ComponentProps<'div'>) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: React.ComponentProps<'div'>) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: React.ComponentProps<'div'>) => <div className={className}>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/button-variants', () => ({
  buttonVariants: () => '',
}))

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
  AlertDialogAction: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
}))

vi.mock('@widgets/kpi-card', () => ({
  KpiCard: ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <div>
      {label}
      {value}
    </div>
  ),
}))

vi.mock('@widgets/cycle-history', () => ({
  StrategyTradesTab: () => <div>strategy-trades-tab</div>,
}))

vi.mock('@entities/strategy', () => ({
  useDeleteStrategyMutation: (onSuccess?: () => void) => {
    deleteSuccessHandler = onSuccess
    return { mutate: deleteMutate, isPending: false }
  },
  useExecuteStrategyMutation: () => ({ mutate: executeMutate, isPending: false }),
  usePauseStrategyMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useResumeStrategyMutation: () => ({ mutate: vi.fn(), isPending: false }),
  seedBadgeClass: () => 'seed-badge',
  strategyStatusAccent: (status: string) => status === 'ACTIVE' ? 'var(--status-ok)' : 'var(--warn)',
}))

const mockPreviewQuery = vi.fn(() => ({
  data: { todayOrders: [], position: null, orders: [], skipReason: 'NO_CYCLE_HISTORY', otherStrategiesPlannedBuyUsd: '0', competition: null } as Partial<NextOrderPreview>,
  isLoading: false,
  isError: false,
  error: null as unknown,
}))

let cancelAllSuccessHandler: ((r: { cancelledCount: number; failedCount: number }) => void) | undefined

vi.mock('@entities/order', async () => {
  const actual = await vi.importActual<typeof import('@entities/order')>('@entities/order')
  return {
    ...actual,
    useStrategyOrderPreviewQuery: () => mockPreviewQuery(),
    useCancelAllOrdersMutation: () => ({
      mutate: (_: undefined, opts?: { onSuccess?: (r: { cancelledCount: number; failedCount: number }) => void }) => {
        cancelAllSuccessHandler = opts?.onSuccess
      },
      isPending: false,
    }),
    useCancelOneOrderMutation: () => ({ mutate: vi.fn(), isPending: false, variables: null }),
  }
})

vi.mock('@entities/market', () => ({
  useMonthlyHolidaysQuery: () => ({ holidays: [] }),
}))

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    labelOf: (_group: string, value: string) => value,
    findStrategyType: (code: string) => {
      if (code === 'INFINITE') return { divisionCounts: [20, 30, 40] }
      return { divisionCounts: [] }
    },
  }),
}))

vi.mock('./OrderRows', () => ({
  OrderRows: () => <div>order-rows</div>,
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
  initialUsdDeposit: 1200,
  divisionCount: 20,
  isReverseMode: false,
  currentRound: 0,
}

describe('StrategyDetail header card', () => {
  it('shows strategy type and next cycle in the header metadata cards', () => {
    const { container } = render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    const accent = container.querySelector('[data-testid="strategy-status-accent"]')

    expect(accent).toBeInTheDocument()
    expect(accent).toHaveStyle({ background: 'var(--status-ok)' })
    expect(screen.queryByText('123-45')).not.toBeInTheDocument()
    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('전략타입')
    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('INFINITE')
    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('다음 사이클')
    expect(screen.getByTestId('strategy-meta-grid')).toHaveTextContent('MAX')
    expect(screen.getByTestId('strategy-summary-grid')).toHaveTextContent('분할')
    expect(screen.getByTestId('strategy-summary-grid')).toHaveTextContent('20분할')
    expect(screen.queryByText('ACTIVE')).not.toBeInTheDocument()
  })

  it('shows paused styling and keeps reverse mode as a badge near status', () => {
    const { container } = render(<StrategyDetail accountId="account-1" strategy={{ ...baseStrategy, status: 'PAUSED', isReverseMode: true }} />)

    const accent = container.querySelector('[data-testid="strategy-status-accent"]')

    expect(accent).toHaveStyle({ background: 'var(--warn)' })
    expect(screen.getByText('PAUSED')).toBeInTheDocument()
    expect(screen.getByTestId('strategy-status-group')).toHaveTextContent('리버스모드')
    expect(screen.getByText('리버스모드')).toBeInTheDocument()
  })

  it('shows an alternate operating mode label when the strategy type has no division count', () => {
    render(<StrategyDetail accountId="account-1" strategy={{ ...baseStrategy, type: 'PRIVACY', divisionCount: 0 }} />)

    expect(screen.getByTestId('strategy-summary-grid')).toHaveTextContent('운용 방식')
    expect(screen.getByTestId('strategy-summary-grid')).toHaveTextContent('매매표')
    expect(screen.getByTestId('strategy-summary-grid')).not.toHaveTextContent('분할')
  })

  it('redirects to the strategies list after deleting a strategy', () => {
    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    deleteSuccessHandler?.()

    expect(mockPush).toHaveBeenCalledWith('/accounts/account-1')
  })

  it('shows VR summary instead of privacy operating mode copy', () => {
    render(<StrategyDetail
      accountId="account-1"
      strategy={{
        ...baseStrategy,
        type: 'VR',
        ticker: 'TQQQ',
        divisionCount: undefined,
        initialUsdDeposit: 2000,
        vr: {
          value: 3000,
          bandWidth: 15,
          intervalWeeks: 4,
          recurringAmount: -100,
          poolLimit: 500,
          gradient: 20,
        },
      }}
    />)

    expect(screen.getByTestId('strategy-summary-grid')).toHaveTextContent('VR')
    expect(screen.getByTestId('strategy-meta-grid')).not.toHaveTextContent('다음 사이클')
    expect(screen.getByTestId('strategy-vr-grid')).toHaveTextContent('V값')
    expect(screen.getByTestId('strategy-vr-grid')).toHaveTextContent('$3,000.00')
    expect(screen.getByTestId('strategy-vr-grid')).toHaveTextContent('밴드 폭')
    expect(screen.getByTestId('strategy-vr-grid')).toHaveTextContent('15%')
    expect(screen.queryByText('매매표')).not.toBeInTheDocument()
  })
})

describe('StrategyDetail unplaced order banner', () => {
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
        // BUY가 계획에 있으면 실제 API는 competition을 절대 null로 보내지 않는다(TradingPreviewService:
        // buyOrders.isEmpty() ? null : simulate(...)) — 부족 상태를 명시한 현실적인 fixture로 교체
        competition: {
          sufficientBudget: false,
          availableDeposit: '1000',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '900',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('예수금 부족으로 매수 미접수')).toBeInTheDocument()
  })

  it('shows the sell quantity deficit when today plan has SELL but no SELL was placed', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'SOXL', direction: 'BUY', orderType: 'LIMIT', quantity: 21, price: '154.00', status: 'PLANNED' },
        ],
        position: null,
        orders: [
          { ticker: 'SOXL', orderType: 'LIMIT', direction: 'BUY', quantity: 21, price: '154.00' },
          { ticker: 'SOXL', orderType: 'LIMIT', direction: 'SELL', quantity: 9, price: '160.00' },
        ],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: true,
          availableDeposit: '5000',
          requiredForThisStrategy: '3234',
          consumedByHigherPriority: '0',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
        sellSufficiency: {
          sufficientQuantity: false,
          sellableQuantity: 6,
          reservedQuantity: 0,
          requiredQuantity: 9,
          liveQuantityUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('판매가능수량 3주 부족으로 매도 미접수')).toBeInTheDocument()
  })

  it('falls back to the generic sell-unplaced message when sell sufficiency data is unavailable', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'SOXL', direction: 'BUY', orderType: 'LIMIT', quantity: 21, price: '154.00', status: 'PLANNED' },
        ],
        position: null,
        orders: [
          { ticker: 'SOXL', orderType: 'LIMIT', direction: 'BUY', quantity: 21, price: '154.00' },
          { ticker: 'SOXL', orderType: 'LIMIT', direction: 'SELL', quantity: 9, price: '160.00' },
        ],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: true,
          availableDeposit: '5000',
          requiredForThisStrategy: '3234',
          consumedByHigherPriority: '0',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
        sellSufficiency: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('판매가능수량 충족됨 — 마감 시 매도 재시도 예정')).toBeInTheDocument()
  })

  it('does not claim a deficit when the sell was unplaced but a live recheck now shows sufficient quantity', () => {
    // preview는 매 호출마다 재계산되는 근사치라, 야간 배치가 거절한 시점 이후 보유/판매가능수량이
    // 바뀌면 재조회 시 sufficientQuantity=true로 보일 수 있다 — 이 경우 "부족"이라고 단정하면 안 된다
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'SOXL', direction: 'BUY', orderType: 'LIMIT', quantity: 21, price: '154.00', status: 'PLANNED' },
        ],
        position: null,
        orders: [
          { ticker: 'SOXL', orderType: 'LIMIT', direction: 'BUY', quantity: 21, price: '154.00' },
          { ticker: 'SOXL', orderType: 'LIMIT', direction: 'SELL', quantity: 9, price: '160.00' },
        ],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: true,
          availableDeposit: '5000',
          requiredForThisStrategy: '3234',
          consumedByHigherPriority: '0',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
        sellSufficiency: {
          sufficientQuantity: true,
          sellableQuantity: 20,
          reservedQuantity: 0,
          requiredQuantity: 9,
          liveQuantityUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('판매가능수량 충족됨 — 마감 시 매도 재시도 예정')).toBeInTheDocument()
    expect(screen.queryByText(/부족/)).not.toBeInTheDocument()
  })

  it('shows a sell quantity check-failed banner when the broker lookup itself failed', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'SOXL', direction: 'BUY', orderType: 'LIMIT', quantity: 21, price: '154.00', status: 'PLANNED' },
        ],
        position: null,
        orders: [
          { ticker: 'SOXL', orderType: 'LIMIT', direction: 'BUY', quantity: 21, price: '154.00' },
          { ticker: 'SOXL', orderType: 'LIMIT', direction: 'SELL', quantity: 9, price: '160.00' },
        ],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: true,
          availableDeposit: '5000',
          requiredForThisStrategy: '3234',
          consumedByHigherPriority: '0',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
        sellSufficiency: {
          sufficientQuantity: true,
          sellableQuantity: 0,
          reservedQuantity: 0,
          requiredQuantity: 9,
          liveQuantityUnavailable: true,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('판매가능수량 확인 실패로 매도 미접수 — 잠시 후 다시 확인해주세요')).toBeInTheDocument()
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
        competition: null,
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
        competition: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText(/미접수/)).not.toBeInTheDocument()
  })

  it('never renders the removed BuyCompetitionNotice component', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [],
        position: null,
        orders: [{ ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 5, price: '20.00' }],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: false,
          availableDeposit: '1000',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '900',
          blockedByHigherPriority: [
            { strategyId: 'vr-1', type: 'VR', ticker: 'TQQQ', requiredBuyUsd: '900', priority: 0 },
          ],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    // 자세히 보기 토글·부족액 상세 문구는 BuyCompetitionNotice 전용 UI였다 — 더 이상 존재하지 않아야 한다
    expect(screen.queryByText('자세히 ▾')).not.toBeInTheDocument()
    expect(screen.queryByText(/부족 \(우선순위 전략/)).not.toBeInTheDocument()
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
        competition: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)
    fireEvent.click(screen.getByText('전체 취소'))
    cancelAllSuccessHandler?.({ cancelledCount: 1, failedCount: 0 })

    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('1건 모두 취소됐습니다.')
  })
})

describe('StrategyDetail budget deficit badge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T10:00:00+09:00')) // 화요일 — 휴장일 배지에 가려지지 않도록 평일 고정
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('예수금 부족 배지에 부족 금액을 함께 보여준다', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [],
        position: null,
        orders: [{ ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 5, price: '20.00' }],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: false,
          availableDeposit: '1000',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '900',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    // previewDeficit = max(0, 900 + 200 - 1000) = 100
    expect(screen.getByText('예수금 $100.00 부족(장 마감 시 재시도)')).toBeInTheDocument()
  })

  it('shows an uncertain banner in preview mode instead of hiding the state when live balance lookup failed', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [],
        position: null,
        orders: [{ ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 5, price: '20.00' }],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: true,
          availableDeposit: '0',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '0',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: true,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText(/예수금 \$[\d,.]+ 부족/)).not.toBeInTheDocument()
    expect(screen.getByText('예수금 확인 실패 — 잠시 후 다시 확인해주세요')).toBeInTheDocument()
  })
})

describe('StrategyDetail sell quantity deficit banner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T10:00:00+09:00')) // 화요일 — 휴장일 배지에 가려지지 않도록 평일 고정
    executeMutate.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('판매가능수량 부족 배너에 부족 수량을 함께 보여준다 (preview 모드)', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [],
        position: null,
        orders: [{ ticker: 'SOXL', orderType: 'LIMIT', direction: 'SELL', quantity: 9, price: '160.00' }],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: null,
        sellSufficiency: {
          sufficientQuantity: false,
          sellableQuantity: 6,
          reservedQuantity: 0,
          requiredQuantity: 9,
          liveQuantityUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('판매가능수량 3주 부족(장 마감 시 재시도)')).toBeInTheDocument()
  })

  it('판매가능수량 확인 실패 시 preview 모드에서도 배너를 숨기지 않고 확인 실패로 안내한다', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [],
        position: null,
        orders: [{ ticker: 'SOXL', orderType: 'LIMIT', direction: 'SELL', quantity: 9, price: '160.00' }],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: null,
        sellSufficiency: {
          sufficientQuantity: true,
          sellableQuantity: 0,
          reservedQuantity: 0,
          requiredQuantity: 9,
          liveQuantityUnavailable: true,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText(/판매가능수량 \d+주 부족/)).not.toBeInTheDocument()
    expect(screen.getByText('판매가능수량 확인 실패 — 잠시 후 다시 확인해주세요')).toBeInTheDocument()
  })

  it('판매가능수량이 부족하면 "바로 주문" 클릭 시 토스트로 안내하고 주문을 실행하지 않는다', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [],
        position: null,
        orders: [{ ticker: 'SOXL', orderType: 'LIMIT', direction: 'SELL', quantity: 9, price: '160.00' }],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: null,
        sellSufficiency: {
          sufficientQuantity: false,
          sellableQuantity: 6,
          reservedQuantity: 0,
          requiredQuantity: 9,
          liveQuantityUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    fireEvent.click(screen.getByText('바로 주문'))

    expect(toast.info).toHaveBeenCalledWith('판매가능수량이 부족합니다')
    expect(executeMutate).not.toHaveBeenCalled()
  })
})

describe('StrategyDetail concurrent BUY/SELL deficit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T10:00:00+09:00')) // 화요일 — 휴장일 배지에 가려지지 않도록 평일 고정
    executeMutate.mockClear()
    vi.mocked(toast.info).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function bothDeficitPreview() {
    return {
      data: {
        todayOrders: [],
        position: null,
        orders: [
          { ticker: 'SOXL', orderType: 'LIMIT', direction: 'BUY', quantity: 21, price: '154.00' },
          { ticker: 'SOXL', orderType: 'LIMIT', direction: 'SELL', quantity: 9, price: '160.00' },
        ],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: false,
          availableDeposit: '1000',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '900',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
        sellSufficiency: {
          sufficientQuantity: false,
          sellableQuantity: 6,
          reservedQuantity: 0,
          requiredQuantity: 9,
          liveQuantityUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    }
  }

  it('BUY 예수금 부족과 SELL 판매가능수량 부족이 동시에 있으면 배너에 둘 다 표시한다', () => {
    mockPreviewQuery.mockReturnValueOnce(bothDeficitPreview())

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    // previewDeficit = max(0, 900 + 200 - 1000) = 100
    expect(screen.getByText('예수금 $100.00 부족(장 마감 시 재시도) · 판매가능수량 3주 부족(장 마감 시 재시도)')).toBeInTheDocument()
  })

  it('BUY/SELL 부족이 동시에 있으면 "바로 주문" 클릭 시 두 토스트를 모두 보여주고 주문을 실행하지 않는다', () => {
    mockPreviewQuery.mockReturnValueOnce(bothDeficitPreview())

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    fireEvent.click(screen.getByText('바로 주문'))

    expect(toast.info).toHaveBeenCalledWith('예수금이 부족합니다')
    expect(toast.info).toHaveBeenCalledWith('판매가능수량이 부족합니다')
    expect(executeMutate).not.toHaveBeenCalled()
  })

  it('BUY 예수금만 부족하면 "바로 주문" 클릭 시 예수금 토스트만 보여준다', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [],
        position: null,
        orders: [{ ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 5, price: '20.00' }],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: false,
          availableDeposit: '1000',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '900',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    fireEvent.click(screen.getByText('바로 주문'))

    expect(toast.info).toHaveBeenCalledWith('예수금이 부족합니다')
    expect(toast.info).not.toHaveBeenCalledWith('판매가능수량이 부족합니다')
    expect(executeMutate).not.toHaveBeenCalled()
  })
})

describe('StrategyDetail executed-mode deficit badge', () => {
  it('shows the deficit badge with the exact amount once the strategy is in executed mode', () => {
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
        competition: {
          sufficientBudget: false,
          availableDeposit: '1000',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '900',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    // deficitUsd = max(0, 900 + 200 - 1000) = 100
    expect(screen.getByText('예수금 $100.00 부족')).toBeInTheDocument()
    expect(screen.getByText('예수금 부족으로 매수 미접수')).toBeInTheDocument()
  })

  it('hides the deficit badge and rewords the notice once the deposit becomes sufficient', () => {
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
        competition: {
          sufficientBudget: true,
          availableDeposit: '1000',
          requiredForThisStrategy: '100',
          consumedByHigherPriority: '0',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText(/예수금 \$[\d,.]+ 부족/)).not.toBeInTheDocument()
    expect(screen.getByText('예수금 충족됨 — 마감 시 매수 재시도 예정')).toBeInTheDocument()
  })

  it('shows an uncertain notice instead of claiming the deficit is resolved when live balance lookup failed', () => {
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
        competition: {
          sufficientBudget: true,
          availableDeposit: '0',
          requiredForThisStrategy: '100',
          consumedByHigherPriority: '0',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: true,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText(/예수금 \$[\d,.]+ 부족/)).not.toBeInTheDocument()
    expect(screen.getByText('예수금 확인 실패로 매수 미접수 — 잠시 후 다시 확인해주세요')).toBeInTheDocument()
    // executed 모드에서는 상단 배너에 "확인 실패" 문구를 중복 노출하지 않는다 — 방향별 미접수 목록이 이미 안내한다
    expect(screen.queryByText('예수금 확인 실패 — 잠시 후 다시 확인해주세요')).not.toBeInTheDocument()
  })

  it('executed 모드에서도 판매가능수량 부족 배너를 정확한 수량과 함께 보여준다', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'SOXL', direction: 'BUY', orderType: 'LIMIT', quantity: 21, price: '154.00', status: 'PLANNED' },
        ],
        position: null,
        orders: [
          { ticker: 'SOXL', orderType: 'LIMIT', direction: 'BUY', quantity: 21, price: '154.00' },
          { ticker: 'SOXL', orderType: 'LIMIT', direction: 'SELL', quantity: 9, price: '160.00' },
        ],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: true,
          availableDeposit: '5000',
          requiredForThisStrategy: '3234',
          consumedByHigherPriority: '0',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
        sellSufficiency: {
          sufficientQuantity: false,
          sellableQuantity: 6,
          reservedQuantity: 0,
          requiredQuantity: 9,
          liveQuantityUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('판매가능수량 3주 부족')).toBeInTheDocument()
    expect(screen.getByText('판매가능수량 3주 부족으로 매도 미접수')).toBeInTheDocument()
  })

  it('executed 모드에서는 판매가능수량 확인 실패 배너를 중복 노출하지 않는다', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'SOXL', direction: 'BUY', orderType: 'LIMIT', quantity: 21, price: '154.00', status: 'PLANNED' },
        ],
        position: null,
        orders: [
          { ticker: 'SOXL', orderType: 'LIMIT', direction: 'BUY', quantity: 21, price: '154.00' },
          { ticker: 'SOXL', orderType: 'LIMIT', direction: 'SELL', quantity: 9, price: '160.00' },
        ],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: true,
          availableDeposit: '5000',
          requiredForThisStrategy: '3234',
          consumedByHigherPriority: '0',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
        sellSufficiency: {
          sufficientQuantity: true,
          sellableQuantity: 0,
          reservedQuantity: 0,
          requiredQuantity: 9,
          liveQuantityUnavailable: true,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('판매가능수량 확인 실패로 매도 미접수 — 잠시 후 다시 확인해주세요')).toBeInTheDocument()
    expect(screen.queryByText('판매가능수량 확인 실패 — 잠시 후 다시 확인해주세요')).not.toBeInTheDocument()
  })
})

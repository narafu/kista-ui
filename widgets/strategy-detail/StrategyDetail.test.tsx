import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPreview } from '@entities/order'
import { StrategyDetail } from './StrategyDetail'

const mockPush = vi.fn()
const deleteMutate = vi.fn()
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
  useExecuteStrategyMutation: () => ({ mutate: vi.fn(), isPending: false }),
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

vi.mock('@entities/order', () => ({
  useStrategyOrderPreviewQuery: () => mockPreviewQuery(),
  useCancelAllOrdersMutation: () => ({
    mutate: (_: undefined, opts?: { onSuccess?: (r: { cancelledCount: number; failedCount: number }) => void }) => {
      cancelAllSuccessHandler = opts?.onSuccess
    },
    isPending: false,
  }),
  useCancelOneOrderMutation: () => ({ mutate: vi.fn(), isPending: false, variables: null }),
}))

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
        competition: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getByText('예수금 부족으로 매수 미접수')).toBeInTheDocument()
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
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    // previewDeficit = max(0, 900 + 200 - 1000) = 100
    expect(screen.getByText('예수금 부족 ($100.00 부족)')).toBeInTheDocument()
  })
})

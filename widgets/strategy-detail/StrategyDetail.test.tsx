import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Strategy } from '@entities/strategy'
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

vi.mock('@entities/order', () => ({
  useStrategyOrderPreviewQuery: () => ({
    data: { todayOrders: [], position: null, orders: [], skipReason: 'NO_CYCLE_HISTORY', otherStrategiesPlannedBuyUsd: '0' },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useCancelAllOrdersMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelOneOrderMutation: () => ({ mutate: vi.fn(), isPending: false, variables: null }),
}))

vi.mock('@entities/account', () => ({
  useAccountMarginQuery: () => ({ items: [], isLoading: false }),
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
    const { container } = render(<StrategyDetail accountId="account-1" accountNoMasked="123-45" strategy={baseStrategy} />)

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
    const { container } = render(<StrategyDetail accountId="account-1" accountNoMasked="123-45" strategy={{ ...baseStrategy, status: 'PAUSED', isReverseMode: true }} />)

    const accent = container.querySelector('[data-testid="strategy-status-accent"]')

    expect(accent).toHaveStyle({ background: 'var(--warn)' })
    expect(screen.getByText('PAUSED')).toBeInTheDocument()
    expect(screen.getByTestId('strategy-status-group')).toHaveTextContent('리버스모드')
    expect(screen.getByText('리버스모드')).toBeInTheDocument()
  })

  it('shows an alternate operating mode label when the strategy type has no division count', () => {
    render(<StrategyDetail accountId="account-1" accountNoMasked="123-45" strategy={{ ...baseStrategy, type: 'PRIVACY', divisionCount: 0 }} />)

    expect(screen.getByTestId('strategy-summary-grid')).toHaveTextContent('운용 방식')
    expect(screen.getByTestId('strategy-summary-grid')).toHaveTextContent('매매표')
    expect(screen.getByTestId('strategy-summary-grid')).not.toHaveTextContent('분할')
  })

  it('redirects to the strategies list after deleting a strategy', () => {
    render(<StrategyDetail accountId="account-1" accountNoMasked="123-45" strategy={baseStrategy} />)

    deleteSuccessHandler?.()

    expect(mockPush).toHaveBeenCalledWith('/accounts/account-1')
  })

  it('shows VR summary instead of privacy operating mode copy', () => {
    render(<StrategyDetail
      accountId="account-1"
      accountNoMasked="123-45"
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

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Strategy } from '@entities/strategy'
import { StrategyDetail } from './StrategyDetail'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
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
  KpiCard: ({ label, value }: { label: string; value?: React.ReactNode }) => <div>{label}{value}</div>,
}))

vi.mock('@widgets/cycle-history', () => ({
  StrategyTradesTab: () => <div>strategy-trades-tab</div>,
}))

vi.mock('@entities/strategy', () => ({
  useDeleteStrategyMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useExecuteStrategyMutation: () => ({ mutate: vi.fn(), isPending: false }),
  usePauseStrategyMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useResumeStrategyMutation: () => ({ mutate: vi.fn(), isPending: false }),
  seedBadgeClass: () => 'seed-badge',
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
    findStrategyType: () => ({ divisionCounts: [20, 30, 40] }),
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
  it('shows strategy metadata without duplicating the ticker in the card header', () => {
    const { container } = render(
      <StrategyDetail
        accountId="account-1"
        accountNoMasked="123-45"
        strategy={baseStrategy}
      />,
    )

    const accent = container.querySelector('[data-testid="strategy-status-accent"]')

    expect(accent).toBeInTheDocument()
    expect(accent).toHaveStyle({ background: 'var(--status-ok)' })
    expect(screen.getByText('INFINITE')).toBeInTheDocument()
    expect(screen.queryByText('계좌')).not.toBeInTheDocument()
    expect(screen.getByText('123-45')).toBeInTheDocument()
    expect(screen.getByTestId('strategy-meta-row')).toHaveClass('items-start', 'sm:items-center')
    expect(screen.queryByText('ACTIVE')).not.toBeInTheDocument()
  })

  it('shows paused styling and secondary meta chips for division and reverse mode', () => {
    const { container } = render(
      <StrategyDetail
        accountId="account-1"
        accountNoMasked="123-45"
        strategy={{ ...baseStrategy, status: 'PAUSED', isReverseMode: true }}
      />,
    )

    const accent = container.querySelector('[data-testid="strategy-status-accent"]')

    expect(accent).toHaveStyle({ background: 'var(--warn)' })
    expect(screen.getByText('PAUSED')).toBeInTheDocument()
    expect(screen.getByTestId('strategy-hero-group')).toHaveTextContent('20분할')
    expect(screen.getByTestId('strategy-meta-row')).not.toHaveTextContent('20분할')
    expect(screen.getByText('리버스모드')).toBeInTheDocument()
  })
})

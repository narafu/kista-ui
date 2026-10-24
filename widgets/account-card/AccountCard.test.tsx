import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'
import { AccountCard } from './AccountCard'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('@entities/meta', async () => {
  const { testLabelOf } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({
    findBroker: () => ({
      label: '한국투자',
      description: 'KIS',
    }),
    labelOf: testLabelOf,
  }) }
})

vi.mock('@entities/strategy', () => ({
  useStrategiesQuery: () => strategiesQueryState ?? { data: strategiesQueryData },
  strategyStatusAccent: (status: string) => status === 'ACTIVE' ? undefined : 'var(--muted-foreground)',
  strategyTypeShort: (type: string) => {
    if (type === 'PRIVACY') return 'P'
    if (type === 'INFINITE') return 'I'
    return type
  },
}))

let strategiesQueryData: Strategy[] = []
let strategiesQueryState: { data?: Strategy[]; isPending?: boolean; isError?: boolean } | null = null

const baseAccount: Account = {
  id: 'account-1',
  nickname: '메인 계좌',
  accountNoMasked: '123-45',
  broker: 'KIS',
}

const baseStrategy: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'TSLA',
  cycleSeedType: 'MAX',
  initialUsdDeposit: 1000,
  divisionCount: 20,
  isReverseMode: false,
}

describe('AccountCard', () => {
  beforeEach(() => {
    strategiesQueryData = []
    strategiesQueryState = null
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-18T00:00:00+09:00'))
  })

  afterEach(() => vi.useRealTimers())

  it('API 키 만료가 30일 이내면 만료 임박 배지를 보여준다', () => {
    render(<AccountCard account={{ ...baseAccount, broker: 'UPBIT', accountNoMasked: null, apiKeyExpiresAt: '2026-11-01T00:00:00+09:00' }} />)
    expect(screen.getAllByText('API 키 만료 임박').length).toBeGreaterThan(0)
  })

  it('만료된 키는 재등록 필요 배지를 보여준다', () => {
    render(<AccountCard account={{ ...baseAccount, apiKeyExpiresAt: '2026-10-01T00:00:00+09:00' }} />)
    expect(screen.getAllByText('API 키 재등록 필요').length).toBeGreaterThan(0)
  })

  it('distinguishes loading and failed strategy queries from an empty strategy list', () => {
    strategiesQueryState = { data: undefined, isPending: true, isError: false }
    const { rerender } = render(<AccountCard account={baseAccount} />)
    expect(screen.getAllByText('불러오는 중…')).toHaveLength(2)
    expect(screen.queryByText('전략 미등록')).not.toBeInTheDocument()

    strategiesQueryState = { data: undefined, isPending: false, isError: true }
    rerender(<AccountCard account={baseAccount} />)
    expect(screen.getAllByText('전략 조회 실패')).toHaveLength(2)

    strategiesQueryState = { data: [], isPending: false, isError: false }
    rerender(<AccountCard account={baseAccount} />)
    expect(screen.getAllByText('전략 미등록')).toHaveLength(2)
  })

  it('hides the left accent strip when all strategies are active', () => {
    strategiesQueryData = [baseStrategy]
    const { container } = render(
      <AccountCard account={baseAccount} />,
    )

    expect(container.querySelector('[data-testid="account-status-accent"]')).not.toBeInTheDocument()
    expect(screen.queryByText('ACTIVE')).not.toBeInTheDocument()
  })

  it('uses the muted accent when strategy statuses are mixed', () => {
    strategiesQueryData = [baseStrategy, { ...baseStrategy, id: 'strategy-2', status: 'PAUSED' }]
    const { container } = render(
      <AccountCard account={baseAccount} />,
    )

    const accent = container.querySelector('[data-testid="account-status-accent"]')

    expect(accent).toHaveStyle({ background: 'var(--muted-foreground)' })
    expect(screen.queryByText('ACTIVE 1개')).not.toBeInTheDocument()
  })

  it('renders compact strategy badges with status-colored border and text', () => {
    strategiesQueryData = [
      { ...baseStrategy, id: 'strategy-1', type: 'PRIVACY', ticker: 'SOXL', status: 'PAUSED' },
      { ...baseStrategy, id: 'strategy-2', type: 'INFINITE', ticker: 'MAGX', status: 'ACTIVE' },
    ]
    const { container } = render(
      <AccountCard account={baseAccount} />,
    )

    expect(screen.getAllByText('P-SOXL · 일시중지')).toHaveLength(2)
    expect(screen.getAllByText('I-MAGX')).toHaveLength(2)
    expect(screen.queryByText('전략 2개')).not.toBeInTheDocument()

    const pausedBadge = container.querySelector('[data-testid="strategy-badge-strategy-1-mobile"]')

    expect(pausedBadge).toHaveAttribute('style', expect.stringContaining('border-color: var(--muted-foreground);'))
    expect(pausedBadge).toHaveAttribute('style', expect.stringContaining('color: var(--muted-foreground);'))
  })

  it('top-aligns wrapped mobile strategy badges so multiple rows do not collapse toward the center', () => {
    strategiesQueryData = [
      { ...baseStrategy, id: 'strategy-1', type: 'PRIVACY', ticker: 'SOXL' },
      { ...baseStrategy, id: 'strategy-2', type: 'INFINITE', ticker: 'MAGX' },
      { ...baseStrategy, id: 'strategy-3', type: 'PRIVACY', ticker: 'TSLL' },
    ]
    render(
      <AccountCard account={baseAccount} />,
    )

    const mobileMainRow = screen.getAllByText('메인 계좌')[0]?.parentElement
    const strategyBadgeGroup = mobileMainRow?.children[1]

    expect(mobileMainRow).toHaveClass('items-start')
    expect(strategyBadgeGroup).toHaveClass('items-start')
    expect(strategyBadgeGroup).toHaveClass('content-start')
  })

  it('uses fixed-height desktop strategy rows so badges stay vertically centered between dividers', () => {
    strategiesQueryData = [
      { ...baseStrategy, id: 'strategy-1', type: 'INFINITE', ticker: 'MAGX', initialUsdDeposit: 2103 },
      { ...baseStrategy, id: 'strategy-2', type: 'PRIVACY', ticker: 'SOXL', initialUsdDeposit: 6989 },
    ]
    render(
      <AccountCard account={baseAccount} />,
    )

    const desktopBadge = screen.getByTestId('strategy-badge-strategy-1-desktop')
    const desktopRow = desktopBadge.closest('li')
    const desktopAmount = screen.getByText('$2,103.00')

    expect(desktopRow).toHaveClass('flex')
    expect(desktopRow).toHaveClass('items-center')
    expect(desktopRow).toHaveClass('py-3')
    expect(desktopBadge).toHaveClass('leading-none')
    expect(desktopAmount).toHaveClass('leading-none')
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'
import { AllStrategiesList } from './AllStrategiesList'

const pushMock = vi.fn()
const strategyCardMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('@widgets/strategy-card', () => ({
  StrategyCard: (props: unknown) => {
    strategyCardMock(props)
    return <div data-testid="strategy-card-stub" />
  },
}))

vi.mock('@entities/strategy', () => ({
  useAllStrategiesQuery: (initialData: Strategy[]) => ({
    data: initialData,
  }),
}))

vi.mock('@shared/ui/Spinner', () => ({
  Spinner: () => <div>spinner</div>,
}))

const accounts: Account[] = [
  {
    id: 'account-1',
    nickname: '토스 메인',
    accountNoMasked: '123-45',
    broker: 'KIS',
  },
]

const strategies: Strategy[] = [
  {
    id: 'strategy-1',
    accountId: 'account-1',
    type: 'INFINITE',
    status: 'ACTIVE',
    ticker: 'MAGX',
    cycleSeedType: 'MAX',
    initialUsdDeposit: 1000,
    divisionCount: 20,
    isReverseMode: false,
  },
]

describe('AllStrategiesList', () => {
  it('passes account nickname to strategy cards instead of the account number', () => {
    strategyCardMock.mockClear()

    render(<AllStrategiesList strategies={strategies} accounts={accounts} />)

    expect(strategyCardMock).toHaveBeenCalledWith(expect.objectContaining({
      accountLabel: '토스 메인',
    }))
  })

  it('shows only account nicknames in the empty state account list', () => {
    render(<AllStrategiesList strategies={[]} accounts={accounts} />)

    expect(screen.getByText('토스 메인')).toBeInTheDocument()
    expect(screen.queryByText('123-45')).not.toBeInTheDocument()
  })
})

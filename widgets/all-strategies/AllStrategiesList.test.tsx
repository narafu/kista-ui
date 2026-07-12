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

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    findBroker: (code: string) => ({
      label: code === 'KIS' ? '한국투자' : code,
      description: code,
    }),
  }),
}))

vi.mock('@shared/ui/Spinner', () => ({
  Spinner: () => <div>spinner</div>,
}))

const singleAccount: Account[] = [
  {
    id: 'account-1',
    nickname: '토스 메인',
    accountNoMasked: '123-45',
    broker: 'KIS',
  },
]

const multiAccounts: Account[] = [
  {
    id: 'account-1',
    nickname: '토스 메인',
    accountNoMasked: '123-45',
    broker: 'KIS',
  },
  {
    id: 'account-2',
    nickname: '한투 서브',
    accountNoMasked: '678-90',
    broker: 'KIS',
  },
]

function strategyFor(accountId: string, id: string): Strategy {
  return {
    id,
    accountId,
    type: 'INFINITE',
    status: 'ACTIVE',
    ticker: 'MAGX',
    cycleSeedType: 'MAX',
    initialUsdDeposit: 1000,
    divisionCount: 20,
    isReverseMode: false,
  }
}

describe('AllStrategiesList', () => {
  it('passes account nickname to strategy cards when there is a single account', () => {
    strategyCardMock.mockClear()

    render(<AllStrategiesList strategies={[strategyFor('account-1', 'strategy-1')]} accounts={singleAccount} />)

    expect(strategyCardMock).toHaveBeenCalledWith(expect.objectContaining({
      accountLabel: '토스 메인',
    }))
  })

  it('does not render an account section header when there is a single account', () => {
    render(<AllStrategiesList strategies={[strategyFor('account-1', 'strategy-1')]} accounts={singleAccount} />)

    expect(screen.queryByRole('heading', { name: '토스 메인' })).not.toBeInTheDocument()
  })

  it('shows only account nicknames in the empty state account list', () => {
    render(<AllStrategiesList strategies={[]} accounts={singleAccount} />)

    expect(screen.getByText('토스 메인')).toBeInTheDocument()
    expect(screen.queryByText('123-45')).not.toBeInTheDocument()
  })

  it('groups strategies by account with a section header per account when there are multiple accounts', () => {
    strategyCardMock.mockClear()
    const strategies = [strategyFor('account-1', 'strategy-1'), strategyFor('account-2', 'strategy-2')]

    render(<AllStrategiesList strategies={strategies} accounts={multiAccounts} />)

    expect(screen.getByRole('heading', { name: '토스 메인' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '한투 서브' })).toBeInTheDocument()
    expect(strategyCardMock).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'account-1',
      accountLabel: undefined,
    }))
    expect(strategyCardMock).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'account-2',
      accountLabel: undefined,
    }))
  })

  it('omits an account section when that account has no strategies', () => {
    render(<AllStrategiesList strategies={[strategyFor('account-1', 'strategy-1')]} accounts={multiAccounts} />)

    expect(screen.getByRole('heading', { name: '토스 메인' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '한투 서브' })).not.toBeInTheDocument()
  })
})

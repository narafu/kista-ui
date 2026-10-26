import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'
import { AllStrategiesList } from './AllStrategiesList'

const pushMock = vi.fn()
let searchParamsValue = ''
const strategyCardMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/strategies',
  useSearchParams: () => new URLSearchParams(searchParamsValue),
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
  useAllStrategiesQuery: () => ({
    data: strategiesQueryData,
    isError: strategiesQueryError,
  }),
}))

vi.mock('@entities/account', async (importOriginal) => ({
  sortMockLast: (await importOriginal<typeof import('@entities/account')>()).sortMockLast,
  useAccountsQuery: () => ({
    data: accountsQueryData,
    isError: false,
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

let strategiesQueryData: Strategy[] | undefined = []
let strategiesQueryError = false
let accountsQueryData: Account[] = []

function setQueries(strategies: Strategy[], accounts: Account[]) {
  strategiesQueryData = strategies
  accountsQueryData = accounts
}

describe('AllStrategiesList', () => {
  beforeEach(() => {
    strategyCardMock.mockClear()
    searchParamsValue = ''
    strategiesQueryError = false
    setQueries([], [])
  })

  it('passes account nickname to strategy cards when there is a single account', () => {
    setQueries([strategyFor('account-1', 'strategy-1')], singleAccount)

    render(<AllStrategiesList />)

    expect(strategyCardMock).toHaveBeenCalledWith(expect.objectContaining({
      accountLabel: '토스 메인',
    }))
  })

  it('does not render an account section header when there is a single account', () => {
    setQueries([strategyFor('account-1', 'strategy-1')], singleAccount)
    render(<AllStrategiesList />)

    expect(screen.queryByRole('heading', { name: '토스 메인' })).not.toBeInTheDocument()
  })

  it('shows only account nicknames in the empty state account list', () => {
    setQueries([], singleAccount)
    render(<AllStrategiesList />)

    expect(screen.getByText('토스 메인')).toBeInTheDocument()
    expect(screen.queryByText('123-45')).not.toBeInTheDocument()
  })

  it('links each account in the empty state straight to the new strategy route', () => {
    setQueries([], multiAccounts)
    render(<AllStrategiesList />)

    expect(screen.getByRole('link', { name: '한투 서브' })).toHaveAttribute('href', '/accounts/account-2/strategies/new')
  })

  it('shows the error state when the strategy list fails to load', () => {
    strategiesQueryData = undefined
    strategiesQueryError = true
    accountsQueryData = singleAccount
    render(<AllStrategiesList />)

    expect(screen.getByText('전략 목록을 불러오지 못했습니다.')).toBeInTheDocument()
  })

  it('groups strategies by account with a section header per account when there are multiple accounts', () => {
    const strategies = [strategyFor('account-1', 'strategy-1'), strategyFor('account-2', 'strategy-2')]
    setQueries(strategies, multiAccounts)

    render(<AllStrategiesList />)

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
    setQueries([strategyFor('account-1', 'strategy-1')], multiAccounts)
    render(<AllStrategiesList />)

    expect(screen.getByRole('heading', { name: '토스 메인' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '한투 서브' })).not.toBeInTheDocument()
  })

  it('shows the account filter and lists all groups by default when 2+ accounts have strategies', () => {
    setQueries([strategyFor('account-1', 'strategy-1'), strategyFor('account-2', 'strategy-2')], multiAccounts)
    render(<AllStrategiesList />)

    expect(screen.getByRole('group', { name: '계좌 필터' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '전체 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByTestId('strategy-card-stub')).toHaveLength(2)
  })

  it('hides the account filter when only one account has strategies', () => {
    setQueries([strategyFor('account-1', 'strategy-1')], multiAccounts)
    render(<AllStrategiesList />)

    expect(screen.queryByRole('group', { name: '계좌 필터' })).not.toBeInTheDocument()
  })

  it('shows only the selected account group from the account param', () => {
    searchParamsValue = 'account=account-2'
    setQueries([strategyFor('account-1', 'strategy-1'), strategyFor('account-2', 'strategy-2')], multiAccounts)
    render(<AllStrategiesList />)

    expect(screen.getAllByTestId('strategy-card-stub')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: '한투 서브' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '토스 메인' })).not.toBeInTheDocument()
  })

  it('writes the selected account to the url', async () => {
    setQueries([strategyFor('account-1', 'strategy-1'), strategyFor('account-2', 'strategy-2'), strategyFor('account-2', 'strategy-3')], multiAccounts)
    render(<AllStrategiesList />)
    const replaceState = vi.spyOn(window.history, 'replaceState')

    await userEvent.click(screen.getByRole('button', { name: '한투 서브 2' }))
    expect(replaceState).toHaveBeenCalledWith(null, '', '?account=account-2')
    replaceState.mockRestore()
  })

  it('treats an unknown account param as all accounts', () => {
    searchParamsValue = 'account=nope'
    setQueries([strategyFor('account-1', 'strategy-1'), strategyFor('account-2', 'strategy-2')], multiAccounts)
    render(<AllStrategiesList />)

    expect(screen.getAllByTestId('strategy-card-stub')).toHaveLength(2)
  })

  it('puts mock account groups and filter options last', () => {
    const mock: Account = { id: 'account-m', nickname: '모의', accountNoMasked: null, broker: 'MOCK' }
    setQueries(
      [strategyFor('account-m', 'strategy-m'), strategyFor('account-1', 'strategy-1'), strategyFor('account-2', 'strategy-2')],
      [mock, ...multiAccounts],
    )
    render(<AllStrategiesList />)

    expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual(['토스 메인', '한투 서브', '모의'])
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['전체 3', '토스 메인 1', '한투 서브 1', '모의 1'])
    expect(strategyCardMock.mock.calls.map(([props]) => (props as { strategy: Strategy }).strategy.id)).toEqual([
      'strategy-1',
      'strategy-2',
      'strategy-m',
    ])
  })

  it('lists mock accounts last in the empty state', () => {
    const mock: Account = { id: 'account-m', nickname: '모의', accountNoMasked: null, broker: 'MOCK' }
    setQueries([], [mock, ...multiAccounts])
    render(<AllStrategiesList />)

    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual(['토스 메인', '한투 서브', '모의'])
  })
})

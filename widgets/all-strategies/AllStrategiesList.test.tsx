import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPreview } from '@entities/order'
import { AllStrategiesList } from './AllStrategiesList'

// use()로 unwrap하는 previewsPromise는 매 렌더마다 새로 만들어야 한다 — 이미 처리된 동일 Promise
// 인스턴스를 재사용하면 이전 테스트에서 이미 소비된 pending state로 인해 재현이 흔들릴 수 있다
function resolvedPreviews(): Promise<Record<string, NextOrderPreview>> {
  return Promise.resolve({})
}

// use()가 Promise 결과를 반영하려면 render() 자체가 async act() 안에서 실행돼 마이크로태스크가 flush돼야 한다
async function renderAndFlush(ui: React.ReactElement) {
  await act(async () => {
    render(ui)
  })
}

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
  it('passes account nickname to strategy cards when there is a single account', async () => {
    strategyCardMock.mockClear()

    await renderAndFlush(
      <AllStrategiesList
        strategies={[strategyFor('account-1', 'strategy-1')]}
        accounts={singleAccount}
        previewsPromise={resolvedPreviews()}
      />,
    )

    expect(strategyCardMock).toHaveBeenCalledWith(expect.objectContaining({
      accountLabel: '토스 메인',
    }))
  })

  it('does not render an account section header when there is a single account', () => {
    render(
      <AllStrategiesList
        strategies={[strategyFor('account-1', 'strategy-1')]}
        accounts={singleAccount}
        previewsPromise={resolvedPreviews()}
      />,
    )

    expect(screen.queryByRole('heading', { name: '토스 메인' })).not.toBeInTheDocument()
  })

  it('shows only account nicknames in the empty state account list', () => {
    render(<AllStrategiesList strategies={[]} accounts={singleAccount} previewsPromise={resolvedPreviews()} />)

    expect(screen.getByText('토스 메인')).toBeInTheDocument()
    expect(screen.queryByText('123-45')).not.toBeInTheDocument()
  })

  it('groups strategies by account with a section header per account when there are multiple accounts', async () => {
    strategyCardMock.mockClear()
    const strategies = [strategyFor('account-1', 'strategy-1'), strategyFor('account-2', 'strategy-2')]

    await renderAndFlush(
      <AllStrategiesList strategies={strategies} accounts={multiAccounts} previewsPromise={resolvedPreviews()} />,
    )

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
    render(
      <AllStrategiesList
        strategies={[strategyFor('account-1', 'strategy-1')]}
        accounts={multiAccounts}
        previewsPromise={resolvedPreviews()}
      />,
    )

    expect(screen.getByRole('heading', { name: '토스 메인' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '한투 서브' })).not.toBeInTheDocument()
  })
})

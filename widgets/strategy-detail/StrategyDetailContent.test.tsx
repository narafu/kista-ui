import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { describe, expect, it, vi } from 'vitest'

import { accountKeys, type Account } from '@entities/account'
import { strategyKeys, type Strategy } from '@entities/strategy'
import { createQueryClient } from '@shared/lib/query'
import { renderApp } from '@testing/renderApp'
import { StrategyDetailContent } from './StrategyDetailContent'

vi.mock('./StrategyDetail', () => ({
  StrategyDetail: () => <div data-testid="infinite-detail" />,
}))
vi.mock('./DcaStrategyDetail', () => ({
  DcaStrategyDetail: () => <div data-testid="dca-detail" />,
}))

const serverAccount: Account = {
  id: 'account-1',
  nickname: 'Server account',
  accountNoMasked: '111-***',
  broker: 'MOCK',
}

const serverStrategy: Strategy = {
  id: 'strategy-1',
  accountId: serverAccount.id,
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'TQQQ',
  cycleSeedType: 'MAX',
  initialDeposit: 1000,
  divisionCount: 20,
  isReverseMode: false,
  cycleInProgress: true,
}

function createClient() {
  const client = createQueryClient()
  client.setQueryDefaults([], { staleTime: Infinity })
  return client
}

function content() {
  return (
    <StrategyDetailContent
      accountId={serverAccount.id}
      strategyId={serverStrategy.id}
      initialAccount={serverAccount}
      initialStrategy={serverStrategy}
    />
  )
}

describe('StrategyDetailContent', () => {
  it('keeps newer prewarmed detail data when stale destination hydration arrives', () => {
    const serverClient = createClient()
    serverClient.setQueryData(accountKeys.detail(serverAccount.id), serverAccount, { updatedAt: 100 })
    serverClient.setQueryData(strategyKeys.detail(serverStrategy.id), serverStrategy, { updatedAt: 100 })
    const browserClient = createClient()
    browserClient.setQueryData(accountKeys.detail(serverAccount.id), { ...serverAccount, nickname: 'Prewarmed account' }, { updatedAt: 200 })
    browserClient.setQueryData(strategyKeys.detail(serverStrategy.id), { ...serverStrategy, ticker: 'SOXL' }, { updatedAt: 200 })

    renderApp(
      <HydrationBoundary state={dehydrate(serverClient)}>
        {content()}
      </HydrationBoundary>,
      { queryClient: browserClient },
    )

    expect(screen.getByRole('heading', { name: 'SOXL' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Prewarmed account/ })).toBeInTheDocument()
  })

  it('updates the strategy and account headers from detail caches without a reload', async () => {
    const queryClient = createClient()
    queryClient.setQueryData(accountKeys.detail(serverAccount.id), serverAccount)
    queryClient.setQueryData(strategyKeys.detail(serverStrategy.id), serverStrategy)
    renderApp(content(), { queryClient })

    act(() => {
      queryClient.setQueryData(accountKeys.detail(serverAccount.id), { ...serverAccount, nickname: 'Edited account' })
      queryClient.setQueryData(strategyKeys.detail(serverStrategy.id), { ...serverStrategy, ticker: 'MAGX' })
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'MAGX' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Edited account/ })).toBeInTheDocument()
    })
  })

  it('DCA 전략은 dca 유무와 무관하게 DcaStrategyDetail로 분기하고 StrategyDetail은 렌더하지 않는다', () => {
    const dcaStrategy: Strategy = { ...serverStrategy, type: 'DCA' }
    const queryClient = createClient()
    queryClient.setQueryData(accountKeys.detail(serverAccount.id), serverAccount)
    queryClient.setQueryData(strategyKeys.detail(serverStrategy.id), dcaStrategy)
    renderApp(content(), { queryClient })

    expect(screen.getByTestId('dca-detail')).toBeInTheDocument()
    expect(screen.queryByTestId('infinite-detail')).not.toBeInTheDocument()
  })

  it.each([
    ['INFINITE', true],
    ['PRIVACY', true],
    ['VR', false],
    ['DCA', true],
  ] as const)('%s 전략의 "투자금 추가" 버튼 노출은 %s', (type, visible) => {
    const queryClient = createClient()
    queryClient.setQueryData(accountKeys.detail(serverAccount.id), serverAccount)
    queryClient.setQueryData(strategyKeys.detail(serverStrategy.id), { ...serverStrategy, type })
    renderApp(content(), { queryClient })

    expect(!!screen.queryByRole('button', { name: '투자금 추가' })).toBe(visible)
  })

  it('INFINITE 전략도 진행 중 사이클이 없으면 "투자금 추가" 버튼를 숨긴다', () => {
    const queryClient = createClient()
    queryClient.setQueryData(accountKeys.detail(serverAccount.id), serverAccount)
    queryClient.setQueryData(strategyKeys.detail(serverStrategy.id), { ...serverStrategy, cycleInProgress: false })
    renderApp(content(), { queryClient })

    expect(screen.queryByRole('button', { name: '투자금 추가' })).not.toBeInTheDocument()
  })

  it.each([
    ['INFINITE', true],
    ['PRIVACY', true],
    ['VR', false],
    ['DCA', true],
  ] as const)('%s 전략의 "투자금 인출" 버튼 노출은 %s', (type, visible) => {
    const queryClient = createClient()
    queryClient.setQueryData(accountKeys.detail(serverAccount.id), serverAccount)
    queryClient.setQueryData(strategyKeys.detail(serverStrategy.id), { ...serverStrategy, type })
    renderApp(content(), { queryClient })

    expect(!!screen.queryByRole('button', { name: '투자금 인출' })).toBe(visible)
  })

  it('진행 중 사이클이 없으면 "투자금 인출" 버튼를 숨긴다', () => {
    const queryClient = createClient()
    queryClient.setQueryData(accountKeys.detail(serverAccount.id), serverAccount)
    queryClient.setQueryData(strategyKeys.detail(serverStrategy.id), { ...serverStrategy, cycleInProgress: false })
    renderApp(content(), { queryClient })

    expect(screen.queryByRole('button', { name: '투자금 인출' })).not.toBeInTheDocument()
  })

  it.each([
    [0.009, false],
    [0, false],
    [0.01, true],
    [undefined, true],
  ] as const)('장부 예수금 %s이면 "투자금 인출" 버튼 노출은 %s', (ledgerDeposit, visible) => {
    const queryClient = createClient()
    queryClient.setQueryData(accountKeys.detail(serverAccount.id), serverAccount)
    queryClient.setQueryData(strategyKeys.detail(serverStrategy.id), { ...serverStrategy, ledgerDeposit })
    renderApp(content(), { queryClient })

    expect(!!screen.queryByRole('button', { name: '투자금 인출' })).toBe(visible)
  })

  it.each([
    ['투자금 추가', '진행 중인 사이클에 예수금을 추가합니다.', '추가 예수금'],
    ['투자금 인출', '진행 중인 사이클에서 예수금을 인출합니다.', '인출 예수금'],
  ] as const)('"%s" 버튼은 같은 화면에서 다이얼로그를 열고 취소로 닫는다', async (name, description, field) => {
    const queryClient = createClient()
    queryClient.setQueryData(accountKeys.detail(serverAccount.id), serverAccount)
    queryClient.setQueryData(strategyKeys.detail(serverStrategy.id), { ...serverStrategy, ledgerDeposit: 500 })
    renderApp(content(), { queryClient })

    fireEvent.click(screen.getByRole('button', { name }))

    const dialog = await screen.findByRole('dialog', { name })
    expect(dialog).toHaveTextContent(description)
    expect(screen.getByLabelText(field)).toBeInTheDocument()
    expect(useRouter().push).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name })).not.toBeInTheDocument())
  })
})

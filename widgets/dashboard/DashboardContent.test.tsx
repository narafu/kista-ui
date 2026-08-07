import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Account } from '@entities/account'
import { accountKeys } from '@entities/account'
import { createQueryClient } from '@shared/lib/query'
import { DashboardContent } from './DashboardContent'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => <img {...props} />,
}))

vi.mock('@widgets/dashboard/MarketChartCard', () => ({
  MarketChartCard: () => <div>market chart</div>,
}))

vi.mock('@features/account/create-account', () => ({
  NewAccountButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}))

const account: Account = {
  id: 'account-1',
  nickname: '캐시 계좌',
  accountNoMasked: '123-***',
  broker: 'MOCK',
}

// marketPanels는 app/(main)/dashboard/page.tsx가 조립해 주입하는 slot이다 — DashboardContent는
// 그 내용을 모른 채 그대로 전달만 하므로, 여기서는 식별 가능한 sentinel로 전달 여부만 검증한다.
const marketPanelsSentinel = <div data-testid="market-panels-sentinel">market panels</div>

function renderWithClient(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <DashboardContent marketPanels={marketPanelsSentinel} isAuthenticated />
    </QueryClientProvider>,
  )
}

describe('DashboardContent', () => {
  it('switches from the first-account CTA to the overview when the query cache gains an account', async () => {
    const client = createQueryClient()
    client.setQueryData(accountKeys.list(), [])

    renderWithClient(client)
    expect(screen.getByText('첫 계좌 등록')).toBeInTheDocument()
    expect(screen.getAllByTestId('market-panels-sentinel').length).toBeGreaterThan(0)

    client.setQueryData(accountKeys.list(), [account])

    await waitFor(() => {
      expect(screen.queryByText('첫 계좌 등록')).not.toBeInTheDocument()
    })
    expect(screen.getAllByTestId('market-panels-sentinel').length).toBeGreaterThan(0)
  })

  it('renders the empty state without fetching accounts when unauthenticated', () => {
    const client = createQueryClient()

    render(
      <QueryClientProvider client={client}>
        <DashboardContent marketPanels={marketPanelsSentinel} isAuthenticated={false} />
      </QueryClientProvider>,
    )

    expect(screen.getByText('첫 계좌 등록')).toBeInTheDocument()
    // enabled: false면 useQuery는 큐리를 절대 fetch하지 않는다 — 게스트가 401 → 자동로그아웃
    // 리로드 루프에 빠지지 않는지를 이 fetchStatus/dataUpdateCount로 검증한다
    const queryState = client.getQueryState(accountKeys.list())
    expect(queryState?.fetchStatus ?? 'idle').toBe('idle')
    expect(queryState?.dataUpdateCount ?? 0).toBe(0)
  })
})

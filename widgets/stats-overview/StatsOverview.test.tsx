import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatsOverview } from './StatsOverview'
import { statsKeys } from '@entities/stats'
import type { EquityCurve, StatsSummary } from '@entities/stats'

const fetchEitherMock = vi.fn()

vi.mock('@shared/lib/api-client', () => ({
  fetchEither: (...args: unknown[]) => fetchEitherMock(...args),
}))

vi.mock('recharts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('recharts')>()
  return {
    ...mod,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 300 }}>{children}</div>
    ),
  }
})

const SUMMARY: StatsSummary = {
  totalRealizedPnl: 150.5,
  totalUnrealizedPnl: -20,
  activePrincipal: 3000,
  byType: [
    {
      type: 'INFINITE', typeDescription: '무한매수법',
      closedCycleCount: 3, activeCycleCount: 1,
      winRate: 0.6667, avgReturnRate: 0.05, avgDurationDays: 21.5,
      realizedPnl: 150.5, unrealizedPnl: -20,
    },
    {
      type: 'PRIVACY', typeDescription: 'Fanding P전략',
      closedCycleCount: 2, activeCycleCount: 0,
      winRate: 1, avgReturnRate: 0.08, avgDurationDays: 14,
      realizedPnl: 80, unrealizedPnl: 0,
    },
  ],
}

const CURVE: EquityCurve = {
  points: [
    { date: '2026-06-01', totalAsset: 1000, principal: 1000 },
    { date: '2026-06-02', totalAsset: 1100, principal: 1000 },
  ],
}

function renderWithClient(ui: React.ReactElement, seed?: (client: QueryClient) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  seed?.(client)
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('StatsOverview', () => {
  beforeEach(() => {
    fetchEitherMock.mockReset()
  })

  it('KPI와 전략 비교 및 사이클 성과에서 전략 type name을 렌더링한다', async () => {
    const user = userEvent.setup()
    fetchEitherMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/stats/summary')) return Promise.resolve(SUMMARY)
      if (url.startsWith('/api/stats/equity-curve')) return Promise.resolve(CURVE)
      if (url.startsWith('/api/stats/cycles')) {
        return Promise.resolve({
          items: [{
            cycleId: 'cycle-1',
            strategyType: 'INFINITE',
            ticker: 'SOXL',
            startDate: '2026-06-01',
            endDate: null,
            startAmount: 1000,
            endAmount: 1120,
            pnl: 120,
            returnRate: 0.12,
            durationDays: 9,
            closed: false,
          }],
          nextCursor: null,
          hasMore: false,
        })
      }
      return Promise.reject(new Error(`unexpected url: ${url}`))
    })

    renderWithClient(
      <StatsOverview defaultFrom="2026-04-17" defaultTo="2026-07-17" />,
      (client) => {
        client.setQueryData(statsKeys.summary(), SUMMARY)
        client.setQueryData(statsKeys.equityCurve('2026-04-17', '2026-07-17', 'ALL'), CURVE)
      },
    )
    expect(screen.getByText('총 실현손익')).toBeInTheDocument()
    expect(screen.queryByText('지수 대비 초과수익')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'SPY' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'QQQ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'QLD' })).not.toBeInTheDocument()
    expect(await screen.findAllByText('SOXL')).toHaveLength(2)
    const cycleTable = screen.getByRole('table', { name: '사이클 성과' })
    expect(cycleTable.parentElement).toHaveClass('hidden', 'sm:block')
    for (const header of ['전략', '종목', '기간', '손익', '수익률']) {
      expect(within(cycleTable).getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    expect(within(cycleTable).queryByRole('columnheader', { name: '소요일' })).not.toBeInTheDocument()
    expect(within(cycleTable).getByText('INFINITE')).toBeInTheDocument()
    const activeCycleRow = within(cycleTable).getByRole('row', { name: /INFINITE SOXL/ })
    expect(activeCycleRow.textContent?.match(/진행 중/g)).toHaveLength(1)

    const strategyTable = screen.getByRole('columnheader', { name: '사이클' }).closest('table')
    expect(strategyTable).not.toBeNull()
    if (!strategyTable) throw new Error('전략 유형 비교 table을 찾을 수 없습니다')
    expect(strategyTable.parentElement).toHaveClass('hidden', 'sm:block')
    expect(within(strategyTable).getByText('INFINITE')).toBeInTheDocument()
    expect(within(strategyTable).getByText('PRIVACY')).toBeInTheDocument()

    const cycleMobile = screen.getByRole('list', { name: '사이클 성과 모바일' })
    expect(cycleMobile).toHaveClass('sm:hidden')
    for (const label of ['손익', '수익률']) {
      expect(within(cycleMobile).getByText(label)).toBeInTheDocument()
    }
    expect(within(cycleMobile).queryByText('소요일')).not.toBeInTheDocument()
    expect(within(cycleMobile).getByText('INFINITE')).toBeInTheDocument()
    const activeCycleCard = within(cycleMobile).getByRole('listitem')
    expect(activeCycleCard.textContent?.match(/진행 중/g)).toHaveLength(1)

    const strategyMobile = screen.getByRole('list', { name: '전략 유형 비교 모바일' })
    expect(strategyMobile).toHaveClass('sm:hidden')
    for (const label of ['사이클', '평균 수익률', '평균 소요일', '실현손익', '미실현']) {
      expect(within(strategyMobile).getAllByText(label).length).toBeGreaterThan(0)
    }
    expect(within(strategyTable).queryByRole('columnheader', { name: '승률' })).not.toBeInTheDocument()
    expect(within(strategyMobile).queryByText('승률')).not.toBeInTheDocument()
    expect(within(strategyMobile).getByText('INFINITE')).toBeInTheDocument()
    expect(screen.queryByText('무한매수법')).not.toBeInTheDocument()

    const threeMonths = screen.getByRole('button', { name: '3M' })
    const oneMonth = screen.getByRole('button', { name: '1M' })
    expect(threeMonths).toHaveAttribute('aria-pressed', 'true')
    expect(oneMonth).toHaveAttribute('aria-pressed', 'false')
    await user.click(oneMonth)
    expect(threeMonths).toHaveAttribute('aria-pressed', 'false')
    expect(oneMonth).toHaveAttribute('aria-pressed', 'true')

    const infiniteStrategy = screen.getByRole('button', { name: 'INFINITE' })
    const strategyFilters = infiniteStrategy.parentElement
    expect(strategyFilters).not.toBeNull()
    if (!strategyFilters) throw new Error('전략 필터 컨테이너를 찾을 수 없습니다')
    const allStrategies = within(strategyFilters).getByRole('button', { name: '전체' })
    expect(allStrategies).toHaveAttribute('aria-pressed', 'true')
    expect(infiniteStrategy).toHaveAttribute('aria-pressed', 'false')
    await user.click(infiniteStrategy)
    expect(allStrategies).toHaveAttribute('aria-pressed', 'false')
    expect(infiniteStrategy).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => {
      expect(fetchEitherMock).toHaveBeenCalledWith(
        '/api/stats/equity-curve?from=2026-06-17&to=2026-07-17&type=INFINITE',
        { method: 'GET' },
        undefined,
      )
      expect(fetchEitherMock).toHaveBeenCalledWith(
        '/api/stats/cycles?type=INFINITE',
        { method: 'GET' },
        undefined,
      )
    })
    expect(within(strategyTable).getByText('PRIVACY')).toBeInTheDocument()
    expect(cycleTable.compareDocumentPosition(strategyTable) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('데이터가 없으면 empty state를 보여준다', () => {
    renderWithClient(
      <StatsOverview defaultFrom="2026-04-17" defaultTo="2026-07-17" />,
      (client) => {
        client.setQueryData(statsKeys.summary(), {
          totalRealizedPnl: 0, totalUnrealizedPnl: 0, activePrincipal: 0, byType: [],
        })
        client.setQueryData(statsKeys.equityCurve('2026-04-17', '2026-07-17', 'ALL'), { points: [] })
      },
    )
    expect(screen.getByText(/아직 기록된 사이클이 없습니다/)).toBeInTheDocument()
  })

  it('summary 조회 실패 시 KPI 슬롯에만 SectionError를 보여주고 전략비교 테이블은 생략한다', async () => {
    fetchEitherMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/stats/summary')) return Promise.reject(new Error('summary failed'))
      if (url.startsWith('/api/stats/equity-curve')) return Promise.resolve({ points: [] })
      if (url.startsWith('/api/stats/cycles')) return Promise.resolve({ items: [], nextCursor: null, hasMore: false })
      return Promise.reject(new Error(`unexpected url: ${url}`))
    })

    renderWithClient(
      <StatsOverview defaultFrom="2026-04-17" defaultTo="2026-07-17" />
    )

    await screen.findByText('통계를 불러오지 못했습니다')
    expect(screen.getAllByText('통계를 불러오지 못했습니다')).toHaveLength(1)
    expect(screen.queryByText('전략 유형 비교')).not.toBeInTheDocument()
  })

})

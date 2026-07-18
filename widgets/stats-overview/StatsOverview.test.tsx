import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatsOverview } from './StatsOverview'
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
  ],
}

const CURVE: EquityCurve = {
  points: [
    { date: '2026-06-01', totalAsset: 1000, principal: 1000 },
    { date: '2026-06-02', totalAsset: 1100, principal: 1000 },
  ],
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('StatsOverview', () => {
  beforeEach(() => {
    fetchEitherMock.mockReset()
  })

  it('KPI와 전략 비교 및 사이클 성과에서 전략 type name을 렌더링한다', async () => {
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
            endDate: '2026-06-10',
            startAmount: 1000,
            endAmount: 1120,
            pnl: 120,
            returnRate: 0.12,
            durationDays: 9,
            closed: true,
          }],
          nextCursor: null,
          hasMore: false,
        })
      }
      return Promise.reject(new Error(`unexpected url: ${url}`))
    })

    renderWithClient(
      <StatsOverview initialSummary={SUMMARY} initialCurve={CURVE}
        defaultFrom="2026-04-17" defaultTo="2026-07-17" />
    )
    expect(screen.getByText('총 실현손익')).toBeInTheDocument()
    expect(screen.queryByText('지수 대비 초과수익')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'SPY' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'QQQ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'QLD' })).not.toBeInTheDocument()
    await screen.findByText('SOXL')
    const cycleTable = screen.getByRole('table', { name: '사이클 성과' })
    expect(cycleTable.parentElement).toHaveClass('hidden', 'sm:block')
    expect(within(cycleTable).getByRole('columnheader', { name: '종목' })).toBeInTheDocument()
    expect(within(cycleTable).getByRole('columnheader', { name: '기간' })).toBeInTheDocument()
    expect(within(cycleTable).getByText('INFINITE')).toBeInTheDocument()

    const strategyTable = screen.getByRole('columnheader', { name: '사이클' }).closest('table')
    expect(strategyTable).not.toBeNull()
    if (!strategyTable) throw new Error('전략 유형 비교 table을 찾을 수 없습니다')
    expect(strategyTable.parentElement).toHaveClass('hidden', 'sm:block')
    expect(within(strategyTable).getByText('INFINITE')).toBeInTheDocument()

    const cycleMobile = screen.getByRole('list', { name: '사이클 성과 모바일' })
    expect(cycleMobile).toHaveClass('sm:hidden')
    expect(within(cycleMobile).getByText('손익')).toBeInTheDocument()
    expect(within(cycleMobile).getByText('수익률')).toBeInTheDocument()
    expect(within(cycleMobile).getByText('소요일')).toBeInTheDocument()
    expect(within(cycleMobile).getByText('INFINITE')).toBeInTheDocument()

    const strategyMobile = screen.getByRole('list', { name: '전략 유형 비교 모바일' })
    expect(strategyMobile).toHaveClass('sm:hidden')
    expect(within(strategyMobile).getByText('승률')).toBeInTheDocument()
    expect(within(strategyMobile).getByText('INFINITE')).toBeInTheDocument()
    expect(screen.queryByText('무한매수법')).not.toBeInTheDocument()
  })

  it('데이터가 없으면 empty state를 보여준다', () => {
    renderWithClient(
      <StatsOverview
        initialSummary={{ totalRealizedPnl: 0, totalUnrealizedPnl: 0, activePrincipal: 0, byType: [] }}
        initialCurve={{ points: [] }}
        defaultFrom="2026-04-17" defaultTo="2026-07-17" />
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
      <StatsOverview initialCurve={CURVE} defaultFrom="2026-04-17" defaultTo="2026-07-17" />
    )

    await screen.findByText('통계를 불러오지 못했습니다')
    expect(screen.getAllByText('통계를 불러오지 못했습니다')).toHaveLength(1)
    expect(screen.queryByText('전략 유형 비교')).not.toBeInTheDocument()
  })
})

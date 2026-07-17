import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  benchmark: [{ date: '2026-06-01', close: 500 }],
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('StatsOverview', () => {
  beforeEach(() => {
    fetchEitherMock.mockReset()
  })

  it('KPI와 전략 비교 테이블을 렌더링한다', () => {
    renderWithClient(
      <StatsOverview initialSummary={SUMMARY} initialCurve={CURVE}
        defaultFrom="2026-04-17" defaultTo="2026-07-17" />
    )
    expect(screen.getByText('총 실현손익')).toBeInTheDocument()
    expect(screen.getByText('무한매수법')).toBeInTheDocument()
  })

  it('데이터가 없으면 empty state를 보여준다', () => {
    renderWithClient(
      <StatsOverview
        initialSummary={{ totalRealizedPnl: 0, totalUnrealizedPnl: 0, activePrincipal: 0, byType: [] }}
        initialCurve={{ points: [], benchmark: [] }}
        defaultFrom="2026-04-17" defaultTo="2026-07-17" />
    )
    expect(screen.getByText(/아직 기록된 사이클이 없습니다/)).toBeInTheDocument()
  })

  it('summary 조회 실패 시 KPI 슬롯에만 SectionError를 보여주고 전략비교 테이블은 생략한다', async () => {
    fetchEitherMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/stats/summary')) return Promise.reject(new Error('summary failed'))
      if (url.startsWith('/api/stats/equity-curve')) return Promise.resolve({ points: [], benchmark: [] })
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

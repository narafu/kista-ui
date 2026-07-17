import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatsOverview } from './StatsOverview'
import type { EquityCurve, StatsSummary } from '@entities/stats'

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
})

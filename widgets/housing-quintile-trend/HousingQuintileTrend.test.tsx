import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { HousingBenchmarkRegionsList, HousingBenchmarkSeries } from '@entities/stats'
import { HousingQuintileTrend } from './HousingQuintileTrend'

const { useHousingBenchmarkSeriesQueryMock, useHousingBenchmarkRegionsQueryMock } = vi.hoisted(() => ({
  useHousingBenchmarkSeriesQueryMock: vi.fn(),
  useHousingBenchmarkRegionsQueryMock: vi.fn(),
}))

vi.mock('@entities/stats', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/stats')>()
  return {
    ...actual,
    useHousingBenchmarkSeriesQuery: useHousingBenchmarkSeriesQueryMock,
    useHousingBenchmarkRegionsQuery: useHousingBenchmarkRegionsQueryMock,
  }
})

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}))

const SERIES: HousingBenchmarkSeries = { points: [] }
const REGIONS: HousingBenchmarkRegionsList = {
  regions: [
    { code: '1100000000', name: '서울' },
    { code: '4100000000', name: '수도권' },
  ],
}

describe('HousingQuintileTrend', () => {
  it('차트에서 지역을 변경하면 아래 안내 섹션의 지역명도 함께 바뀐다', async () => {
    const user = userEvent.setup()
    useHousingBenchmarkSeriesQueryMock.mockReturnValue({ data: SERIES, isLoading: false, isError: false })
    useHousingBenchmarkRegionsQueryMock.mockReturnValue({ data: REGIONS, isLoading: false, isError: false })

    render(<HousingQuintileTrend enabled />)

    expect(screen.getByText('서울 아파트 5분위 안내')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('비교 지역'), '4100000000')

    expect(screen.getByText('수도권 아파트 5분위 안내')).toBeInTheDocument()
  })
})

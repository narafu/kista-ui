import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { HousingBenchmarkRegionsList, HousingBenchmarkSeries } from '@entities/stats'
import { HousingBenchmarkQuintileTrendChart } from './HousingBenchmarkQuintileTrendChart'

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
  LineChart: ({ children, data }: { children: ReactNode; data: unknown[] }) => (
    <div data-testid="housing-benchmark-quintile-trend-chart" data-points={JSON.stringify(data)}>{children}</div>
  ),
  Line: ({ dataKey, name, stroke }: { dataKey: string; name: string; stroke: string }) => (
    <span data-stroke={stroke}>{name}: {dataKey}</span>
  ),
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}))

const SERIES: HousingBenchmarkSeries = {
  points: [
    {
      baseMonth: '2021-07-01',
      firstQuintilePrice: 30000,
      secondQuintilePrice: 60000,
      thirdQuintilePrice: 90000,
      fourthQuintilePrice: 150000,
      fifthQuintilePrice: 344468.13,
    },
    {
      baseMonth: '2026-07-01',
      firstQuintilePrice: 35000,
      secondQuintilePrice: 70000,
      thirdQuintilePrice: 100000,
      fourthQuintilePrice: 170000,
      fifthQuintilePrice: 400000,
    },
  ],
  sourceUpdatedDate: '2026-07-01',
}

const REGIONS: HousingBenchmarkRegionsList = {
  regions: [
    { code: '1100000000', name: '서울' },
    { code: '2600000000', name: '부산' },
    { code: '4100000000', name: '수도권' },
    { code: '0000000000', name: '전국' },
  ],
}

function mockSeriesQuery(data: HousingBenchmarkSeries | undefined = SERIES, overrides = {}) {
  useHousingBenchmarkSeriesQueryMock.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    ...overrides,
  })
}

function mockRegionsQuery(data: HousingBenchmarkRegionsList | undefined = REGIONS, overrides = {}) {
  useHousingBenchmarkRegionsQueryMock.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    ...overrides,
  })
}

describe('HousingBenchmarkQuintileTrendChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSeriesQuery()
    mockRegionsQuery()
  })

  it('로딩 중에는 skeleton을 표시한다', () => {
    // mockSeriesQuery의 data 파라미터는 default parameter라 명시적 undefined 전달 시 SERIES로 대체되므로 직접 mockReturnValue 사용
    useHousingBenchmarkSeriesQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<HousingBenchmarkQuintileTrendChart enabled quintile={3} />)

    expect(screen.getByTestId('housing-benchmark-quintile-trend-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('housing-benchmark-quintile-trend-chart')).not.toBeInTheDocument()
  })

  it('오류 시 SectionError를 alert로 표시한다', () => {
    useHousingBenchmarkSeriesQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<HousingBenchmarkQuintileTrendChart enabled quintile={3} />)

    expect(screen.getByRole('alert')).toHaveTextContent('서울 아파트 3분위 시세를 불러오지 못했습니다')
  })

  it('points가 비어있으면 EmptyState를 표시한다', () => {
    mockSeriesQuery({ points: [], sourceUpdatedDate: '2026-07-01' })
    render(<HousingBenchmarkQuintileTrendChart enabled quintile={3} />)

    expect(screen.getByText('표시할 서울 아파트 시세 데이터가 없습니다.')).toBeInTheDocument()
  })

  it('선택한 분위 하나만 라인과 범례로 렌더링하고, 상위에서 받은 기간으로 조회한다', () => {
    render(<HousingBenchmarkQuintileTrendChart enabled quintile={3} from="2021-07-19" to="2026-07-19" />)

    expect(useHousingBenchmarkSeriesQueryMock).toHaveBeenCalledWith(
      { from: '2021-07-19', to: '2026-07-19', regionCode: '1100000000' },
      true,
    )
    expect(screen.getByTestId('housing-benchmark-quintile-trend-chart')).toHaveAttribute(
      'data-points',
      JSON.stringify(SERIES.points),
    )
    expect(screen.getAllByText(/^3분위/).length).toBeGreaterThan(0)
    for (const label of ['1분위', '2분위', '4분위', '5분위']) {
      expect(screen.queryByText(new RegExp(`^${label}`))).not.toBeInTheDocument()
    }
    expect(screen.getByText(/데이터 출처: KB부동산.*3분위/)).toBeInTheDocument()
  })

  it('quintile prop이 바뀌면 표시되는 분위 라인도 바뀐다', () => {
    const { rerender } = render(<HousingBenchmarkQuintileTrendChart enabled quintile={1} />)
    expect(screen.getAllByText(/^1분위/).length).toBeGreaterThan(0)

    rerender(<HousingBenchmarkQuintileTrendChart enabled quintile={5} />)
    expect(screen.queryByText(/^1분위/)).not.toBeInTheDocument()
    expect(screen.getAllByText(/^5분위/).length).toBeGreaterThan(0)
  })

  it('지역 드롭다운에서 다른 지역을 선택하면 해당 regionCode로 시계열을 재조회한다', async () => {
    const user = userEvent.setup()
    render(<HousingBenchmarkQuintileTrendChart enabled quintile={3} from="2021-07-19" to="2026-07-19" />)

    await user.selectOptions(screen.getByLabelText('비교 지역'), '0000000000')

    expect(useHousingBenchmarkSeriesQueryMock).toHaveBeenLastCalledWith(
      { from: '2021-07-19', to: '2026-07-19', regionCode: '0000000000' },
      true,
    )
    expect(screen.getByLabelText('비교 지역')).toHaveValue('0000000000')
    expect(screen.getByLabelText(/전국 아파트 3분위 월별 매매평균가격 선 차트/)).toBeInTheDocument()
  })

  it('비교 지역 옵션을 서울/수도권/전국 순서로만 표시하고, 그 외 지역(부산 등)은 제외한다', () => {
    render(<HousingBenchmarkQuintileTrendChart enabled quintile={3} />)

    const select = screen.getByLabelText('비교 지역') as HTMLSelectElement
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual(['서울', '수도권', '전국'])
    expect(screen.queryByRole('option', { name: '부산' })).not.toBeInTheDocument()
  })

  it('지역이 선택되면 상위로 onRegionChange 콜백을 호출한다', async () => {
    const user = userEvent.setup()
    const onRegionChange = vi.fn()
    render(<HousingBenchmarkQuintileTrendChart enabled quintile={3} onRegionChange={onRegionChange} />)

    expect(onRegionChange).toHaveBeenLastCalledWith({ code: '1100000000', name: '서울' })

    await user.selectOptions(screen.getByLabelText('비교 지역'), '4100000000')

    expect(onRegionChange).toHaveBeenLastCalledWith({ code: '4100000000', name: '수도권' })
  })

  it('지역 목록 조회 실패 시 서울 하나만 fallback으로 표시한다', () => {
    useHousingBenchmarkRegionsQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<HousingBenchmarkQuintileTrendChart enabled quintile={3} />)

    const select = screen.getByLabelText('비교 지역') as HTMLSelectElement
    expect(select.options).toHaveLength(1)
    expect(select.options[0]).toHaveTextContent('서울')
  })
})

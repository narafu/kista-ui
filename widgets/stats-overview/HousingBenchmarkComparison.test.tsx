import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { HousingBenchmarkComparison as HousingBenchmarkComparisonData } from '@entities/stats'
import { HousingBenchmarkComparison } from './HousingBenchmarkComparison'

const { useHousingBenchmarkQueryMock, useAllStrategiesQueryMock } = vi.hoisted(() => ({
  useHousingBenchmarkQueryMock: vi.fn(),
  useAllStrategiesQueryMock: vi.fn(),
}))

vi.mock('@entities/stats', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/stats')>()
  return { ...actual, useHousingBenchmarkQuery: useHousingBenchmarkQueryMock }
})

vi.mock('@entities/strategy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/strategy')>()
  return { ...actual, useAllStrategiesQuery: useAllStrategiesQueryMock }
})

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  LineChart: ({ children, data }: { children: ReactNode; data: unknown[] }) => (
    <div data-testid="housing-benchmark-chart" data-points={JSON.stringify(data)}>{children}</div>
  ),
  Line: ({ dataKey, name }: { dataKey: string; name: string }) => (
    <span>{name}: {dataKey}</span>
  ),
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}))

const COMPARISON: HousingBenchmarkComparisonData = {
  scope: 'PORTFOLIO',
  strategy: null,
  benchmark: {
    regionCode: '1100000000',
    regionName: '서울',
    quintile: 3,
    label: '서울 아파트 3분위',
    sourceUpdatedDate: '2026-07-01',
  },
  period: {
    fromMonth: '2021-07-01',
    toMonth: '2026-07-01',
    monthCount: 61,
  },
  summary: {
    investmentCumulativeReturn: 0.842,
    benchmarkCumulativeReturn: 0.517,
    excessReturn: 0.325,
    investmentAnnualizedReturn: 0.127,
    benchmarkAnnualizedReturn: 0.088,
    investmentMaxDrawdown: -0.184,
    benchmarkMaxDrawdown: -0.032,
  },
  points: [
    {
      baseMonth: '2021-07-01',
      investmentIndexUsd: 100,
      benchmarkIndex: 100,
      investmentMonthlyReturn: null,
      benchmarkMonthlyReturn: null,
    },
    {
      baseMonth: '2026-07-01',
      investmentIndexUsd: 184.2,
      benchmarkIndex: 151.7,
      investmentMonthlyReturn: 0.031,
      benchmarkMonthlyReturn: -0.004,
    },
  ],
  currentExchangeRate: {
    midRate: 1365.2,
    fetchedAt: '2026-07-19T01:30:00Z',
    source: 'TOSS_INVEST',
  },
  quality: {
    method: 'ESTIMATED_TIME_WEIGHTED_RETURN',
    investmentCurrency: 'USD',
    benchmarkCurrency: 'KRW',
    notice: '전략 운용 기록 기반 근사치',
  },
  emptyReason: null,
}

const FIFTH_QUINTILE_COMPARISON: HousingBenchmarkComparisonData = {
  ...COMPARISON,
  benchmark: {
    ...COMPARISON.benchmark,
    quintile: 5,
    label: '서울 아파트 5분위',
  },
}

const STRATEGIES = [
  {
    id: 'strategy-1', accountId: 'account-1', type: 'INFINITE', status: 'ACTIVE',
    ticker: 'SOXL', cycleSeedType: 'NONE' as const, isReverseMode: false,
  },
  {
    id: 'strategy-2', accountId: 'account-1', type: 'VR', status: 'ACTIVE',
    ticker: 'TQQQ', cycleSeedType: 'NONE' as const, isReverseMode: false,
  },
]

function mockQuery(data: HousingBenchmarkComparisonData | undefined = COMPARISON, overrides = {}) {
  useHousingBenchmarkQueryMock.mockReturnValue({
    data,
    isLoading: false,
    isFetching: false,
    isError: false,
    ...overrides,
  })
}

describe('HousingBenchmarkComparison', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAllStrategiesQueryMock.mockReturnValue({ data: STRATEGIES, isLoading: false })
    mockQuery()
  })

  it('기본 포트폴리오·3분위·5년 비교와 서버 지수 및 장기 요약을 표시한다', () => {
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'PORTFOLIO',
      quintile: 3,
      from: '2021-07-17',
      to: '2026-07-17',
    }, true)
    expect(screen.getByRole('button', { name: '전체 포트폴리오' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '5년' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('서울 아파트 분위')).toHaveValue('3')

    expect(screen.getByText('+32.5%p')).toBeInTheDocument()
    expect(screen.getByText('+84.2%')).toBeInTheDocument()
    expect(screen.getByText('+51.7%')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: '장기 성과 지표 비교' })).toBeInTheDocument()
    expect(screen.getByText('전체 포트폴리오 (USD): investmentIndexUsd')).toBeInTheDocument()
    expect(screen.getByText('서울 아파트 3분위 (KRW): benchmarkIndex')).toBeInTheDocument()
    expect(screen.getByTestId('housing-benchmark-chart')).toHaveAttribute(
      'data-points',
      JSON.stringify(COMPARISON.points),
    )
  })

  it('전략 범위와 전략·분위·기간 필터를 요청에 반영한다', async () => {
    const user = userEvent.setup()
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.queryByLabelText('전략')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '개별 전략' }))

    const strategySelect = screen.getByLabelText('전략')
    expect(strategySelect).toHaveValue('strategy-1')
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({
      scope: 'STRATEGY', strategyId: 'strategy-1',
    }), true)

    await user.selectOptions(strategySelect, 'strategy-2')
    await user.selectOptions(screen.getByLabelText('서울 아파트 분위'), '5')
    await user.click(screen.getByRole('button', { name: '1년' }))

    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'STRATEGY',
      strategyId: 'strategy-2',
      quintile: 5,
      from: '2025-07-17',
      to: '2026-07-17',
    }, true)

    await user.click(screen.getByRole('button', { name: '전체' }))
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'STRATEGY',
      strategyId: 'strategy-2',
      quintile: 5,
      to: '2026-07-17',
    }, true)
  })

  it('다섯 분위의 대표 지역·특징·예시와 비고정 구성 면책을 제공한다', async () => {
    const user = userEvent.setup()
    let queryData = COMPARISON
    useHousingBenchmarkQueryMock.mockImplementation(() => ({
      data: queryData,
      isLoading: false,
      isFetching: false,
      isError: false,
      isPlaceholderData: false,
    }))
    const { rerender } = render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)
    const select = screen.getByLabelText('서울 아파트 분위')

    const expected = [
      {
        value: '1',
        range: '서울 아파트 가격 하위 20%',
        areas: '노원구, 도봉구, 강북구, 구로구, 금천구, 중랑구',
        characteristic: '서울 외곽 지역에 위치한 구축(20~30년 차 이상) 및 소형 평수 아파트가 주를 이룹니다. 자금 여력이 상대적으로 적은 사회초년생이나 1인 가구의 첫 내 집 마련 수요가 집중되는 구간입니다.',
        example: '노원구 상계주공(소형), 도봉구 창동 주공, 중랑구 신내 주공 등',
      },
      {
        value: '2',
        range: '서울 아파트 가격 하위 20% ~ 40%',
        areas: '관악구, 은평구, 성북구, 강서구, 동대문구',
        characteristic: '서울 중심부로의 대중교통 접근성이 양호한 외곽 지역이나, 1분위 지역 내의 신축·준신축 아파트들이 혼재되어 있는 구간입니다.',
        example: '은평뉴타운 대단지, 관악구 관악드림타운, 강서구 가양·등촌동 일대 구축 아파트 등',
      },
      {
        value: '3',
        range: '서울 아파트 가격 중간 40% ~ 60%',
        areas: '광진구, 서대문구, 영등포구, 종로구, 중구',
        characteristic: "서울 아파트의 '중간 허리'를 담당하는 구간입니다. 도심(CBD)이나 강남(GBD) 접근성이 좋은 직주근접 지역들이 주를 이룹니다. 광진구 구의동이나 자양동 일대의 기축 아파트(전용 84㎡) 혹은 입지 좋은 곳의 신축 소형(59㎡) 평수들이 이 구간에 포진해 있습니다.",
        example: '광진구 구의현대, 영등포구 당산 래미안, 서대문구 가재울 뉴타운 일대 아파트 등',
      },
      {
        value: '4',
        range: '서울 아파트 가격 상위 20% ~ 40%',
        areas: '마포구, 성동구, 양천구, 동작구, 강동구',
        characteristic: "이른바 '마용성(마포·용산·성동)' 중 용산을 제외한 지역들과 학군지(목동) 등이 포함됩니다. 5분위 진입을 노리는 갈아타기 수요나 '똘똘한 한 채' 수요가 집중되는 상급지입니다.",
        example: '마포구 마포래미안푸르지오(마래푸), 성동구 옥수·금호동 일대 신축, 강동구 고덕 그라시움 등',
      },
      {
        value: '5',
        range: '서울 아파트 가격 상위 20%',
        areas: '서초구, 강남구, 송파구, 용산구',
        characteristic: '대한민국 부동산 최상급지입니다. 초고가 하이엔드 주거지나 재건축 기대감이 높은 한강변 대단지 아파트들이 속하며, 최근 서울 아파트 평균 가격 상승을 강하게 주도하고 있는 구간입니다.',
        example: '서초구 래미안 원베일리, 아크로리버파크, 강남구 압구정 현대아파트, 송파구 잠실 엘스·리센츠 등',
      },
    ]

    for (const [index, item] of expected.entries()) {
      await user.selectOptions(select, item.value)
      queryData = {
        ...COMPARISON,
        benchmark: {
          ...COMPARISON.benchmark,
          quintile: Number(item.value),
          label: `서울 아파트 ${item.value}분위`,
        },
      }
      rerender(
        <HousingBenchmarkComparison
          enabled
          defaultTo={`2026-07-${String(18 + index).padStart(2, '0')}`}
        />
      )
      expect(screen.getAllByText(item.range).length).toBeGreaterThan(0)
      expect(screen.getByText(item.areas)).toBeInTheDocument()
      expect(screen.getByText(item.characteristic)).toBeInTheDocument()
      expect(screen.getByText(item.example, { exact: false })).toBeInTheDocument()
    }

    expect(screen.getByText(/해당 가격대에서 자주 언급되는 지역·단지 예시/)).toBeInTheDocument()
    expect(screen.getByText(/특정 지역이나 단지가 하나의 분위에 고정적으로 포함되는 것은 아닙니다/)).toBeInTheDocument()
  })

  it('현지 통화 기준과 데이터 업데이트일 및 현재 환율 참고값을 표시한다', () => {
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.getByText('투자 성과는 USD, 서울 아파트는 KRW 현지 통화 기준이며 현재 환율은 성과 계산에 반영하지 않습니다.')).toBeInTheDocument()
    expect(screen.getByText('전략 운용 기록 기반 근사치')).toBeInTheDocument()
    expect(screen.getByText('2026-07-01')).toBeInTheDocument()
    expect(screen.getByText('1 USD = 1,365.20 KRW')).toBeInTheDocument()
    expect(screen.getByText(/TOSS_INVEST/)).toBeInTheDocument()
  })

  it('분위 변경 중에는 이전 응답을 숨기고 명확한 갱신 상태를 표시한다', async () => {
    const user = userEvent.setup()
    let fifthQuintileResult = {
      data: COMPARISON,
      isLoading: false,
      isFetching: true,
      isError: false,
      isPlaceholderData: true,
    }
    useHousingBenchmarkQueryMock.mockImplementation((params: { quintile: number }) => (
      params.quintile === 5
        ? fifthQuintileResult
        : {
            data: COMPARISON,
            isLoading: false,
            isFetching: false,
            isError: false,
            isPlaceholderData: false,
          }
    ))
    const { rerender } = render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    await user.selectOptions(screen.getByLabelText('서울 아파트 분위'), '5')

    expect(screen.getByLabelText('서울 아파트 분위')).toHaveValue('5')
    expect(screen.getByRole('status')).toHaveTextContent('새 조건의 벤치마크 비교를 불러오는 중')
    expect(screen.queryByText('서울 3분위 안내')).not.toBeInTheDocument()
    expect(screen.queryByText('서울 5분위 안내')).not.toBeInTheDocument()
    expect(screen.queryByTestId('housing-benchmark-chart')).not.toBeInTheDocument()
    expect(screen.queryByText('+32.5%p')).not.toBeInTheDocument()

    fifthQuintileResult = {
      data: FIFTH_QUINTILE_COMPARISON,
      isLoading: false,
      isFetching: false,
      isError: false,
      isPlaceholderData: false,
    }
    rerender(<HousingBenchmarkComparison enabled defaultTo="2026-07-18" />)

    expect(screen.getByText('서울 5분위 안내')).toBeInTheDocument()
    expect(screen.queryByText('서울 3분위 안내')).not.toBeInTheDocument()
  })

  it('개별 전략 범위에서 전략 목록 로딩을 Skeleton으로 표시한다', async () => {
    const user = userEvent.setup()
    useAllStrategiesQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    await user.click(screen.getByRole('button', { name: '개별 전략' }))

    expect(screen.getByRole('status')).toHaveAccessibleName('전략 목록 불러오는 중')
    expect(screen.queryByText('비교할 개별 전략이 없습니다.')).not.toBeInTheDocument()
  })

  it('개별 전략 범위에서 전략 목록 오류를 alert로 표시한다', async () => {
    const user = userEvent.setup()
    useAllStrategiesQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    await user.click(screen.getByRole('button', { name: '개별 전략' }))

    expect(screen.getByRole('alert')).toHaveTextContent('전략 목록을 불러오지 못했습니다')
    expect(screen.queryByText('비교할 개별 전략이 없습니다.')).not.toBeInTheDocument()
  })

  it('개별 전략 범위에서 실제 빈 전략 목록을 EmptyState로 표시한다', async () => {
    const user = userEvent.setup()
    useAllStrategiesQueryMock.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    await user.click(screen.getByRole('button', { name: '개별 전략' }))

    expect(screen.getByRole('status')).toHaveTextContent('비교할 개별 전략이 없습니다.')
    expect(screen.queryByLabelText('전략 목록 불러오는 중')).not.toBeInTheDocument()
  })

  it('윤년 2월 29일에서 연도를 빼도 2월을 유지하고 유효한 말일로 보정한다', async () => {
    const user = userEvent.setup()
    render(<HousingBenchmarkComparison enabled defaultTo="2024-02-29" />)

    await user.click(screen.getByRole('button', { name: '1년' }))

    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'PORTFOLIO',
      quintile: 3,
      from: '2023-02-28',
      to: '2024-02-29',
    }, true)
  })

  it('현재 환율이 null이어도 차트·요약·비교표를 유지한다', () => {
    mockQuery({ ...COMPARISON, currentExchangeRate: null })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.getByTestId('housing-benchmark-chart')).toBeInTheDocument()
    expect(screen.getByText('+32.5%p')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: '장기 성과 지표 비교' })).toBeInTheDocument()
    expect(screen.queryByText(/1 USD =/)).not.toBeInTheDocument()
    expect(screen.queryByText(/환율.*불러오지 못/)).not.toBeInTheDocument()
  })

  it('빈 사유와 비교 섹션 오류를 각각 처리한다', () => {
    mockQuery({ ...COMPARISON, summary: null, points: [], emptyReason: 'NO_INVESTMENT_DATA' })
    const { unmount } = render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)
    expect(screen.getByText('선택한 기간에 전략 운용 기록이 없습니다.')).toBeInTheDocument()

    unmount()
    useHousingBenchmarkQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
    })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)
    expect(screen.getByRole('alert')).toHaveTextContent('벤치마크 비교를 불러오지 못했습니다')
    expect(screen.queryByText('총 실현손익')).not.toBeInTheDocument()
  })

  it('최초 로딩 중 차트 높이를 보존하는 상태를 표시한다', () => {
    mockQuery(undefined, { isLoading: true, isFetching: true })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.getByLabelText('벤치마크 비교 불러오는 중')).toBeInTheDocument()
    expect(screen.getByTestId('housing-benchmark-chart-skeleton')).toHaveClass('min-h-[240px]')
  })
})

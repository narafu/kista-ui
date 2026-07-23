import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { HousingBenchmark, HousingBenchmarkComparison as HousingBenchmarkComparisonData } from '@entities/stats'
import { HousingBenchmarkComparison } from './HousingBenchmarkComparison'

const { useHousingBenchmarkQueryMock, useAllStrategiesQueryMock, useRuntimeConfigQueryMock } = vi.hoisted(() => ({
  useHousingBenchmarkQueryMock: vi.fn(),
  useAllStrategiesQueryMock: vi.fn(),
  useRuntimeConfigQueryMock: vi.fn(),
}))

const API_QUALITY_NOTICE =
  '전략 운용 기록 기반 근사치입니다. 투자 성과는 USD, 서울 아파트는 KRW 현지 통화 기준이며 현재 환율은 성과 계산에 반영하지 않습니다.'

vi.mock('@entities/stats', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/stats')>()
  return { ...actual, useHousingBenchmarkQuery: useHousingBenchmarkQueryMock }
})

vi.mock('@entities/strategy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/strategy')>()
  return { ...actual, useAllStrategiesQuery: useAllStrategiesQueryMock }
})

vi.mock('@entities/runtime-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/runtime-config')>()
  return { ...actual, useRuntimeConfigQuery: useRuntimeConfigQueryMock }
})

vi.mock('./HousingBenchmarkQuintileTrendChart', () => ({
  HousingBenchmarkQuintileTrendChart: () => <div data-testid="housing-benchmark-quintile-trend-chart-stub" />,
}))

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

const HOUSING_BENCHMARK: HousingBenchmark = {
  assetType: 'HOUSING',
  regionCode: '1100000000',
  regionName: '서울',
  quintile: 3,
  symbol: null,
  label: '서울 아파트 3분위',
  sourceUpdatedDate: '2026-07-01',
}

const COMPARISON: HousingBenchmarkComparisonData = {
  scope: 'PORTFOLIO',
  strategy: null,
  benchmark: HOUSING_BENCHMARK,
  period: {
    fromDate: '2021-07-01',
    toDate: '2026-07-01',
    pointCount: 61,
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
      baseDate: '2021-07-01',
      investmentIndexUsd: 100,
      benchmarkIndex: 100,
      investmentPeriodReturn: null,
      benchmarkPeriodReturn: null,
    },
    {
      baseDate: '2026-07-01',
      investmentIndexUsd: 184.2,
      benchmarkIndex: 151.7,
      investmentPeriodReturn: 0.031,
      benchmarkPeriodReturn: -0.004,
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
    notice: API_QUALITY_NOTICE,
  },
  emptyReason: null,
}

const STRATEGY_COMPARISON: HousingBenchmarkComparisonData = {
  ...COMPARISON,
  scope: 'STRATEGY',
  strategy: {
    id: 'strategy-1',
    type: 'INFINITE',
    ticker: 'SOXL',
  },
}

const FIFTH_QUINTILE_STRATEGY_COMPARISON: HousingBenchmarkComparisonData = {
  ...STRATEGY_COMPARISON,
  benchmark: {
    ...HOUSING_BENCHMARK,
    quintile: 5,
    label: '서울 아파트 5분위',
  },
}

const QLD_STRATEGY_COMPARISON: HousingBenchmarkComparisonData = {
  ...STRATEGY_COMPARISON,
  benchmark: {
    assetType: 'ETF',
    regionCode: null,
    regionName: null,
    quintile: null,
    symbol: 'QLD',
    label: 'QLD (ProShares Ultra QQQ (2x 레버리지))',
    sourceUpdatedDate: '2026-07-01',
  },
  quality: {
    method: 'ESTIMATED_TIME_WEIGHTED_RETURN',
    investmentCurrency: 'USD',
    benchmarkCurrency: 'USD',
    notice: '전략 운용 기록 기반 근사치입니다. 투자와 ETF 벤치마크 모두 USD 기준이며 환율 변수가 없습니다.',
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
    useRuntimeConfigQueryMock.mockReturnValue({ data: undefined })
    mockQuery()
  })

  it('기본 렌더링은 ETF 탭·3개월 기간이 활성화된다', () => {
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'PORTFOLIO',
      benchmarkType: 'ETF',
      symbol: 'SPY',
      from: '2026-04-17',
      to: '2026-07-17',
    }, true)
    expect(screen.getByRole('button', { name: 'ETF' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '3개월' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('아파트 탭에서 포트폴리오·3분위·1년 비교와 서버 지수 및 장기 요약을 표시한다', async () => {
    const user = userEvent.setup()
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    await user.click(screen.getByRole('button', { name: '아파트' }))

    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'PORTFOLIO',
      benchmarkType: 'HOUSING',
      quintile: 3,
      from: '2025-07-17',
      to: '2026-07-17',
    }, true)
    expect(screen.getByRole('button', { name: '전체 포트폴리오' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '1년' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('벤치마크 자산')).toHaveValue('3')

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
    await user.click(screen.getByRole('button', { name: '아파트' }))

    expect(screen.queryByLabelText('전략')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '개별 전략' }))

    const strategySelect = screen.getByLabelText('전략')
    expect(strategySelect).toHaveValue('strategy-1')
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({
      scope: 'STRATEGY', strategyId: 'strategy-1',
    }), true)

    await user.selectOptions(strategySelect, 'strategy-2')
    await user.selectOptions(screen.getByLabelText('벤치마크 자산'), '5')
    await user.click(screen.getByRole('button', { name: '1년' }))

    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'STRATEGY',
      strategyId: 'strategy-2',
      benchmarkType: 'HOUSING',
      quintile: 5,
      from: '2025-07-17',
      to: '2026-07-17',
    }, true)

    await user.click(screen.getByRole('button', { name: '전체' }))
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'STRATEGY',
      strategyId: 'strategy-2',
      benchmarkType: 'HOUSING',
      quintile: 5,
      to: '2026-07-17',
    }, true)
  })

  it('ETF 탭에서 ETF 옵션을 선택하면 훅에 benchmarkType·symbol을 반영해 요청한다', async () => {
    const user = userEvent.setup()
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    await user.selectOptions(screen.getByLabelText('벤치마크 자산'), 'QLD')

    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'PORTFOLIO',
      benchmarkType: 'ETF',
      symbol: 'QLD',
      from: '2026-04-17',
      to: '2026-07-17',
    }, true)
  })

  it('runtime config의 ETF 기본값과 목록으로 벤치마크 자산을 렌더링한다', async () => {
    const user = userEvent.setup()
    useRuntimeConfigQueryMock.mockReturnValue({
      data: {
        benchmarks: { etf: { allowedValues: ['QQQ', 'IBIT'], defaultValue: 'IBIT' } },
      },
    })

    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'PORTFOLIO',
      benchmarkType: 'ETF',
      symbol: 'IBIT',
      from: '2026-04-17',
      to: '2026-07-17',
    }, true)
    expect(screen.getByLabelText('벤치마크 자산')).toHaveValue('IBIT')
    expect(screen.queryByRole('option', { name: /SPY/ })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('벤치마크 자산'), 'QQQ')
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({
      benchmarkType: 'ETF',
      symbol: 'QQQ',
    }), true)
  })

  it('runtime config가 로딩 후 새 ETF 기본값으로 응답하면 아직 직접 선택하지 않은 선택값을 갱신한다', () => {
    useRuntimeConfigQueryMock.mockReturnValue({ data: undefined })
    const { rerender } = render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)
    expect(screen.getByLabelText('벤치마크 자산')).toHaveValue('SPY')

    useRuntimeConfigQueryMock.mockReturnValue({
      data: {
        benchmarks: { etf: { allowedValues: ['SPY', 'QQQ', 'QLD', 'IBIT', 'ETHA'], defaultValue: 'QQQ' } },
      },
    })
    rerender(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.getByLabelText('벤치마크 자산')).toHaveValue('QQQ')
  })

  it('runtime config에만 있는 ETF 심볼도 일반 ETF 옵션으로 표시한다', () => {
    useRuntimeConfigQueryMock.mockReturnValue({
      data: {
        benchmarks: { etf: { allowedValues: ['VOO'], defaultValue: 'VOO' } },
      },
    })

    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.getByRole('option', { name: 'VOO (사용자 설정 ETF)' })).toBeInTheDocument()
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({
      benchmarkType: 'ETF',
      symbol: 'VOO',
    }), true)
  })

  it('부동산(서울 분위) 선택 시에는 안내 박스를 표시하지 않는다 — 가격 추이 아래 지역별 안내로 이동', async () => {
    const user = userEvent.setup()
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)
    await user.click(screen.getByRole('button', { name: '아파트' }))

    expect(screen.queryByText('서울 3분위 안내')).not.toBeInTheDocument()
    expect(screen.queryByText(API_QUALITY_NOTICE)).not.toBeInTheDocument()
  })

  it('가격 추이 아래에 기본 지역(서울) 1~5분위 안내를 표시한다', async () => {
    const user = userEvent.setup()
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)
    await user.click(screen.getByRole('button', { name: '아파트' }))

    expect(screen.getByText('서울 아파트 5분위 안내')).toBeInTheDocument()
    expect(screen.getByText(/노원구, 도봉구, 강북구/)).toBeInTheDocument()
    expect(screen.getByText(/서초구, 강남구, 송파구, 용산구/)).toBeInTheDocument()
  })

  it('scope 변경 중에는 필터만 즉시 바꾸고 응답 라벨은 이전 스냅샷을 유지한 뒤 함께 갱신한다', async () => {
    const user = userEvent.setup()
    let strategyResult = {
      data: COMPARISON,
      isLoading: false,
      isFetching: true,
      isError: false,
      isPlaceholderData: true,
    }
    useHousingBenchmarkQueryMock.mockImplementation((params: { scope: string }) => (
      params.scope === 'STRATEGY'
        ? strategyResult
        : {
            data: COMPARISON,
            isLoading: false,
            isFetching: false,
            isError: false,
            isPlaceholderData: false,
          }
    ))
    const { rerender } = render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)
    await user.click(screen.getByRole('button', { name: '아파트' }))

    await user.click(screen.getByRole('button', { name: '개별 전략' }))
    await user.selectOptions(screen.getByLabelText('벤치마크 자산'), '5')

    expect(screen.getByRole('button', { name: '개별 전략' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('벤치마크 자산')).toHaveValue('5')
    expect(screen.getByRole('status', { name: '갱신 중' })).toBeInTheDocument()
    expect(screen.getByText('+32.5%p')).toBeInTheDocument()
    expect(screen.getByText('전체 포트폴리오 · USD')).toBeInTheDocument()
    expect(screen.getByText('전체 포트폴리오 (USD): investmentIndexUsd')).toBeInTheDocument()
    expect(screen.getByText('서울 아파트 3분위 (KRW): benchmarkIndex')).toBeInTheDocument()

    strategyResult = {
      data: FIFTH_QUINTILE_STRATEGY_COMPARISON,
      isLoading: false,
      isFetching: false,
      isError: false,
      isPlaceholderData: false,
    }
    rerender(<HousingBenchmarkComparison enabled defaultTo="2026-07-18" />)

    expect(screen.getByText('INFINITE · SOXL · USD')).toBeInTheDocument()
    expect(screen.getByText('INFINITE · SOXL (USD): investmentIndexUsd')).toBeInTheDocument()
    expect(screen.getByText('서울 아파트 5분위 (KRW): benchmarkIndex')).toBeInTheDocument()
    expect(screen.queryByText('전체 포트폴리오 · USD')).not.toBeInTheDocument()
  })

  it('ETF 벤치마크 응답은 USD 통화 표기와 ETF 안내 문구를 표시한다', async () => {
    const user = userEvent.setup()
    mockQuery(QLD_STRATEGY_COMPARISON)
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)
    await user.click(screen.getByRole('button', { name: 'ETF' }))

    expect(screen.getByText('QLD (ProShares Ultra QQQ (2x 레버리지)) · USD')).toBeInTheDocument()
    expect(screen.getByText('QLD 안내')).toBeInTheDocument()
    expect(screen.getByText('나스닥100 일일 수익률의 2배를 추종하는 레버리지 ETF입니다.')).toBeInTheDocument()
    expect(screen.getByText(/Alpaca Market Data/)).toBeInTheDocument()
    expect(screen.queryByText(/1 USD =/)).not.toBeInTheDocument()
    expect(screen.getByText('QLD (ProShares Ultra QQQ (2x 레버리지)) (USD)')).toBeInTheDocument()
    expect(screen.queryByText('QLD (ProShares Ultra QQQ (2x 레버리지)) (KRW)')).not.toBeInTheDocument()
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

  it('전략 목록 갱신이 실패해도 stale 데이터가 있으면 비교를 계속 표시한다', async () => {
    const user = userEvent.setup()
    useAllStrategiesQueryMock.mockReturnValue({ data: STRATEGIES, isLoading: false, isError: true })
    mockQuery(STRATEGY_COMPARISON)
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    await user.click(screen.getByRole('button', { name: '개별 전략' }))

    expect(screen.getByLabelText('전략')).toHaveValue('strategy-1')
    expect(screen.getByTestId('housing-benchmark-chart')).toBeInTheDocument()
    expect(screen.queryByText('전략 목록을 불러오지 못했습니다')).not.toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: '아파트' }))

    await user.click(screen.getByRole('button', { name: '1년' }))

    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'PORTFOLIO',
      benchmarkType: 'HOUSING',
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

  it('데이터 부족 사유는 자산별로 다른 단위(거래일/개월)로 안내한다', async () => {
    const user = userEvent.setup()
    mockQuery({ ...COMPARISON, summary: null, points: [], emptyReason: 'INSUFFICIENT_COMMON_MONTHS' })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.getByText(/최소 2개 거래일 데이터 필요/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '아파트' }))
    expect(screen.getByText(/최소 2개월치 데이터 필요/)).toBeInTheDocument()
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

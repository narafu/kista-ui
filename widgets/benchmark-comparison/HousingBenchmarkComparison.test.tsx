import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { HousingBenchmark, HousingBenchmarkComparison as HousingBenchmarkComparisonData } from '@entities/stats'
import { HousingBenchmarkComparison } from './HousingBenchmarkComparison'

const { useHousingBenchmarkQueryMock, useHousingBenchmarkRegionsQueryMock, useHousingPriceIndexSeriesQueryMock, useEtfPriceSeriesQueryMock, useAllStrategiesQueryMock, useAccountsQueryMock, useRuntimeConfigQueryMock } = vi.hoisted(() => ({
  useHousingBenchmarkQueryMock: vi.fn(),
  useHousingBenchmarkRegionsQueryMock: vi.fn(),
  useHousingPriceIndexSeriesQueryMock: vi.fn(),
  useEtfPriceSeriesQueryMock: vi.fn(),
  useAllStrategiesQueryMock: vi.fn(),
  useAccountsQueryMock: vi.fn(),
  useRuntimeConfigQueryMock: vi.fn(),
}))

const API_QUALITY_NOTICE =
  '전략 운용 기록 기반 근사치입니다. 투자 성과는 USD, 아파트 매매가격지수는 KRW 현지 통화 기준이며 현재 환율은 성과 계산에 반영하지 않습니다. 벤치마크 시점은 KB Land 주간 조사일(매주 월요일) 기준입니다.'

const MOCK_REGIONS = [
  { code: '1100000000', name: '서울' },
  { code: '11680', name: '강남구' },
]

vi.mock('@entities/stats', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/stats')>()
  return {
    ...actual,
    useHousingBenchmarkQuery: useHousingBenchmarkQueryMock,
    useHousingBenchmarkRegionsQuery: useHousingBenchmarkRegionsQueryMock,
    useHousingPriceIndexSeriesQuery: useHousingPriceIndexSeriesQueryMock,
    useEtfPriceSeriesQuery: useEtfPriceSeriesQueryMock,
  }
})

vi.mock('@entities/strategy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/strategy')>()
  return { ...actual, useAllStrategiesQuery: useAllStrategiesQueryMock }
})

vi.mock('@entities/account', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/account')>()
  return { ...actual, useAccountsQuery: useAccountsQueryMock }
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
  symbol: null,
  label: '서울 아파트 매매가격지수',
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

const GANGNAM_STRATEGY_COMPARISON: HousingBenchmarkComparisonData = {
  ...STRATEGY_COMPARISON,
  benchmark: {
    ...HOUSING_BENCHMARK,
    regionCode: '11680',
    regionName: '강남구',
    label: '강남구 아파트 매매가격지수',
  },
}

const QLD_STRATEGY_COMPARISON: HousingBenchmarkComparisonData = {
  ...STRATEGY_COMPARISON,
  benchmark: {
    assetType: 'ETF',
    regionCode: null,
    regionName: null,
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

const ACCOUNTS = [
  { id: 'account-1', nickname: '메인계좌', accountNoMasked: '****0001', broker: 'KIS' as const },
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
    useAccountsQueryMock.mockReturnValue({ data: ACCOUNTS, isLoading: false })
    useRuntimeConfigQueryMock.mockReturnValue({ data: undefined })
    useHousingBenchmarkRegionsQueryMock.mockReturnValue({
      data: { regions: MOCK_REGIONS }, isLoading: false, isError: false,
    })
    useHousingPriceIndexSeriesQueryMock.mockReturnValue({
      data: undefined, isLoading: false, isError: false,
    })
    useEtfPriceSeriesQueryMock.mockReturnValue({
      data: undefined, isLoading: false, isError: false,
    })
    mockQuery()
  })

  it('기본 렌더링은 ETF 탭·3개월 기간이 활성화된다', () => {
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    // 전략 드롭다운이 두 자산 탭 모두 항상 노출되므로 진입 즉시 전략 목록을 불러온다
    expect(useAllStrategiesQueryMock).toHaveBeenLastCalledWith({ enabled: true })
    expect(screen.getByLabelText('전략')).toHaveValue('ALL')
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

  it('아파트 탭에서 포트폴리오·서울·1년 비교와 서버 지수 및 장기 요약을 표시한다', async () => {
    const user = userEvent.setup()
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    await user.click(screen.getByRole('button', { name: '아파트' }))

    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'PORTFOLIO',
      benchmarkType: 'HOUSING',
      regionCode: '1100000000',
      from: '2025-07-17',
      to: '2026-07-17',
    }, true)
    expect(screen.getByLabelText('전략')).toHaveValue('ALL')
    expect(screen.getByRole('button', { name: '1년' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('벤치마크 자산')).toHaveValue('1100000000')

    expect(screen.getByText('+32.5%p')).toBeInTheDocument()
    expect(screen.getByText('+84.2%')).toBeInTheDocument()
    expect(screen.getByText('+51.7%')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: '장기 성과 지표 비교' })).toBeInTheDocument()
    expect(screen.getByText('전체 포트폴리오 (USD): investmentIndexUsd')).toBeInTheDocument()
    expect(screen.getByText('서울 아파트 매매가격지수 (KRW): benchmarkIndex')).toBeInTheDocument()
    expect(screen.getByTestId('housing-benchmark-chart')).toHaveAttribute(
      'data-points',
      JSON.stringify(COMPARISON.points),
    )
  })

  it('전략 범위와 전략·지역·기간 필터를 요청에 반영한다', async () => {
    const user = userEvent.setup()
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)
    await user.click(screen.getByRole('button', { name: '아파트' }))

    const strategySelect = screen.getByLabelText('전략')
    expect(strategySelect).toHaveValue('ALL')

    await user.selectOptions(strategySelect, 'strategy-1')
    expect(strategySelect).toHaveValue('strategy-1')
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({
      scope: 'STRATEGY', strategyId: 'strategy-1',
    }), true)

    await user.selectOptions(strategySelect, 'strategy-2')
    await user.selectOptions(screen.getByLabelText('벤치마크 자산'), '11680')
    await user.click(screen.getByRole('button', { name: '1년' }))

    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'STRATEGY',
      strategyId: 'strategy-2',
      benchmarkType: 'HOUSING',
      regionCode: '11680',
      from: '2025-07-17',
      to: '2026-07-17',
    }, true)

    await user.click(screen.getByRole('button', { name: '전체' }))
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'STRATEGY',
      strategyId: 'strategy-2',
      benchmarkType: 'HOUSING',
      regionCode: '11680',
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

  it("전략 드롭다운에서 '전체'/'없음'/개별 전략을 전환하면 scope와 canQuery가 함께 바뀐다", async () => {
    const user = userEvent.setup()
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)
    await user.click(screen.getByRole('button', { name: '아파트' }))

    const strategySelect = screen.getByLabelText('전략')
    expect(strategySelect).toHaveValue('ALL')
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'PORTFOLIO' }), true,
    )

    await user.selectOptions(strategySelect, 'NONE')
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(expect.anything(), false)
    expect(screen.queryByText('전체 포트폴리오 (USD): investmentIndexUsd')).not.toBeInTheDocument()

    await user.selectOptions(strategySelect, 'strategy-1')
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'STRATEGY', strategyId: 'strategy-1' }), true,
    )
  })

  it("전략 드롭다운에서 '없음'을 선택하면 비교 대신 선택 지역의 매매가격지수만 표시한다", async () => {
    const user = userEvent.setup()
    useHousingPriceIndexSeriesQueryMock.mockReturnValue({
      data: {
        points: [
          { baseDate: '2026-01-05', indexValue: 100.5 },
          { baseDate: '2026-07-06', indexValue: 108.2 },
        ],
        sourceUpdatedDate: '2026-07-06',
      },
      isLoading: false,
      isError: false,
    })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)
    await user.click(screen.getByRole('button', { name: '아파트' }))

    await user.selectOptions(screen.getByLabelText('전략'), 'NONE')

    expect(useHousingPriceIndexSeriesQueryMock).toHaveBeenLastCalledWith(
      { from: '2025-07-17', to: '2026-07-17', regionCode: '1100000000' }, true,
    )
    expect(screen.getByText('서울 아파트 매매가격지수')).toBeInTheDocument()
    expect(screen.getByText('매매가격지수: indexValue')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: '장기 성과 지표 비교' })).not.toBeInTheDocument()
    // 아파트 5분위 원본 시세 섹션은 '없음' 선택과 무관하게 항상 유지된다
    expect(screen.getByTestId('housing-benchmark-quintile-trend-chart-stub')).toBeInTheDocument()
  })

  it("전략 드롭다운에서 '없음'에서 다시 '전체'로 되돌리면 비교 화면이 복원된다", async () => {
    const user = userEvent.setup()
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)
    await user.click(screen.getByRole('button', { name: '아파트' }))

    const strategySelect = screen.getByLabelText('전략')
    await user.selectOptions(strategySelect, 'NONE')
    expect(screen.queryByText('전체 포트폴리오 (USD): investmentIndexUsd')).not.toBeInTheDocument()

    await user.selectOptions(strategySelect, 'ALL')

    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'PORTFOLIO' }), true,
    )
    expect(screen.getByText('전체 포트폴리오 (USD): investmentIndexUsd')).toBeInTheDocument()
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

    const strategySelect = screen.getByLabelText('전략')
    await user.selectOptions(strategySelect, 'strategy-1')
    await user.selectOptions(screen.getByLabelText('벤치마크 자산'), '11680')

    expect(strategySelect).toHaveValue('strategy-1')
    expect(screen.getByLabelText('벤치마크 자산')).toHaveValue('11680')
    expect(screen.getByRole('status', { name: '갱신 중' })).toBeInTheDocument()
    expect(screen.getByText('+32.5%p')).toBeInTheDocument()
    expect(screen.getByText('전체 포트폴리오 · USD')).toBeInTheDocument()
    expect(screen.getByText('전체 포트폴리오 (USD): investmentIndexUsd')).toBeInTheDocument()
    expect(screen.getByText('서울 아파트 매매가격지수 (KRW): benchmarkIndex')).toBeInTheDocument()

    strategyResult = {
      data: GANGNAM_STRATEGY_COMPARISON,
      isLoading: false,
      isFetching: false,
      isError: false,
      isPlaceholderData: false,
    }
    rerender(<HousingBenchmarkComparison enabled defaultTo="2026-07-18" />)

    expect(screen.getByText('INFINITE · SOXL · USD')).toBeInTheDocument()
    expect(screen.getByText('INFINITE · SOXL (USD): investmentIndexUsd')).toBeInTheDocument()
    expect(screen.getByText('강남구 아파트 매매가격지수 (KRW): benchmarkIndex')).toBeInTheDocument()
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

  it("ETF 탭 전략 드롭다운에서 '전체'/'없음'/개별 전략을 전환하면 scope와 canQuery가 함께 바뀐다", async () => {
    const user = userEvent.setup()
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    const strategySelect = screen.getByLabelText('전략')
    expect(strategySelect).toHaveValue('ALL')
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'PORTFOLIO', benchmarkType: 'ETF' }), true,
    )

    await user.selectOptions(strategySelect, 'NONE')
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(expect.anything(), false)
    expect(screen.queryByText('전체 포트폴리오 (USD): investmentIndexUsd')).not.toBeInTheDocument()

    await user.selectOptions(strategySelect, 'strategy-1')
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'STRATEGY', strategyId: 'strategy-1', benchmarkType: 'ETF' }), true,
    )

    await user.selectOptions(strategySelect, 'ALL')
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'PORTFOLIO', benchmarkType: 'ETF' }), true,
    )
  })

  it("ETF 탭에서 '없음'을 선택하면 비교 대신 선택 심볼의 가격 추이만 표시한다", async () => {
    const user = userEvent.setup()
    useEtfPriceSeriesQueryMock.mockReturnValue({
      data: {
        points: [
          { tradeDate: '2026-01-05', close: 400.5 },
          { tradeDate: '2026-07-06', close: 440.2 },
        ],
      },
      isLoading: false,
      isError: false,
    })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    await user.selectOptions(screen.getByLabelText('전략'), 'NONE')

    expect(useEtfPriceSeriesQueryMock).toHaveBeenLastCalledWith(
      { from: '2026-04-17', to: '2026-07-17', symbol: 'SPY' }, true,
    )
    expect(screen.getByText('SPY 가격 추이')).toBeInTheDocument()
    expect(screen.getByText('종가: close')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: '장기 성과 지표 비교' })).not.toBeInTheDocument()
    // ETF 탭 위험 안내 박스는 '없음' 선택과 무관하게 항상 유지된다
    expect(screen.getByText('SPY 안내')).toBeInTheDocument()
  })

  it('전략 목록 로딩 중에는 드롭다운에 안내 옵션을 표시한다', () => {
    useAllStrategiesQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.getByRole('option', { name: '전략 목록 불러오는 중' })).toBeInTheDocument()
  })

  it('전략 목록 조회 실패 시 드롭다운에 안내 옵션을 표시한다', () => {
    useAllStrategiesQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.getByRole('option', { name: '전략 목록 조회 실패' })).toBeInTheDocument()
  })

  it('전략 목록 갱신이 실패해도 stale 데이터가 있으면 선택·비교를 계속할 수 있다', async () => {
    const user = userEvent.setup()
    useAllStrategiesQueryMock.mockReturnValue({ data: STRATEGIES, isLoading: false, isError: true })
    mockQuery(STRATEGY_COMPARISON)
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    await user.selectOptions(screen.getByLabelText('전략'), 'strategy-1')

    expect(screen.getByLabelText('전략')).toHaveValue('strategy-1')
    expect(screen.getByTestId('housing-benchmark-chart')).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '전략 목록 조회 실패' })).not.toBeInTheDocument()
  })

  it('실제 빈 전략 목록이면 드롭다운에 안내 옵션을 표시한다', () => {
    useAllStrategiesQueryMock.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.getByRole('option', { name: '등록된 전략이 없습니다' })).toBeInTheDocument()
  })

  it('계좌 목록이 아직 로딩 중이면 모의계좌 필터링 전에는 전략 목록을 확정하지 않는다', () => {
    useAccountsQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.getByRole('option', { name: '전략 목록 불러오는 중' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /INFINITE|VR/ })).not.toBeInTheDocument()
  })

  it('계좌 목록 조회가 실패하면 전략 목록도 오류로 표시한다', () => {
    useAccountsQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.getByRole('option', { name: '전략 목록 조회 실패' })).toBeInTheDocument()
  })

  it('전략 선택 드롭다운 옵션 라벨 앞에 계좌 닉네임을 표시한다', () => {
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.getByRole('option', { name: '[메인계좌] INFINITE · SOXL' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '[메인계좌] VR · TQQQ' })).toBeInTheDocument()
  })

  it('모의계좌 소속 전략은 전략 드롭다운에서 제외한다', () => {
    useAccountsQueryMock.mockReturnValue({
      data: [
        ...ACCOUNTS,
        { id: 'account-2', nickname: '연습계좌', accountNoMasked: '****0002', broker: 'MOCK' as const },
      ],
      isLoading: false,
    })
    useAllStrategiesQueryMock.mockReturnValue({
      data: [
        ...STRATEGIES,
        {
          id: 'strategy-3', accountId: 'account-2', type: 'INFINITE', status: 'ACTIVE',
          ticker: 'MAGX', cycleSeedType: 'NONE' as const, isReverseMode: false,
        },
      ],
      isLoading: false,
    })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.queryByRole('option', { name: /MAGX/ })).not.toBeInTheDocument()
    // 전체/없음 옵션 2개 + 모의계좌 제외 전략 2개
    expect(within(screen.getByLabelText('전략')).getAllByRole('option')).toHaveLength(4)
  })

  it('선택된 전략이 목록에서 사라지면 전체로 되돌아간다', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)
    await user.selectOptions(screen.getByLabelText('전략'), 'strategy-1')
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'STRATEGY', strategyId: 'strategy-1' }), true,
    )

    // 전략이 삭제되어 목록에서 사라진 상황을 재조회 결과로 재현 — 같은 트리를 rerender해야
    // useEffect의 복구 로직이 실제로 실행된다(새 render는 state가 초기화된 별개 트리를 만들 뿐이라 검증되지 않음)
    useAllStrategiesQueryMock.mockReturnValue({ data: [STRATEGIES[1]], isLoading: false, isError: false })
    rerender(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    // DOM select value는 목록에 없는 값이면 첫 옵션으로 폴백해 보이므로(우연히 'ALL'과 같을 수 있음) 신뢰하지 않고
    // 실제 파생 상태(쿼리에 전달된 scope/strategyId)로 복구 여부를 검증한다
    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'PORTFOLIO' }), true,
    )
    expect(useHousingBenchmarkQueryMock.mock.calls.at(-1)?.[0]).not.toHaveProperty('strategyId')
    expect(screen.getByLabelText('전략')).toHaveValue('ALL')
  })

  it('윤년 2월 29일에서 연도를 빼도 2월을 유지하고 유효한 말일로 보정한다', async () => {
    const user = userEvent.setup()
    render(<HousingBenchmarkComparison enabled defaultTo="2024-02-29" />)
    await user.click(screen.getByRole('button', { name: '아파트' }))

    await user.click(screen.getByRole('button', { name: '1년' }))

    expect(useHousingBenchmarkQueryMock).toHaveBeenLastCalledWith({
      scope: 'PORTFOLIO',
      benchmarkType: 'HOUSING',
      regionCode: '1100000000',
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

  it('데이터 부족 사유는 자산별로 다른 단위(거래일/주)로 안내한다', async () => {
    const user = userEvent.setup()
    mockQuery({ ...COMPARISON, summary: null, points: [], emptyReason: 'INSUFFICIENT_COMMON_MONTHS' })
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" />)

    expect(screen.getByText(/최소 2개 거래일 데이터 필요/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '아파트' }))
    expect(screen.getByText(/최소 2주치 데이터 필요/)).toBeInTheDocument()
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

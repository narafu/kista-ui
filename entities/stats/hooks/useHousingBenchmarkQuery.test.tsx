import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { components } from '@shared/lib/api-types'
import type {
  CurrentExchangeRate,
  HousingBenchmark,
  HousingBenchmarkComparison,
  HousingBenchmarkParams,
  HousingBenchmarkPeriod,
  HousingBenchmarkPoint,
  HousingBenchmarkQuality,
  HousingBenchmarkStrategy,
  HousingBenchmarkSummary,
} from '../model/types'
import { useHousingBenchmarkQuery } from './useStatsQueries'

const { getHousingBenchmarkComparisonMock } = vi.hoisted(() => ({
  getHousingBenchmarkComparisonMock: vi.fn(),
}))

type Equal<Left, Right> = (
  <Value>() => Value extends Left ? 1 : 2
) extends <Value>() => Value extends Right ? 1 : 2 ? true : false
type Assert<Condition extends true> = Condition
type HousingBenchmarkSchemas = components['schemas']

type _CurrentExchangeRateMatchesSchema = Assert<Equal<
  CurrentExchangeRate,
  HousingBenchmarkSchemas['HousingBenchmarkCurrentExchangeRate']
>>
type _StrategyMatchesSchema = Assert<Equal<
  HousingBenchmarkStrategy,
  HousingBenchmarkSchemas['HousingBenchmarkStrategyInfo']
>>
// TODO(백엔드 완료 후): 벤치마크 확장(HOUSING/ETF) 계약이 openapi.json에 반영되면
// HousingBenchmark/HousingBenchmarkQuality/HousingBenchmarkComparison을 다시 생성 타입 재export로
// 되돌리고 아래 세 단언을 복원한다. 현재는 entities/stats/model/types.ts에서 신규 필드(assetType,
// symbol, benchmarkCurrency 'USD' 등)를 직접 정의한 임시 타입이라 생성 스키마와 구조적으로 다르다.
// type _BenchmarkMatchesSchema = Assert<Equal<
//   HousingBenchmark,
//   HousingBenchmarkSchemas['HousingBenchmarkDefinition']
// >>
type _PeriodMatchesSchema = Assert<Equal<
  HousingBenchmarkPeriod,
  HousingBenchmarkSchemas['HousingBenchmarkPeriod']
>>
type _SummaryMatchesSchema = Assert<Equal<
  HousingBenchmarkSummary,
  HousingBenchmarkSchemas['HousingBenchmarkSummary']
>>
type _PointMatchesSchema = Assert<Equal<
  HousingBenchmarkPoint,
  HousingBenchmarkSchemas['HousingBenchmarkPoint']
>>
// type _QualityMatchesSchema = Assert<Equal<
//   HousingBenchmarkQuality,
//   HousingBenchmarkSchemas['HousingBenchmarkQuality']
// >>
// type _ComparisonMatchesSchema = Assert<Equal<
//   HousingBenchmarkComparison,
//   HousingBenchmarkSchemas['HousingBenchmarkComparisonResponse']
// >>

vi.mock('../api', () => ({
  getEquityCurve: vi.fn(),
  getHousingBenchmarkComparison: getHousingBenchmarkComparisonMock,
  getStatsCycles: vi.fn(),
  getStatsSummary: vi.fn(),
}))

const params: HousingBenchmarkParams = {
  scope: 'PORTFOLIO',
  benchmarkType: 'HOUSING',
  quintile: 3,
  from: '2021-07-01',
  to: '2026-07-01',
}

const response: HousingBenchmarkComparison = {
  scope: 'PORTFOLIO',
  strategy: null,
  benchmark: {
    assetType: 'HOUSING',
    regionCode: '11680',
    regionName: '강남구',
    quintile: 3,
    symbol: null,
    label: '강남구 3분위',
    sourceUpdatedDate: '2026-07-01',
  },
  period: { fromMonth: '2021-07-01', toMonth: '2026-07-01', monthCount: 61 },
  summary: null,
  points: [{
    baseMonth: '2026-07-01',
    investmentIndexUsd: 103.2,
    benchmarkIndex: 101.4,
    investmentMonthlyReturn: 3.2,
    benchmarkMonthlyReturn: 1.4,
  }],
  currentExchangeRate: null,
  quality: {
    method: 'MONTHLY',
    investmentCurrency: 'USD',
    benchmarkCurrency: 'KRW',
    notice: 'test',
  },
  emptyReason: null,
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function QueryClientWrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useHousingBenchmarkQuery', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('uses every filter in the query key and request', async () => {
    getHousingBenchmarkComparisonMock.mockResolvedValue(response)
    const { result } = renderHook(() => useHousingBenchmarkQuery(params, true), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.data).toBe(response))

    expect(getHousingBenchmarkComparisonMock).toHaveBeenCalledWith(params)
    expect(queryClient.getQueryData([
      'housingBenchmark', 'PORTFOLIO', null, 'HOUSING', 3, null, '2021-07-01', '2026-07-01',
    ])).toBe(response)
  })

  it('does not request data while disabled', async () => {
    const { result } = renderHook(() => useHousingBenchmarkQuery(params, false), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))

    expect(getHousingBenchmarkComparisonMock).not.toHaveBeenCalled()
  })

  it('keeps previous chart data while a changed filter is loading', async () => {
    const pendingResponse = new Promise<HousingBenchmarkComparison>(() => {})
    getHousingBenchmarkComparisonMock
      .mockResolvedValueOnce(response)
      .mockReturnValueOnce(pendingResponse)
    const { result, rerender } = renderHook(
      ({ queryParams }) => useHousingBenchmarkQuery(queryParams, true),
      {
        initialProps: { queryParams: params },
        wrapper: createWrapper(queryClient),
      }
    )

    await waitFor(() => expect(result.current.data).toBe(response))

    rerender({ queryParams: { ...params, quintile: 4 } })

    await waitFor(() => expect(getHousingBenchmarkComparisonMock).toHaveBeenCalledTimes(2))

    expect(result.current.data).toBe(response)
    expect(result.current.isPlaceholderData).toBe(true)
  })
})

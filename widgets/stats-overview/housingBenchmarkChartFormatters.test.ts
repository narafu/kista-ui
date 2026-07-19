import { describe, expect, it } from 'vitest'
import type { HousingBenchmarkPoint } from '@entities/stats'
import {
  HOUSING_BENCHMARK_CHART_NOTICE,
  formatHousingBenchmarkAxisMonth,
  formatHousingBenchmarkMonth,
  formatHousingBenchmarkSeriesLabel,
  formatHousingBenchmarkTooltipValue,
} from './housingBenchmarkChartFormatters'

const POINT: HousingBenchmarkPoint = {
  baseMonth: '2026-07-01',
  investmentIndexUsd: 184.2,
  benchmarkIndex: 151.7,
  investmentMonthlyReturn: 0.031,
  benchmarkMonthlyReturn: -0.004,
}

describe('housing benchmark chart formatters', () => {
  it('YYYY-MM-DD를 로컬 시간대와 무관한 연월로 표시한다', () => {
    expect(formatHousingBenchmarkMonth('2026-07-01')).toBe('2026년 7월')
    expect(formatHousingBenchmarkAxisMonth('2026-07-01')).toBe('2026.07')
  })

  it('두 서버 지수와 각 월간수익률을 별도로 표시한다', () => {
    expect(formatHousingBenchmarkTooltipValue(184.2, 'investmentIndexUsd', POINT))
      .toBe('184.2 · +3.1% 월간')
    expect(formatHousingBenchmarkTooltipValue(151.7, 'benchmarkIndex', POINT))
      .toBe('151.7 · -0.4% 월간')
  })

  it('USD/KRW 현지 통화 단위를 사용하고 API 품질 고지와 중복되는 환율 문구를 만들지 않는다', () => {
    expect(formatHousingBenchmarkSeriesLabel('전체 포트폴리오', 'USD'))
      .toBe('전체 포트폴리오 (USD)')
    expect(formatHousingBenchmarkSeriesLabel('서울 아파트 3분위', 'KRW'))
      .toBe('서울 아파트 3분위 (KRW)')
    expect(HOUSING_BENCHMARK_CHART_NOTICE).toBe('월별 지수와 수익률은 서버 계산값입니다.')
    expect(HOUSING_BENCHMARK_CHART_NOTICE).not.toContain('환율')
  })
})

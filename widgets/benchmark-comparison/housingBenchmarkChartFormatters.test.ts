import { describe, expect, it } from 'vitest'
import type { HousingBenchmarkPoint } from '@entities/stats'
import {
  formatHousingBenchmarkAxisDate,
  formatHousingBenchmarkAxisMonth,
  formatHousingBenchmarkDate,
  formatHousingBenchmarkMonth,
  formatHousingBenchmarkSeriesLabel,
  formatHousingBenchmarkTooltipValue,
  housingBenchmarkChartNotice,
} from './housingBenchmarkChartFormatters'

const POINT: HousingBenchmarkPoint = {
  baseDate: '2026-07-01',
  investmentIndexUsd: 184.2,
  benchmarkIndex: 151.7,
  investmentPeriodReturn: 0.031,
  benchmarkPeriodReturn: -0.004,
}

describe('housing benchmark chart formatters', () => {
  it('YYYY-MM-DD를 로컬 시간대와 무관한 연월로 표시한다', () => {
    expect(formatHousingBenchmarkMonth('2026-07-01')).toBe('2026년 7월')
    expect(formatHousingBenchmarkAxisMonth('2026-07-01')).toBe('2026.07')
  })

  it('YYYY-MM-DD를 로컬 시간대와 무관한 연월일로 표시한다', () => {
    expect(formatHousingBenchmarkDate('2026-07-05')).toBe('2026년 7월 5일')
    expect(formatHousingBenchmarkAxisDate('2026-07-05')).toBe('07.05')
  })

  it('월별 포인트는 두 서버 지수와 각 월간수익률을 별도로 표시한다', () => {
    expect(formatHousingBenchmarkTooltipValue(184.2, 'investmentIndexUsd', POINT, false))
      .toBe('184.2 · +3.1% 월간')
    expect(formatHousingBenchmarkTooltipValue(151.7, 'benchmarkIndex', POINT, false))
      .toBe('151.7 · -0.4% 월간')
  })

  it('일별 포인트는 두 서버 지수와 각 일간수익률을 별도로 표시한다', () => {
    expect(formatHousingBenchmarkTooltipValue(184.2, 'investmentIndexUsd', POINT, true))
      .toBe('184.2 · +3.1% 일간')
    expect(formatHousingBenchmarkTooltipValue(151.7, 'benchmarkIndex', POINT, true))
      .toBe('151.7 · -0.4% 일간')
  })

  it('USD/KRW 현지 통화 단위를 사용하고 API 품질 고지와 중복되는 환율 문구를 만들지 않는다', () => {
    expect(formatHousingBenchmarkSeriesLabel('전체 포트폴리오', 'USD'))
      .toBe('전체 포트폴리오 (USD)')
    expect(formatHousingBenchmarkSeriesLabel('서울 아파트 3분위', 'KRW'))
      .toBe('서울 아파트 3분위 (KRW)')
    expect(housingBenchmarkChartNotice(false)).toBe('월별 지수와 수익률은 서버 계산값입니다.')
    expect(housingBenchmarkChartNotice(true)).toBe('일별 지수와 수익률은 서버 계산값입니다.')
    expect(housingBenchmarkChartNotice(false)).not.toContain('환율')
  })
})

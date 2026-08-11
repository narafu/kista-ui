import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { HousingBenchmarkSummary as HousingBenchmarkSummaryData } from '@entities/stats'
import { HousingBenchmarkSummary } from './HousingBenchmarkSummary'

const BASE_SUMMARY: HousingBenchmarkSummaryData = {
  investmentCumulativeReturn: 0.05,
  benchmarkCumulativeReturn: 0.03,
  excessReturn: 0.02,
  investmentAnnualizedReturn: 0.2,
  benchmarkAnnualizedReturn: 0.15,
  investmentMaxDrawdown: -0.01,
  benchmarkMaxDrawdown: -0.02,
}

describe('HousingBenchmarkSummary', () => {
  it('연환산 수익률이 모두 있으면 90일 미만 안내를 표시하지 않는다', () => {
    render(
      <HousingBenchmarkSummary
        summary={BASE_SUMMARY}
        investmentLabel="전체 포트폴리오"
        benchmarkLabel="서울 아파트 매매가격지수"
        benchmarkCurrency="KRW"
      />,
    )

    expect(screen.queryByText(/90일 미만/)).not.toBeInTheDocument()
  })

  it('연환산 수익률이 null이면 90일 미만이라 미표시라는 안내를 표시한다', () => {
    render(
      <HousingBenchmarkSummary
        summary={{ ...BASE_SUMMARY, investmentAnnualizedReturn: null, benchmarkAnnualizedReturn: null }}
        investmentLabel="전체 포트폴리오"
        benchmarkLabel="서울 아파트 매매가격지수"
        benchmarkCurrency="KRW"
      />,
    )

    expect(screen.getByText(/90일 미만/)).toBeInTheDocument()
  })
})

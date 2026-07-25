import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { HousingBenchmark } from '@entities/stats'
import { HousingBenchmarkInfo } from './HousingBenchmarkInfo'

const ETF_BENCHMARK: HousingBenchmark = {
  assetType: 'ETF',
  regionCode: null,
  regionName: null,
  quintile: null,
  symbol: 'QLD',
  label: 'QLD (ProShares Ultra QQQ (2x 레버리지))',
  sourceUpdatedDate: '2026-07-01',
}

describe('HousingBenchmarkInfo', () => {
  it('ETF 벤치마크는 정식 명칭·위험 구분·설명과 Alpaca 출처를 표시한다', () => {
    render(<HousingBenchmarkInfo benchmark={ETF_BENCHMARK} notice="test notice" />)

    expect(screen.getByText('QLD 안내')).toBeInTheDocument()
    expect(screen.getAllByText('ProShares Ultra QQQ').length).toBeGreaterThan(0)
    expect(screen.getByText('2배 레버리지')).toBeInTheDocument()
    expect(screen.getByText('나스닥100 일일 수익률의 2배를 추종하는 레버리지 ETF입니다.')).toBeInTheDocument()
    expect(screen.getByText(/Alpaca Market Data/)).toBeInTheDocument()
    expect(screen.getByText('test notice')).toBeInTheDocument()
    expect(screen.getByText('2026-07-01')).toBeInTheDocument()
  })

  it('notice가 없으면 클라이언트 폴백 문구를 표시한다', () => {
    render(<HousingBenchmarkInfo benchmark={ETF_BENCHMARK} />)

    expect(screen.getByText('전략 운용 기록 기반 근사치입니다. 투자와 ETF 벤치마크 모두 USD 기준이며 환율 변수가 없습니다.')).toBeInTheDocument()
  })
})

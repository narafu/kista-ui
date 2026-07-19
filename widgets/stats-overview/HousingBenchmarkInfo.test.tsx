import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { CurrentExchangeRate, HousingBenchmark } from '@entities/stats'
import { HousingBenchmarkInfo } from './HousingBenchmarkInfo'

const HOUSING_BENCHMARK: HousingBenchmark = {
  assetType: 'HOUSING',
  regionCode: '1100000000',
  regionName: '서울',
  quintile: 3,
  symbol: null,
  label: '서울 아파트 3분위',
  sourceUpdatedDate: '2026-07-01',
}

const ETF_BENCHMARK: HousingBenchmark = {
  assetType: 'ETF',
  regionCode: null,
  regionName: null,
  quintile: null,
  symbol: 'QLD',
  label: 'QLD (ProShares Ultra QQQ (2x 레버리지))',
  sourceUpdatedDate: '2026-07-01',
}

const EXCHANGE_RATE: CurrentExchangeRate = {
  midRate: 1365.2,
  fetchedAt: '2026-07-19T01:30:00Z',
  source: 'TOSS_INVEST',
}

describe('HousingBenchmarkInfo', () => {
  it('HOUSING 벤치마크는 분위 안내와 KB부동산 출처, 환율 참고 블록을 표시한다', () => {
    render(
      <HousingBenchmarkInfo
        benchmark={HOUSING_BENCHMARK}
        currentExchangeRate={EXCHANGE_RATE}
        notice="test notice"
      />
    )

    expect(screen.getByText('서울 3분위 안내')).toBeInTheDocument()
    expect(screen.getAllByText('서울 아파트 가격 중간 40% ~ 60%').length).toBeGreaterThan(0)
    expect(screen.getByText(/KB부동산 서울 아파트 5분위 매매평균가격/)).toBeInTheDocument()
    expect(screen.getByText(/1 USD = 1,365.20 KRW/)).toBeInTheDocument()
  })

  it('ETF 벤치마크는 ETF 안내와 Alpaca 출처를 표시하고 환율 참고 블록은 숨긴다', () => {
    render(
      <HousingBenchmarkInfo
        benchmark={ETF_BENCHMARK}
        currentExchangeRate={EXCHANGE_RATE}
        notice="test notice"
      />
    )

    expect(screen.getByText('QLD 안내')).toBeInTheDocument()
    expect(screen.getAllByText('ProShares Ultra QQQ').length).toBeGreaterThan(0)
    expect(screen.getByText('나스닥100 일일 수익률의 2배를 추종하는 레버리지 ETF입니다.')).toBeInTheDocument()
    expect(screen.getByText(/Alpaca Market Data/)).toBeInTheDocument()
    expect(screen.queryByText(/1 USD =/)).not.toBeInTheDocument()
  })

  it('환율 정보가 없으면 HOUSING이어도 환율 참고 블록을 표시하지 않는다', () => {
    render(<HousingBenchmarkInfo benchmark={HOUSING_BENCHMARK} currentExchangeRate={null} notice="test notice" />)

    expect(screen.queryByText(/1 USD =/)).not.toBeInTheDocument()
  })
})

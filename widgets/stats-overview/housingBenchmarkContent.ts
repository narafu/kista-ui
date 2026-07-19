import type { EtfBenchmarkSymbol, HousingBenchmarkParams } from '@entities/stats'

export type HousingQuintile = Extract<HousingBenchmarkParams, { benchmarkType: 'HOUSING' }>['quintile']

export interface HousingQuintileContent {
  quintile: HousingQuintile
  label: string
  rangeLabel: string
  representativeAreas: string
  characteristics: string
}

export const HOUSING_QUINTILES: HousingQuintileContent[] = [
  {
    quintile: 1,
    label: '서울 1분위',
    rangeLabel: '서울 아파트 가격 하위 20%',
    representativeAreas: '노원구, 도봉구, 강북구, 구로구, 금천구, 중랑구',
    characteristics: '서울 외곽 지역에 위치한 구축(20~30년 차 이상) 및 소형 평수 아파트가 주를 이룹니다. 자금 여력이 상대적으로 적은 사회초년생이나 1인 가구의 첫 내 집 마련 수요가 집중되는 구간입니다.',
  },
  {
    quintile: 2,
    label: '서울 2분위',
    rangeLabel: '서울 아파트 가격 하위 20% ~ 40%',
    representativeAreas: '관악구, 은평구, 성북구, 강서구, 동대문구',
    characteristics: '서울 중심부로의 대중교통 접근성이 양호한 외곽 지역이나, 1분위 지역 내의 신축·준신축 아파트들이 혼재되어 있는 구간입니다.',
  },
  {
    quintile: 3,
    label: '서울 3분위',
    rangeLabel: '서울 아파트 가격 중간 40% ~ 60%',
    representativeAreas: '광진구, 서대문구, 영등포구, 종로구, 중구',
    characteristics: "서울 아파트의 '중간 허리'를 담당하는 구간입니다. 도심(CBD)이나 강남(GBD) 접근성이 좋은 직주근접 지역들이 주를 이룹니다. 광진구 구의동이나 자양동 일대의 기축 아파트(전용 84㎡) 혹은 입지 좋은 곳의 신축 소형(59㎡) 평수들이 이 구간에 포진해 있습니다.",
  },
  {
    quintile: 4,
    label: '서울 4분위',
    rangeLabel: '서울 아파트 가격 상위 20% ~ 40%',
    representativeAreas: '마포구, 성동구, 양천구, 동작구, 강동구',
    characteristics: "이른바 '마용성(마포·용산·성동)' 중 용산을 제외한 지역들과 학군지(목동) 등이 포함됩니다. 5분위 진입을 노리는 갈아타기 수요나 '똘똘한 한 채' 수요가 집중되는 상급지입니다.",
  },
  {
    quintile: 5,
    label: '서울 5분위',
    rangeLabel: '서울 아파트 가격 상위 20%',
    representativeAreas: '서초구, 강남구, 송파구, 용산구',
    characteristics: '대한민국 부동산 최상급지입니다. 초고가 하이엔드 주거지나 재건축 기대감이 높은 한강변 대단지 아파트들이 속하며, 최근 서울 아파트 평균 가격 상승을 강하게 주도하고 있는 구간입니다.',
  },
]

// 서버 quality.notice가 누락된 경우에도 통화 기준 안내가 사라지지 않도록 하는 클라이언트 폴백
export const HOUSING_BENCHMARK_CURRENCY_NOTICE_FALLBACK =
  '전략 운용 기록 기반 근사치입니다. 투자 성과는 USD, 서울 아파트는 KRW 현지 통화 기준이며 현재 환율은 성과 계산에 반영하지 않습니다.'

export function getHousingQuintileContent(quintile: HousingQuintile) {
  return HOUSING_QUINTILES.find((item) => item.quintile === quintile) ?? HOUSING_QUINTILES[2]
}

export type BenchmarkRiskTier = 'NEUTRAL' | 'INDEX_TRACKING' | 'LEVERAGED_OR_CRYPTO'

export interface EtfBenchmarkContent {
  symbol: EtfBenchmarkSymbol
  label: string
  fullName: string
  riskTier: BenchmarkRiskTier
  riskChipLabel: string
  description: string
  notice: string
}

export const ETF_BENCHMARKS: EtfBenchmarkContent[] = [
  {
    symbol: 'SPY',
    label: 'SPY',
    fullName: 'SPDR S&P 500 ETF Trust',
    riskTier: 'INDEX_TRACKING',
    riskChipLabel: '지수추종',
    description: 'S&P 500 지수를 추종하는 대표 ETF입니다.',
    notice: '전략 운용 기록 기반 근사치입니다. 투자와 ETF 벤치마크 모두 USD 기준이며 환율 변수가 없습니다.',
  },
  {
    symbol: 'QQQ',
    label: 'QQQ',
    fullName: 'Invesco QQQ Trust',
    riskTier: 'INDEX_TRACKING',
    riskChipLabel: '지수추종',
    description: '나스닥100 지수를 추종하는 ETF입니다.',
    notice: '전략 운용 기록 기반 근사치입니다. 투자와 ETF 벤치마크 모두 USD 기준이며 환율 변수가 없습니다.',
  },
  {
    symbol: 'QLD',
    label: 'QLD',
    fullName: 'ProShares Ultra QQQ',
    riskTier: 'LEVERAGED_OR_CRYPTO',
    riskChipLabel: '2배 레버리지',
    description: '나스닥100 일일 수익률의 2배를 추종하는 레버리지 ETF입니다.',
    notice: '일일 재조정 방식의 2배 레버리지 상품으로, 변동성이 큰 구간에서 복리효과(decay)로 인해 장기 보유 시 지수 상승분보다 낮은 수익률을 보일 수 있습니다.',
  },
  {
    symbol: 'IBIT',
    label: 'IBIT',
    fullName: 'iShares Bitcoin Trust',
    riskTier: 'LEVERAGED_OR_CRYPTO',
    riskChipLabel: '암호자산',
    description: '비트코인 현물 가격을 추종하는 ETF입니다.',
    notice: '비트코인 가격에 직접 연동되어 변동성이 매우 크며, 전통 자산과 상관관계·위험 특성이 다릅니다.',
  },
  {
    symbol: 'ETHA',
    label: 'ETHA',
    fullName: 'iShares Ethereum Trust',
    riskTier: 'LEVERAGED_OR_CRYPTO',
    riskChipLabel: '암호자산',
    description: '이더리움 현물 가격을 추종하는 ETF입니다.',
    notice: '이더리움 가격에 직접 연동되어 변동성이 매우 크며, 전통 자산과 상관관계·위험 특성이 다릅니다.',
  },
]

export function getEtfBenchmarkContent(symbol: EtfBenchmarkSymbol) {
  return ETF_BENCHMARKS.find((item) => item.symbol === symbol) ?? ETF_BENCHMARKS[0]
}

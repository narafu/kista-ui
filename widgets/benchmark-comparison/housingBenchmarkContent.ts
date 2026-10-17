import type { EtfBenchmarkSymbol } from '@entities/stats'

// ETF 벤치마크 안내: 서버 quality.notice가 누락된 경우에도 통화 기준 안내가 사라지지 않도록 하는 클라이언트 폴백
export const ETF_BENCHMARK_CURRENCY_NOTICE_FALLBACK =
  '전략 운용 기록 기반 근사치입니다. 투자와 ETF 벤치마크 모두 USD 기준이며 환율 변수가 없습니다.'

export interface EtfBenchmarkContent {
  symbol: EtfBenchmarkSymbol
  label: string
  fullName: string
  riskChipLabel: string
  description: string
  // 레버리지·암호자산처럼 상품 고유 위험이 있을 때만 — 통화 기준 안내는 서버 quality.notice가 담당
  riskNotice?: string
}

const ETF_BENCHMARKS: EtfBenchmarkContent[] = [
  {
    symbol: 'SPY',
    label: 'SPY',
    fullName: 'SPDR S&P 500 ETF Trust',
    riskChipLabel: '지수추종',
    description: 'S&P 500 지수를 추종하는 대표 ETF입니다.',
  },
  {
    symbol: 'QQQ',
    label: 'QQQ',
    fullName: 'Invesco QQQ Trust',
    riskChipLabel: '지수추종',
    description: '나스닥100 지수를 추종하는 ETF입니다.',
  },
  {
    symbol: 'QLD',
    label: 'QLD',
    fullName: 'ProShares Ultra QQQ',
    riskChipLabel: '2배 레버리지',
    description: '나스닥100 일일 수익률의 2배를 추종하는 레버리지 ETF입니다.',
    riskNotice: '일일 재조정 방식의 2배 레버리지 상품으로, 변동성이 큰 구간에서 복리효과(decay)로 인해 장기 보유 시 지수 상승분보다 낮은 수익률을 보일 수 있습니다.',
  },
  {
    symbol: 'IBIT',
    label: 'IBIT',
    fullName: 'iShares Bitcoin Trust',
    riskChipLabel: '암호자산',
    description: '비트코인 현물 가격을 추종하는 ETF입니다.',
    riskNotice: '비트코인 가격에 직접 연동되어 변동성이 매우 크며, 전통 자산과 상관관계·위험 특성이 다릅니다.',
  },
  {
    symbol: 'ETHA',
    label: 'ETHA',
    fullName: 'iShares Ethereum Trust',
    riskChipLabel: '암호자산',
    description: '이더리움 현물 가격을 추종하는 ETF입니다.',
    riskNotice: '이더리움 가격에 직접 연동되어 변동성이 매우 크며, 전통 자산과 상관관계·위험 특성이 다릅니다.',
  },
]

export function getEtfBenchmarkContent(symbol: string): EtfBenchmarkContent {
  const normalizedSymbol = symbol.trim().toUpperCase() as EtfBenchmarkSymbol
  return ETF_BENCHMARKS.find((item) => item.symbol === normalizedSymbol) ?? {
    symbol: normalizedSymbol,
    label: normalizedSymbol,
    fullName: '사용자 설정 ETF',
    riskChipLabel: '사용자 설정',
    description: '관리자 설정에 등록된 ETF 벤치마크 자산입니다.',
  }
}

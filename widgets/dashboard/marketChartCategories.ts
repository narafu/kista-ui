export interface MarketChartOption {
  symbol: string
  label: string
  description: string
}

export interface MarketChartCategory {
  title: string
  options: MarketChartOption[]
}

export const MARKET_CHART_CATEGORIES: MarketChartCategory[] = [
  {
    title: '주식형 자산',
    options: [
      { symbol: 'SPY', label: 'SPY · S&P 500', description: '미국 증시 전체의 기준점이 되는 대형주 500개 추종' },
      { symbol: 'QQQ', label: 'QQQ · 나스닥 100', description: '기술주 및 성장주 중심의 지수 추종' },
      { symbol: 'DIA', label: 'DIA · 다우존스', description: '미국의 전통적인 대형 우량주 30개 추종' },
      {
        symbol: 'SOXX',
        label: 'SOXX · 필라델피아 반도체',
        description: 'IT 하드웨어 및 AI 산업의 핵심 선행 지표 역할을 하는 반도체 섹터 추종',
      },
    ],
  },
  {
    title: '원자재 · 채권',
    options: [
      { symbol: 'GLD', label: 'GLD · 금 현물', description: '대표적인 전통 안전 자산 및 인플레이션 방어 수단' },
      {
        symbol: 'USO',
        label: 'USO · WTI 원유 선물',
        description: '글로벌 에너지 수요 및 지정학적 리스크를 반영하는 핵심 원자재',
      },
      {
        symbol: 'IEF',
        label: 'IEF · 미 국채 10년물',
        description: '글로벌 장기 금리의 벤치마크 역할을 하는 중장기 안전 자산',
      },
      {
        symbol: 'HYG',
        label: 'HYG · 하이일드 회사채',
        description: '신용등급이 낮은 기업들의 채권으로, 주식 시장의 위험 선호도(Risk-on/off)를 가늠하는 신용 지표',
      },
    ],
  },
  {
    title: '가상자산 · 보조지표',
    options: [
      { symbol: 'IBIT', label: 'IBIT · 비트코인 현물', description: '디지털 금으로 불리는 가상자산 대장주' },
      { symbol: 'ETHA', label: 'ETHA · 이더리움 현물', description: '스마트 컨트랙트 및 블록체인 생태계 대표 플랫폼' },
      {
        symbol: 'UUP',
        label: 'UUP · 달러 인덱스',
        description: '주요 6개국 통화 대비 미국 달러의 가치 상승 추종 (글로벌 자금의 미국 쏠림 현상 확인)',
      },
      {
        symbol: 'VIXY',
        label: 'VIXY · VIX 단기 선물',
        description: 'S&P 500 지수의 향후 변동성(공포 지수) 추종 (시장 폭락 시 헷지 수단)',
      },
    ],
  },
]

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
    title: '크립토 · 원자재',
    options: [
      { symbol: 'IBIT', label: 'IBIT · 비트코인 현물', description: '디지털 금으로 불리는 대표 크립토 자산의 가격 추종' },
      { symbol: 'ETHA', label: 'ETHA · 이더리움 현물', description: '스마트 컨트랙트 생태계를 대표하는 크립토 자산의 가격 추종' },
      { symbol: 'GLD', label: 'GLD · 금 현물', description: '인플레이션과 위기 국면에 수요가 몰리는 전통 실물 자산' },
      {
        symbol: 'USO',
        label: 'USO · WTI 원유 선물',
        description: '글로벌 에너지 수요와 지정학적 리스크를 반영하는 핵심 원자재',
      },
    ],
  },
  {
    title: '채권 · 달러 · 변동성',
    options: [
      {
        symbol: 'IEF',
        label: 'IEF · 미 국채 10년물',
        description: '금리와 반대로 움직여 장기 금리 흐름을 보여주는 중장기 안전 자산',
      },
      {
        symbol: 'HYG',
        label: 'HYG · 하이일드 회사채',
        description: '저신용 기업 채권으로 시장의 위험 선호(Risk-on/off)를 가늠하는 신용 지표',
      },
      {
        symbol: 'UUP',
        label: 'UUP · 달러 인덱스',
        description: '주요 6개국 통화 대비 달러 강세와 글로벌 자금의 미국 쏠림을 보여주는 지표',
      },
      {
        symbol: 'VIXY',
        label: 'VIXY · VIX 단기 선물',
        description: 'S&P 500의 단기 변동성을 추종해 시장의 공포와 헤지 수요를 보여주는 지표',
      },
    ],
  },
]

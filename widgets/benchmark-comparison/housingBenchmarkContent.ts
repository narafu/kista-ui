import type { EtfBenchmarkSymbol } from '@entities/stats'

export type HousingQuintile = 1 | 2 | 3 | 4 | 5

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

// "가격 추이" 비교지역 선택과 연동되는 지역별 5분위 안내 — 전국/수도권은 서울 설명 패턴(대표 지역·특징)에 맞춰 편집
export type HousingRegionName = '전국' | '서울' | '수도권'

export const DEFAULT_HOUSING_REGION_NAME: HousingRegionName = '서울'

// 서버 기본값(GET /housing-benchmark, /housing-benchmark/series의 regionCode 기본값)과 동일
export const DEFAULT_HOUSING_REGION_CODE = '1100000000'

const NATIONWIDE_QUINTILES: HousingQuintileContent[] = [
  {
    quintile: 1,
    label: '전국 1분위',
    rangeLabel: '전국 아파트 가격 하위 20%',
    representativeAreas: '기타 지방의 소도시 및 군(郡) 단위 (강원 태백, 경북 안동, 전북 김제 등)',
    characteristics: '지방 소도시 및 읍면동 구축입니다. 수도권 수요가 닿지 않고, 지역 내 인구 감소 타격을 직접적으로 받는 노후 단지들이 주를 이룹니다.',
  },
  {
    quintile: 2,
    label: '전국 2분위',
    rangeLabel: '전국 아파트 가격 하위 20% ~ 40%',
    representativeAreas: '경기·인천 외곽 구도심, 기타 지방 거점 (천안, 청주, 전주, 창원 등)',
    characteristics: '지방 거점 및 수도권 외곽 구간입니다. 지방 8개도의 중심 도시(도청 소재지, 산단 배후지) 신축이나 수도권의 외곽 구도심이 여기에 해당합니다.',
  },
  {
    quintile: 3,
    label: '전국 3분위',
    rangeLabel: '전국 아파트 가격 중간 40% ~ 60%',
    representativeAreas: '경기 중위권 (수원, 용인, 고양 등), 5개 광역시 주요 거점 (대전 둔산, 광주 수완 등)',
    characteristics: "전국 평균이자 광역시 핵심지에 해당하는 구간입니다. 전국 부동산의 '중간 허리'로, 수도권의 베드타운과 지방 대도시의 중심 주거지가 속합니다.",
  },
  {
    quintile: 4,
    label: '전국 4분위',
    rangeLabel: '전국 아파트 가격 상위 20% ~ 40%',
    representativeAreas: '서울 외곽 (노도강, 금관구), 경기 최상급지 (과천, 판교, 분당), 지방 대장 (부산 해운대, 대구 수성구)',
    characteristics: '서울 외곽 및 각 지역 대장 구간입니다. 서울의 하급지 아파트들과 경기 최상급지, 지방 광역시의 가장 비싼 동네들이 여기서 만납니다.',
  },
  {
    quintile: 5,
    label: '전국 5분위',
    rangeLabel: '전국 아파트 가격 상위 20%',
    representativeAreas: '서울 핵심지 및 중상급지 (강남, 서초, 송파, 용산, 마포, 성동 등)',
    characteristics: '대한민국 최상위 자본 집중지입니다. 전국 5분위의 절대다수는 서울 아파트가 차지합니다.',
  },
]

const CAPITAL_AREA_QUINTILES: HousingQuintileContent[] = [
  {
    quintile: 1,
    label: '수도권 1분위',
    rangeLabel: '수도권 아파트 가격 하위 20%',
    representativeAreas: '경기 최외곽 (동두천, 포천, 여주, 안성 등), 인천 구도심 (미추홀구, 동구, 중구 노후 단지)',
    characteristics: '수도권 최외곽 및 초구축 구간입니다. 수도권 통근권역에서 사실상 벗어난 도농복합도시나 정비사업 기대감이 없는 30년 차 이상 소형 아파트들이 주를 이룹니다.',
  },
  {
    quintile: 2,
    label: '수도권 2분위',
    rangeLabel: '수도권 아파트 가격 하위 20% ~ 40%',
    representativeAreas: '경기 하위권 (시흥, 파주 운정, 양주 옥정), 인천 중위권 (부평구, 서구, 남동구 기축)',
    characteristics: '경기 외곽 신도시 및 인천 구도심 구간입니다. 서울 출퇴근이 1시간 이상 소요되는 경기도 외곽 택지지구나 연식이 오래된 인천의 도심 지역이 해당합니다.',
  },
  {
    quintile: 3,
    label: '수도권 3분위',
    rangeLabel: '수도권 아파트 가격 중간 40% ~ 60%',
    representativeAreas: '서울 외곽 (노원, 도봉, 강북, 구로 등), 인천 상위권 (송도, 청라국제도시), 경기 중위권 (안양 평촌, 부천 중동 등)',
    characteristics: '서울 외곽 및 인천·경기 거점 구간입니다. 서울 진입의 마지노선 지역과 인천의 강남으로 불리는 송도, 1기 신도시들이 섞여 있습니다.',
  },
  {
    quintile: 4,
    label: '수도권 4분위',
    rangeLabel: '수도권 아파트 가격 상위 20% ~ 40%',
    representativeAreas: '서울 중위권 (마포, 성동, 광진, 동작 등), 경기 상위권 (하남 미사, 화성 동탄, 광명)',
    characteristics: "서울 중위권 및 2기 신도시 대장 구간입니다. 서울 직주근접 지역들과 신분당선·GTX 등 교통망을 갖춘 경기권 신도시 대장 아파트들이 해당합니다.",
  },
  {
    quintile: 5,
    label: '수도권 5분위',
    rangeLabel: '수도권 아파트 가격 상위 20%',
    representativeAreas: '서울 최상급지 (강남, 서초, 송파, 용산), 경기 최상급지 (과천, 성남 판교/분당)',
    characteristics: '수도권 최상위 입지 구간입니다. 강남 3구와 용산을 필두로, 서울 뺨치는 가격을 자랑하는 경기권 핵심 자족도시가 포함됩니다.',
  },
]

export const HOUSING_QUINTILES_BY_REGION: Record<HousingRegionName, HousingQuintileContent[]> = {
  전국: NATIONWIDE_QUINTILES,
  서울: HOUSING_QUINTILES,
  수도권: CAPITAL_AREA_QUINTILES,
}

export function getHousingQuintilesByRegionName(regionName: string): HousingQuintileContent[] {
  return HOUSING_QUINTILES_BY_REGION[regionName as HousingRegionName] ?? HOUSING_QUINTILES_BY_REGION[DEFAULT_HOUSING_REGION_NAME]
}

// ETF 벤치마크 안내: 서버 quality.notice가 누락된 경우에도 통화 기준 안내가 사라지지 않도록 하는 클라이언트 폴백
export const ETF_BENCHMARK_CURRENCY_NOTICE_FALLBACK =
  '전략 운용 기록 기반 근사치입니다. 투자와 ETF 벤치마크 모두 USD 기준이며 환율 변수가 없습니다.'

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

export function getEtfBenchmarkContent(symbol: string): EtfBenchmarkContent {
  const normalizedSymbol = symbol.trim().toUpperCase() as EtfBenchmarkSymbol
  return ETF_BENCHMARKS.find((item) => item.symbol === normalizedSymbol) ?? {
    symbol: normalizedSymbol,
    label: normalizedSymbol,
    fullName: '사용자 설정 ETF',
    riskTier: 'NEUTRAL',
    riskChipLabel: '사용자 설정',
    description: '관리자 설정에 등록된 ETF 벤치마크 자산입니다.',
    notice: ETF_BENCHMARK_CURRENCY_NOTICE_FALLBACK,
  }
}

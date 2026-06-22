// value(0~100) → 구간 라벨·색상. 게이지 색상/현재값 라벨의 SSOT.
export interface FearGreedZone {
  min: number
  max: number
  label: string
  color: string
}

export const FEAR_GREED_ZONES: FearGreedZone[] = [
  { min: 0, max: 24, label: '극공포', color: '#D14B3F' },
  { min: 25, max: 44, label: '공포', color: '#E08A5C' },
  { min: 45, max: 55, label: '중립', color: '#C9A14A' },
  { min: 56, max: 75, label: '탐욕', color: '#7FA85C' },
  { min: 76, max: 100, label: '극탐욕', color: '#3F8F6B' },
]

export function zoneOf(value: number): FearGreedZone {
  return FEAR_GREED_ZONES.find((z) => value >= z.min && value <= z.max) ?? FEAR_GREED_ZONES[2]
}

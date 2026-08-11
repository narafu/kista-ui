export type Period = '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL' | 'CUSTOM'

// 아파트는 월별 데이터라 연 단위, ETF는 일별 데이터라 개월 단위 기간이 자연스럽다 — 자산 탭별로 목록을 분리한다
export const HOUSING_PERIODS: { value: Period; label: string; months?: number }[] = [
  { value: '1Y', label: '1년', months: 12 },
  { value: '3Y', label: '3년', months: 36 },
  { value: '5Y', label: '5년', months: 60 },
  { value: 'ALL', label: '전체' },
  { value: 'CUSTOM', label: '직접' },
]

export const ETF_PERIODS: { value: Period; label: string; months?: number }[] = [
  { value: '3M', label: '3개월', months: 3 },
  { value: '6M', label: '6개월', months: 6 },
  { value: '1Y', label: '1년', months: 12 },
  { value: 'ALL', label: '전체' },
  { value: 'CUSTOM', label: '직접' },
]

export function toMonthInput(date: string) {
  return date.slice(0, 7)
}

export function fromMonthInput(month: string) {
  return `${month}-01`
}

export function subtractMonths(date: string, months: number) {
  const [year, month, day] = date.split('-').map(Number)
  const totalMonths = year * 12 + (month - 1) - months
  const targetYear = Math.floor(totalMonths / 12)
  const targetMonth = (totalMonths % 12) + 1
  const isLeapYear = targetYear % 4 === 0 && (targetYear % 100 !== 0 || targetYear % 400 === 0)
  const daysInMonth = targetMonth === 2
    ? (isLeapYear ? 29 : 28)
    : [4, 6, 9, 11].includes(targetMonth) ? 30 : 31
  const targetDay = Math.min(day, daysInMonth)

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
}

export function emptyMessage(reason: string | null | undefined, isDaily: boolean) {
  if (reason === 'INSUFFICIENT_OVERLAP' || reason === 'INSUFFICIENT_COMMON_MONTHS') {
    return isDaily
      ? '투자 기록과 벤치마크 데이터가 겹치는 기간이 부족합니다. (최소 2개 거래일 데이터 필요)'
      : '투자 기록과 벤치마크 데이터가 겹치는 기간이 부족합니다. (최소 2주치 데이터 필요)'
  }
  if (reason === 'NO_INVESTMENT_DATA') return '선택한 기간에 전략 운용 기록이 없습니다.'
  return '비교할 수 있는 데이터가 충분하지 않습니다.'
}

export function uniqueSymbols(symbols: string[]) {
  return Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)))
}

import type { HousingBenchmarkPoint, HousingBenchmarkSeriesPoint } from '@entities/stats'

export type HousingBenchmarkSeriesKey = 'investmentIndexUsd' | 'benchmarkIndex'

// 비교 차트는 ETF(일별)·아파트(KB Land 주간 조사일 기준 주별) 두 케이스뿐이다 — 월별 원본 시세는
// 별도의 HousingBenchmarkQuintileTrendChart가 담당하므로 여기서는 등장하지 않는다.
export function housingBenchmarkChartNotice(isDaily: boolean) {
  return isDaily
    ? '일별 지수와 수익률은 서버 계산값입니다.'
    : '주간 지수와 수익률은 서버 계산값입니다.'
}

export function formatHousingBenchmarkSeriesLabel(label: string, currency: 'USD' | 'KRW') {
  return `${label} (${currency})`
}

function parseYearMonth(value: string) {
  const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(value)
  if (!match) return null

  const month = Number(match[2])
  if (month < 1 || month > 12) return null

  return { year: match[1], month }
}

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  return { year: match[1], month, day }
}

export function formatHousingBenchmarkMonth(value: string) {
  const parsed = parseYearMonth(value)
  return parsed ? `${parsed.year}년 ${parsed.month}월` : value
}

export function formatHousingBenchmarkAxisMonth(value: string) {
  const parsed = parseYearMonth(value)
  return parsed ? `${parsed.year}.${String(parsed.month).padStart(2, '0')}` : value
}

export function formatHousingBenchmarkDate(value: string) {
  const parsed = parseDate(value)
  return parsed ? `${parsed.year}년 ${parsed.month}월 ${parsed.day}일` : formatHousingBenchmarkMonth(value)
}

export function formatHousingBenchmarkAxisDate(value: string) {
  const parsed = parseDate(value)
  return parsed
    ? `${String(parsed.month).padStart(2, '0')}.${String(parsed.day).padStart(2, '0')}`
    : formatHousingBenchmarkAxisMonth(value)
}

// 아파트(주간) 축 전용 — 기본 조회 기간이 1~5년이라 연도 없는 MM.DD만으로는 축만 훑을 때
// 어느 해 데이터인지 구분이 안 된다. ETF(3M~1Y 기본)는 formatHousingBenchmarkAxisDate로 충분.
export function formatHousingBenchmarkAxisWeek(value: string) {
  const parsed = parseDate(value)
  return parsed
    ? `${parsed.year.slice(2)}.${String(parsed.month).padStart(2, '0')}.${String(parsed.day).padStart(2, '0')}`
    : formatHousingBenchmarkAxisMonth(value)
}

function monthIndex(value: string) {
  const parsed = parseYearMonth(value)
  return parsed ? Number(parsed.year) * 12 + parsed.month : null
}

/** 기간 첫·마지막 유효 시점의 값으로 연평균 상승률(CAGR)을 계산한다. 유효 구간이 1개월 이하면 null */
export function calculateQuintileCagr(
  points: HousingBenchmarkSeriesPoint[],
  quintileKey: keyof HousingBenchmarkSeriesPoint,
): number | null {
  const valid = points
    .map((point) => ({ month: point.baseMonth, value: point[quintileKey] }))
    .filter((point): point is { month: string; value: number } =>
      typeof point.month === 'string' && typeof point.value === 'number' && point.value > 0)

  if (valid.length < 2) return null

  const first = valid[0]
  const last = valid[valid.length - 1]
  const firstIdx = monthIndex(first.month)
  const lastIdx = monthIndex(last.month)
  if (firstIdx == null || lastIdx == null) return null

  const monthSpan = lastIdx - firstIdx
  if (monthSpan <= 0) return null

  return (last.value / first.value) ** (12 / monthSpan) - 1
}

/** 기간 첫·마지막 유효 시점의 값으로 연평균 상승률(CAGR)을 계산한다(일 단위 날짜). 유효 구간이 하루 이하면 null */
export function calculateSeriesCagr<T>(points: T[], dateKey: keyof T, valueKey: keyof T): number | null {
  const valid: { date: string; value: number }[] = []
  for (const point of points) {
    const date = point[dateKey]
    const value = point[valueKey]
    if (typeof date === 'string' && typeof value === 'number' && value > 0) {
      valid.push({ date, value })
    }
  }

  if (valid.length < 2) return null

  const first = valid[0]
  const last = valid[valid.length - 1]
  const firstMs = Date.parse(first.date)
  const lastMs = Date.parse(last.date)
  if (Number.isNaN(firstMs) || Number.isNaN(lastMs)) return null

  const daySpan = (lastMs - firstMs) / 86_400_000
  if (daySpan <= 0) return null

  return (last.value / first.value) ** (365.25 / daySpan) - 1
}

export function formatCagr(value: number | null) {
  if (value == null) return '—'
  const pct = value * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%/년`
}

// 비교 차트(투자·벤치마크 정규화 지수)와 '없음' 선택 시 단독 매매가격지수 차트가 함께 사용한다
export function formatHousingIndexValue(value: unknown) {
  return typeof value === 'number' ? value.toFixed(1) : '—'
}

function formatPeriodReturn(value: number | null | undefined, isDaily: boolean) {
  if (value == null) return isDaily ? '기준일' : '기준주'
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}% ${isDaily ? '일간' : '주간'}`
}

export function formatHousingBenchmarkTooltipValue(
  value: unknown,
  seriesKey: HousingBenchmarkSeriesKey,
  point: HousingBenchmarkPoint,
  isDaily: boolean,
) {
  const periodReturn = seriesKey === 'investmentIndexUsd'
    ? point.investmentPeriodReturn
    : point.benchmarkPeriodReturn

  return `${formatHousingIndexValue(value)} · ${formatPeriodReturn(periodReturn, isDaily)}`
}

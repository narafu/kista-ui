import type { HousingBenchmarkPoint, HousingBenchmarkSeriesPoint } from '@entities/stats'

export type HousingBenchmarkSeriesKey = 'investmentIndexUsd' | 'benchmarkIndex'

export const HOUSING_BENCHMARK_CHART_NOTICE =
  '월별 지수와 수익률은 서버 계산값입니다.'

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

export function formatHousingBenchmarkMonth(value: string) {
  const parsed = parseYearMonth(value)
  return parsed ? `${parsed.year}년 ${parsed.month}월` : value
}

export function formatHousingBenchmarkAxisMonth(value: string) {
  const parsed = parseYearMonth(value)
  return parsed ? `${parsed.year}.${String(parsed.month).padStart(2, '0')}` : value
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

export function formatQuintileCagr(value: number | null) {
  if (value == null) return '—'
  const pct = value * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%/년`
}

function formatIndex(value: unknown) {
  return typeof value === 'number' ? value.toFixed(1) : '—'
}

function formatMonthlyReturn(value: number | null | undefined) {
  if (value == null) return '기준월'
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}% 월간`
}

export function formatHousingBenchmarkTooltipValue(
  value: unknown,
  seriesKey: HousingBenchmarkSeriesKey,
  point: HousingBenchmarkPoint,
) {
  const monthlyReturn = seriesKey === 'investmentIndexUsd'
    ? point.investmentMonthlyReturn
    : point.benchmarkMonthlyReturn

  return `${formatIndex(value)} · ${formatMonthlyReturn(monthlyReturn)}`
}

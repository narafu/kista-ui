import type { HousingBenchmarkPoint } from '@entities/stats'

export type HousingBenchmarkSeriesKey = 'investmentIndexUsd' | 'benchmarkIndex'

export const HOUSING_BENCHMARK_CHART_NOTICE =
  '월별 지수와 수익률은 서버 계산값이며, 표시된 현재 환율로 환산하지 않습니다.'

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

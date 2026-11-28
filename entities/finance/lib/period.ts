// 수입·소비·저축 탭의 기간 상태와 내역 목록 조회 범위. 집계(요약·추이·예산 대비)의 기간 규칙은
// 서버(kista-api FlowPeriod)가 소유한다 — 여기는 내역 리스트·자동 월 보정·등록 폼이 쓰는 것만 남는다.

export type PeriodMode = 'monthly' | 'yearly'

export interface Period {
  month: string // 'YYYY-MM' — 조회 기준 월
  mode: PeriodMode
}

// month('YYYY-MM')를 delta개월 이동한다. delta는 음수 허용.
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const total = y * 12 + (m - 1) + delta
  const nextY = Math.floor(total / 12)
  const nextM = (total % 12) + 1
  return `${nextY}-${String(nextM).padStart(2, '0')}`
}

// month('YYYY-MM')의 말일을 'YYYY-MM-DD'로 반환한다.
export function monthEndDate(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate() // m은 1-based이므로 day=0 → 전달 말일 = 이번 달 말일
  return `${month}-${String(lastDay).padStart(2, '0')}`
}

export function monthStartDate(month: string): string {
  return `${month}-01`
}

// 화면이 실제로 조회해야 하는 범위 — 월간은 그 달, 연간은 선택 연도가 올해면 1월~오늘(YTD),
// 이미 끝난 과거 연도면 1월~12월 전체. 연간 모드엔 mm을 바꿀 UI가 없어(연도 select만 있음)
// period.month의 mm은 월간 탭에서 보던 달이 그대로 남아있는 값이라 신뢰할 수 없다 — 그 mm으로
// "선택월까지"를 계산하면 과거 연도를 골라도 반쪽 합계만 나오는 버그가 된다.
export function periodRange({ month, mode }: Period, today: string): { from: string; to: string } {
  if (mode === 'monthly') return { from: monthStartDate(month), to: monthEndDate(month) }
  const year = month.slice(0, 4)
  return { from: `${year}-01-01`, to: year === today.slice(0, 4) ? today : monthEndDate(`${year}-12`) }
}

// 최신 거래일(오늘 기준 12개월 안, 없으면 빈 목록)을 보고 "지금 보여줄 월"을 옮겨야 하는지 판정한다 — 현재 선택월에 거래가
// 하나라도 있으면 그대로(null), 없으면 목록 중 가장 최근 월을 반환한다. 최근 월이 현재 선택월과
// 같으면(목록이 비었거나 전부 그 달이면) 조정 불필요라 null. 반환·selectedMonth는 'YYYY-MM',
// transactionDates 원소는 'YYYY-MM-DD'. useFinanceFlowData가 매 마운트마다 오늘 기준으로 호출해
// "데이터 있는 최근 월"을 잡되, 결과를 URL이 아닌 로컬 상태로만 반영한다.
export function autoAdjustedMonth(selectedMonth: string, transactionDates: string[]): string | null {
  if (transactionDates.some((date) => date.startsWith(selectedMonth))) return null
  const latestMonth = transactionDates.map((date) => date.slice(0, 7)).sort().at(-1)
  return latestMonth && latestMonth !== selectedMonth ? latestMonth : null
}

// 가계부 내역 등록의 "오늘 기준" 독립 창(하한 없음) 상한 — 이번 달 말일까지만 허용해 미래
// 날짜 등록을 막는다. FinanceHeader.tsx(등록 버튼)·useFinanceFlowData.ts(FinanceRecordList로
// 전달) 두 곳이 동일한 계산을 썼던 것을 여기로 모았다.
export function registerWindowUpperBound(today: string): string {
  return monthEndDate(today.slice(0, 7))
}

// 추이·구성비 차트의 표시 기간 — 숫자는 버킷 개수(월간=개월, 연간=년), 'all'은 기록 전체.
export type TrendRange = number | 'all'

export const MONTHLY_TREND_RANGE_OPTIONS: { value: TrendRange; label: string }[] = [
  { value: 12, label: '12개월' },
  { value: 24, label: '24개월' },
  { value: 36, label: '36개월' },
  { value: 'all', label: '전체' },
]

export const YEARLY_TREND_RANGE_OPTIONS: { value: TrendRange; label: string }[] = [
  { value: 5, label: '5년' },
  { value: 10, label: '10년' },
  { value: 'all', label: '전체' },
]

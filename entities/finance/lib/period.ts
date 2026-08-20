// 수입·소비·저축 탭의 기간 계산. 월간/연간(YTD) 두 모드를 단일 12개월 윈도우 쿼리로
// 덮기 위한 순수 함수 모음 — 설계 근거는 docs/agents/entities.md finance 항목 참고.

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

// 화면이 실제로 조회해야 하는 범위 — 월간은 그 달, 연간(YTD)은 1월~선택 월.
export function periodRange({ month, mode }: Period): { from: string; to: string } {
  if (mode === 'monthly') return { from: monthStartDate(month), to: monthEndDate(month) }
  const year = month.slice(0, 4)
  return { from: `${year}-01-01`, to: monthEndDate(month) }
}

// 요약·전월대비·6개월추이·YTD누적·예산대비를 단일 쿼리로 덮는 12개월 윈도우.
// 선택 월을 포함해 과거 11개월 전까지 — 연간 모드에서 YTD 범위(최대 12개월)가 항상 이 윈도우 안에 들어온다.
export function windowRange(month: string): { from: string; to: string } {
  return { from: monthStartDate(shiftMonth(month, -11)), to: monthEndDate(month) }
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

// 일평균 분모 — 선택 월이 진행 중인 이번 달이면 지난 일수만(오늘 포함), 이미 끝난 달이면 그 달 전체 일수.
// today는 'YYYY-MM-DD'(todayKst() 호출부 주입) — 진행 중인 달 판정에만 쓰고 그 외엔 daysInMonth와 동일하다.
export function elapsedDaysInMonth(month: string, today: string): number {
  if (month === today.slice(0, 7)) return Number(today.slice(8, 10))
  return daysInMonth(month)
}

// YTD 모드에서 "몇 개월치 실적인지" — 1월부터 선택 월까지 개월 수.
export function elapsedMonthsInYear(month: string): number {
  return Number(month.slice(5, 7))
}

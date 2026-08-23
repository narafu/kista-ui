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

// 화면이 실제로 조회해야 하는 범위 — 월간은 그 달, 연간은 선택 연도가 올해면 1월~오늘(YTD),
// 이미 끝난 과거 연도면 1월~12월 전체. 연간 모드엔 mm을 바꿀 UI가 없어(연도 select만 있음)
// period.month의 mm은 월간 탭에서 보던 달이 그대로 남아있는 값이라 신뢰할 수 없다 — 그 mm으로
// "선택월까지"를 계산하면 과거 연도를 골라도 반쪽 합계만 나오는 버그가 된다.
// 연간 모드 range 계산 4곳(periodRange·elapsedMonthsInYear·previousYearRange·yearsRange)이
// 공통으로 쓰는 "선택 연도가 올해인가" 판정 — 판정 기준이 바뀌면 한 곳만 고치면 되도록 모은다.
function isCurrentYear(year: string, today: string): boolean {
  return year === today.slice(0, 4)
}

export function periodRange({ month, mode }: Period, today: string): { from: string; to: string } {
  if (mode === 'monthly') return { from: monthStartDate(month), to: monthEndDate(month) }
  const year = month.slice(0, 4)
  return { from: `${year}-01-01`, to: isCurrentYear(year, today) ? today : monthEndDate(`${year}-12`) }
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

// 연간 모드에서 "몇 개월치 실적인지" — periodRange와 동일한 규칙: 올해면 1월~오늘 달,
// 과거 연도면 12개월 전체.
export function elapsedMonthsInYear(month: string, today: string): number {
  if (isCurrentYear(month.slice(0, 4), today)) return Number(today.slice(5, 7))
  return 12
}

// 연간 모드의 "전년대비" 비교 대상 범위 — 올해는 periodRange와 동일하게 "정확히 오늘"에 대응하는
// 전년 동일 일자까지, 과거 연도는 전년 1월~12월 전체. 올해를 월말(monthEndDate)까지로 끊으면
// periodRange(정확히 오늘까지)와 어긋나 전년 쪽에 최대 한 달치 거래가 더 들어가 델타가 왜곡된다
// (오늘이 그 달 1일이면 전년은 그 달 전체, 올해는 하루 — 8월분 전체가 델타에 스며든다). 전년에
// 없는 날짜(예: 오늘이 윤년 2/29, 전년은 평년)는 그 달 말일로 clamp한다.
export function previousYearRange(period: Period, today: string): { from: string; to: string } {
  const year = period.month.slice(0, 4)
  const prevYear = Number(year) - 1
  if (!isCurrentYear(year, today)) return { from: `${prevYear}-01-01`, to: monthEndDate(`${prevYear}-12`) }
  const mm = today.slice(5, 7)
  const dd = today.slice(8, 10)
  const monthEnd = monthEndDate(`${prevYear}-${mm}`)
  const sameDayLastYear = `${prevYear}-${mm}-${dd}`
  return { from: `${prevYear}-01-01`, to: sameDayLastYear <= monthEnd ? sameDayLastYear : monthEnd }
}

// 연간 모드 "최근 N개년 추이" 조회 윈도우 — 선택 연도 포함 과거 (yearsLimit-1)개년 1월 1일부터,
// to는 periodRange와 동일한 규칙(과거 연도면 12월까지, 올해면 오늘까지)이다. month의 mm은 연간
// 모드에 없는 개념이라 신뢰할 수 없다(periodRange 주석 참고) — mm 기준으로 자르면 최근추이
// 차트의 올해 구간이 실제보다 좁게 조회된다. windowRange(12개월)로는 커버되지 않는 별도 쿼리가
// 필요하다(previousYearRange와 동일한 이유).
export function yearsRange(month: string, yearsLimit: number, today: string): { from: string; to: string } {
  const year = Number(month.slice(0, 4))
  return {
    from: `${year - (yearsLimit - 1)}-01-01`,
    to: isCurrentYear(String(year), today) ? today : monthEndDate(`${year}-12`),
  }
}

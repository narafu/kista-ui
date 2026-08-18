/**
 * VR 사이클의 다음 롤오버(리밸런싱) 예정일 — kista-api VrCycleRolloverService의
 * `dueDate = cycle.startDate().plusWeeks(intervalWeeks)`와 동일 규칙.
 * yyyy-MM-dd 문자열을 UTC 기준으로 직접 계산해 시간대에 따른 날짜 밀림을 피한다.
 */
export function nextVrRolloverDate(startDate: string, intervalWeeks: number): string {
  const [y, m, d] = startDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + intervalWeeks * 7))
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

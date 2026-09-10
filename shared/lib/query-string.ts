/** undefined·빈 문자열 값은 제외하고 쿼리스트링을 만든다(0은 유지). 결과 없으면 빈 문자열. */
export function buildQueryString(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    q.set(key, String(value))
  }
  const qs = q.toString()
  return qs ? `?${qs}` : ''
}

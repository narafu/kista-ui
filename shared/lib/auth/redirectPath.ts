// 오픈 리다이렉트 방지: candidate가 자체 scheme/host를 갖지 않는 순수 상대 경로일 때만 통과시킨다.
// prefix 문자열 검사(candidate.startsWith('/') && !candidate.startsWith('//'))는 불충분하다 —
// '/\evil.com'류가 WHATWG URL 파서에서 '//evil.com'(프로토콜 상대 URL)로 정규화되는 걸 못 막는다.
// 반드시 URL 파싱 후 origin 비교로 판정해야 실제 오픈 리다이렉트를 막을 수 있다.
const SENTINEL_ORIGIN = 'https://sentinel.invalid'

export function safeRedirectPath(candidate: string | null | undefined): string | null {
  if (!candidate) return null
  try {
    const url = new URL(candidate, SENTINEL_ORIGIN)
    if (url.origin !== SENTINEL_ORIGIN) return null
    const path = `${url.pathname}${url.search}`
    // dot-segment 정규화 우회: '/.//evil.com'은 sentinel 기준으로는 origin이 안 바뀌지만
    // pathname 자체가 '//evil.com'이 되어, 이 반환값을 다시 new URL(path, realOrigin)으로
    // 파싱하면 network-path reference(프로토콜 상대 URL)로 재해석되어 evil.com으로 새 나간다.
    if (path.startsWith('//')) return null
    return path
  } catch {
    return null
  }
}

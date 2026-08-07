// JWT exp 클레임만 확인 (서명 검증 없음) — bufferSecs 이내 만료도 갱신 대상
export function isJwtExpired(token: string, bufferSecs = 30): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as { exp?: number }
    return typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000) + bufferSecs
  } catch {
    return true
  }
}

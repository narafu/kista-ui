export type ApiKeyExpiryState = 'EXPIRED' | 'EXPIRING' | null

const EXPIRING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // api 만료 알림(D-30)과 같은 기준

export const API_KEY_EXPIRY_LABEL: Record<Exclude<ApiKeyExpiryState, null>, string> = {
  EXPIRED: 'API 키 재등록 필요',
  EXPIRING: 'API 키 만료 임박',
}

export function apiKeyExpiryState(expiresAt: string | null | undefined, now = new Date()): ApiKeyExpiryState {
  if (!expiresAt) return null
  const remainMs = new Date(expiresAt).getTime() - now.getTime()
  if (Number.isNaN(remainMs)) return null
  if (remainMs <= 0) return 'EXPIRED'
  return remainMs <= EXPIRING_WINDOW_MS ? 'EXPIRING' : null
}

// 오늘(KST) yyyy-MM-dd — 만료일 입력란 min·표시용
export function kstToday(now = new Date()): string {
  return now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
}

// 만료일이 추정값인 broker(메타 apiKeyExpirySource) — 사용자가 실제 만료일을 입력할 수 있다
export function isEstimatedExpiry(source: string | undefined): boolean {
  return source === 'ESTIMATED'
}

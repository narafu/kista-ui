import type { ApiKeyExpirySource } from '@shared/lib/api-schema'
import { toKstDateString } from '@shared/lib/format'

// 오늘(KST) yyyy-MM-dd — 만료일 입력란 min·표시용
export function kstToday(now = new Date()): string {
  return toKstDateString(now)
}

// 내일(KST) yyyy-MM-dd — 서버가 오늘 이하 만료일을 400으로 거부해 입력란 min·제출 가드로 쓴다. UTC 날짜 연산이라 DST·로컬 TZ 영향 없음
export function kstTomorrow(now = new Date()): string {
  const d = new Date(`${kstToday(now)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// 만료일이 추정값인 broker(메타 apiKeyExpirySource) — 사용자가 실제 만료일을 입력할 수 있다
export function isEstimatedExpiry(source: ApiKeyExpirySource | undefined): boolean {
  return source === 'ESTIMATED'
}

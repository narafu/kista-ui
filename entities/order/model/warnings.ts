import type { NextOrderPreview, OrderWarningCode } from './types'

// 서버가 내려준 경고 중 해당 코드가 있는가 — 판정은 서버(OrderPreviewWarning)가 하고 클라는 읽기만 한다
export function hasWarning(preview: Pick<NextOrderPreview, 'warnings'> | undefined, code: OrderWarningCode): boolean {
  return preview?.warnings.some((w) => w.code === code) ?? false
}

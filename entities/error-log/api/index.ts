import { clientFetch, jsonBody } from '@shared/lib/api-client'
import type { ClientErrorLogInput } from '../model/types'

// 오류 바운더리(error.tsx/global-error.tsx)에서 호출 — 리포트 실패가 화면에 영향을 주지 않도록 여기서 흡수
export async function reportClientError(input: ClientErrorLogInput): Promise<void> {
  try {
    await clientFetch<void>('/api/client-errors', jsonBody('POST', input))
  } catch {
    // 리포트 실패는 무시
  }
}

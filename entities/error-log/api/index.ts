import { clientFetch, jsonBody } from '@shared/lib/api-client'
import type { ClientErrorLogInput } from '../model/types'

// 오류 바운더리(error.tsx/global-error.tsx)에서 호출 — 리포트 실패가 화면에 영향을 주지 않도록 여기서 흡수
export async function reportClientError(input: ClientErrorLogInput): Promise<void> {
  try {
    // keepalive — ChunkLoadError는 리포트 직후 페이지가 새로고침되므로 요청이 끊기지 않게 한다
    await clientFetch<void>('/api/client-errors', { ...jsonBody('POST', input), keepalive: true })
  } catch {
    // 리포트 실패는 무시
  }
}

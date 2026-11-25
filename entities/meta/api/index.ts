import { ApiError } from '@shared/lib/api-client'
import { getApiBaseUrl } from '@shared/lib/env'
import type { MetaBundle } from '../model/types'

// /api/meta는 permitAll + 사용자 무관 메타. 관리자 운영 설정(전략·증권사 enabled, 필드 정책, approvalRequired, benchmarkEtf)이 실려
// 저장 즉시 반영되도록 Data Cache에 담지 않는다 — Next Data Cache는 응답 Cache-Control이 아니라 fetch 옵션(revalidate)만 보고 저장한다
export async function getMetaBundle(): Promise<MetaBundle> {
  const res = await fetch(`${getApiBaseUrl()}/api/meta`, { cache: 'no-store' })
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json() as Promise<MetaBundle>
}

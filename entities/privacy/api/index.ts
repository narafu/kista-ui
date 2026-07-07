import { apiFetch } from '@shared/lib/api-client'
import type { AdminPrivacyBase } from '../model/types'

// 관리자 — PRIVACY P 매매표 목록 (Server Component 전용, token 필요)
// days 미전달 시 전체 기간 조회
export async function listAdminPrivacyBases(token: string, days?: number): Promise<AdminPrivacyBase[]> {
  const qs = days != null ? `?days=${days}` : ''
  return apiFetch<AdminPrivacyBase[]>(`/api/admin/privacy-trade-bases${qs}`, { method: 'GET' }, token)
}

import { apiFetch, clientFetch } from '@shared/lib/api-client'
import type { PrivacyCurrentBase, PrivacyRange, AdminPrivacyBase } from '../model/types'

export async function getPrivacyCurrentBase(): Promise<PrivacyCurrentBase> {
  return clientFetch<PrivacyCurrentBase>('/api/privacy-trades/base/latest')
}

// 관리자 — PRIVACY 기준 매매표 목록 (Server Component 전용, token 필요)
export async function listAdminPrivacyBases(token: string, range: PrivacyRange = 'ALL'): Promise<AdminPrivacyBase[]> {
  return apiFetch<AdminPrivacyBase[]>(`/api/admin/privacy-trade-bases?range=${range}`, { method: 'GET' }, token)
}

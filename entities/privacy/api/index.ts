import { clientFetch, fetchEither, jsonBody } from '@shared/lib/api-client'
import type {
  AdminPrivacyBase,
  AdminPrivacyBaseCreateRequest,
  AdminPrivacyBaseUpdateRequest,
  AdminPrivacyOrderCreateRequest,
  AdminPrivacyOrderUpdateRequest,
} from '../model/types'

// 관리자 — PRIVACY P 매매표 목록. Server Component는 token과 함께, Client Component는
// token 없이 호출(admin catch-all 라우트가 GET도 프록시). days 미전달 시 전체 기간 조회
export async function listAdminPrivacyBases(token?: string, days?: number): Promise<AdminPrivacyBase[]> {
  const qs = days != null ? `?days=${days}` : ''
  return fetchEither<AdminPrivacyBase[]>(`/api/admin/privacy-trade-bases${qs}`, { method: 'GET' }, token)
}

// 관리자 — P 매매표 등록(privacy_master 생성 + 주문). 기존 FIDA 수신 로직 재사용 —
// 동일 (releaseDate, ticker)에 내용까지 같으면 200(멱등), 다르면 409, 신규면 201.
export async function createAdminPrivacyBase(request: AdminPrivacyBaseCreateRequest): Promise<AdminPrivacyBase> {
  return clientFetch<AdminPrivacyBase>('/api/admin/privacy-trade-bases', jsonBody('POST', request))
}

// 관리자 — P 매매표 사이클 시작금액/평단가/보유/실현손익 수정(4개 필드 전체 교체).
export async function updateAdminPrivacyBase(id: string, request: AdminPrivacyBaseUpdateRequest): Promise<AdminPrivacyBase> {
  return clientFetch<AdminPrivacyBase>(`/api/admin/privacy-trade-bases/${id}`, jsonBody('PATCH', request))
}

// 관리자 — P 매매표 개별 주문 가격/수량 수정.
export async function updateAdminPrivacyOrder(
  baseId: string,
  orderId: string,
  request: AdminPrivacyOrderUpdateRequest,
): Promise<AdminPrivacyBase> {
  return clientFetch<AdminPrivacyBase>(`/api/admin/privacy-trade-bases/${baseId}/orders/${orderId}`, jsonBody('PATCH', request))
}

// 관리자 — P 매매표에 주문 추가.
export async function addAdminPrivacyOrder(
  baseId: string,
  request: AdminPrivacyOrderCreateRequest,
): Promise<AdminPrivacyBase> {
  return clientFetch<AdminPrivacyBase>(`/api/admin/privacy-trade-bases/${baseId}/orders`, jsonBody('POST', request))
}

// 관리자 — P 매매표 개별 주문 삭제.
export async function deleteAdminPrivacyOrder(baseId: string, orderId: string): Promise<AdminPrivacyBase> {
  return clientFetch<AdminPrivacyBase>(`/api/admin/privacy-trade-bases/${baseId}/orders/${orderId}`, { method: 'DELETE' })
}

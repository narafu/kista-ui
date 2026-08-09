import { listAssets } from '@entities/asset'
import type { Asset } from '@entities/asset'

// 자산 수정·복제 페이지(실제 라우트 + @modal 인터셉트 라우트)가 공유하는 조회.
// GET /api/assets/{id} 엔드포인트가 없어 목록에서 찾는다 — loadAccountAndStrategyForEdit와 동일 패턴.
export async function loadAssetById(assetId: string, token: string): Promise<Asset | null> {
  const assets = await listAssets(token)
  return assets.find((asset) => asset.id === assetId) ?? null
}

import { listAssetSnapshots } from '@entities/finance'
import type { AssetSnapshot } from '@entities/finance'

// 자산 수정·복제 페이지(실제 라우트 + @modal 인터셉트 라우트)가 공유하는 조회.
// GET /api/finance/asset-snapshots/{id} 단건 엔드포인트가 없어 목록에서 찾는다 — loadAccountAndStrategyForEdit와 동일 패턴.
export async function loadAssetSnapshotById(id: string, token: string): Promise<AssetSnapshot | null> {
  const snapshots = await listAssetSnapshots(token)
  return snapshots.find((snapshot) => snapshot.id === id) ?? null
}

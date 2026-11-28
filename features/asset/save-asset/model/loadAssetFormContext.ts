import { listAssetSnapshots } from '@entities/finance'
import type { AssetSnapshot } from '@entities/finance'

// 자산 수정·복제 페이지에서 쓰는 조회.
// GET /api/finance/asset-snapshots/{id} 단건 엔드포인트가 없고 목록은 월 필수라, 그 기록이 속한 달(month)의 목록에서
// 찾는다 — 목록의 편집·복제 링크가 ?month=를 싣는다. month가 없으면(직접 URL 입력 등) null.
export async function loadAssetSnapshotById(id: string, month: string | undefined, token: string): Promise<AssetSnapshot | null> {
  if (!month) return null
  const snapshots = await listAssetSnapshots({ month, token })
  return snapshots.find((snapshot) => snapshot.id === id) ?? null
}

import { Badge } from './Badge'

/**
 * 그룹에 공유된 항목(groupId 있음)에만 붙는 배지. 그룹 소속 여부(canShare)와 무관하게 데이터 상태만 본다.
 * info 톤 — 자산 카테고리 배지(brand/neutral/error)와 나란히 놓여도 구분되도록 겹치지 않는 색을 쓴다.
 */
export function GroupSharedBadge({ groupId }: { groupId?: string | null }) {
  if (!groupId) return null
  return <Badge tone="none" size="sm" className="bg-info-bg text-info">공유</Badge>
}

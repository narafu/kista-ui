import { Badge } from './Badge'

/** 그룹에 공유된 항목(groupId 있음)에만 붙는 배지. 그룹 소속 여부(canShare)와 무관하게 데이터 상태만 본다. */
export function GroupSharedBadge({ groupId }: { groupId?: string | null }) {
  if (!groupId) return null
  return <Badge tone="neutral" size="sm">공유</Badge>
}

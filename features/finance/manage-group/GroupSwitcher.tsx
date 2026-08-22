import type { FinanceGroup } from '@entities/finance'

// 1인 1그룹 정책(kista-api 2026-08 재설계)으로 groups는 0개(개인) 또는 1개뿐이고, 서버가
// groupId 쿼리 파라미터를 무시한 채 항상 "개인+그룹 데이터 합집합"을 반환한다 — 그룹을
// 전환해서 보는 데이터가 달라지는 개념 자체가 없어져 Select를 걷어내고 정적 표시로 축소한다.
interface Props {
  group: FinanceGroup | undefined
}

export function GroupSwitcher({ group }: Props) {
  if (!group) return null
  return <p className="text-sm font-medium px-1">{group.name}</p>
}

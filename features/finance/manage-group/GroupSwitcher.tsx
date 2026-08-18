'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSetActiveGroupId } from '@entities/finance'
import type { FinanceGroup } from '@entities/finance'

// kista-api는 개인 그룹 name을 고정 문자열 "개인"으로 준다(FinanceGroupPersistenceAdapter.
// createPersonalGroup). 초대 수락으로 personal:false 전환된 공유 그룹도 그룹 이름 변경 API가
// 없어 원래 owner의 개인 그룹이 갖고 있던 "개인"이라는 이름을 그대로 물려받는다 — personal
// 여부와 무관하게 name만으로는 구분이 안 된다. personal이면 name을 무시하고 고정 라벨을 써서
// 최소한 "내 개인 그룹"과 그 외 그룹은 항상 구분되게 한다.
function groupLabel(group: FinanceGroup) {
  return group.personal ? '내 개인 그룹' : group.name
}

interface Props {
  groups: FinanceGroup[]
  // 현재 선택된 groupId(개인 그룹이면 그 그룹의 id) — GroupManager가 이미 useFinanceGroupsQuery/
  // useActiveGroupId로 계산해 갖고 있어 여기서 다시 구독·재계산하지 않는다.
  value: string | undefined
}

export function GroupSwitcher({ groups, value }: Props) {
  const setActiveGroupId = useSetActiveGroupId()

  if (groups.length === 0) return null

  return (
    <Select
      items={groups.map((g) => ({ value: g.id, label: groupLabel(g) }))}
      value={value ?? null}
      onValueChange={(next) => {
        if (!next) return
        const group = groups.find((g) => g.id === next)
        setActiveGroupId(group?.personal ? undefined : next)
      }}
    >
      <SelectTrigger aria-label="그룹 전환" className="w-full h-11">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>{groupLabel(g)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

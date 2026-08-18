'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useActiveGroupId, useFinanceGroupsQuery, useSetActiveGroupId } from '@entities/finance'

function groupLabel(name: string, personal: boolean) {
  return personal ? `${name} (개인)` : name
}

export function GroupSwitcher() {
  const { data: groups = [] } = useFinanceGroupsQuery()
  const activeGroupId = useActiveGroupId()
  const setActiveGroupId = useSetActiveGroupId()
  const personalGroup = groups.find((g) => g.personal)
  const value = activeGroupId ?? personalGroup?.id

  if (groups.length === 0) return null

  return (
    <Select
      items={groups.map((g) => ({ value: g.id, label: groupLabel(g.name, g.personal) }))}
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
          <SelectItem key={g.id} value={g.id}>{groupLabel(g.name, g.personal)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

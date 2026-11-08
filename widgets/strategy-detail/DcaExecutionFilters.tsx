'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMeta } from '@entities/meta'
import { formatDcaSchedule } from '@entities/strategy'
import type { DcaRule } from '@entities/strategy'
import { ALL_FILTER_VALUE } from './OrderHistoryFilters'

interface Props {
  rules: DcaRule[]
  direction: string
  ruleKey: string
  onDirectionChange: (value: string) => void
  onRuleKeyChange: (value: string) => void
}

export function DcaExecutionFilters({ rules, direction, ruleKey, onDirectionChange, onRuleKeyChange }: Props) {
  const { meta, labelOf } = useMeta()
  const directionOptions = [{ value: ALL_FILTER_VALUE, label: '전체' }, ...(meta.orderDirections ?? []).map((i) => ({ value: i.code, label: labelOf('orderDirections', i.code) }))]
  // 규칙 카드와 같은 라벨 — 같은 라벨이 겹치면 순번을 덧붙여 구분한다
  const labels = rules.map((r) => formatDcaSchedule(r, labelOf('dcaFrequencies', r.frequency)))
  const ruleOptions = [
    { value: ALL_FILTER_VALUE, label: '전체' },
    ...rules.map((r, i) => ({ value: r.ruleKey, label: labels.filter((l) => l === labels[i]).length > 1 ? `${labels[i]} ${i + 1}` : labels[i] })),
  ]
  return (
    <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center">
      <Select items={directionOptions} value={direction} onValueChange={(value) => { if (value) onDirectionChange(value) }}>
        <SelectTrigger aria-label="방향" className="w-full lg:w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          {directionOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select items={ruleOptions} value={ruleKey} onValueChange={(value) => { if (value) onRuleKeyChange(value) }}>
        <SelectTrigger aria-label="규칙" className="w-full lg:w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ruleOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

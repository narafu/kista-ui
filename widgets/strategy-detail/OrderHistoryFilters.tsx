'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMeta } from '@entities/meta'

export type OrderHistoryFilterValue = 'ALL' | string

export const ALL_FILTER_VALUE = 'ALL'

interface Props {
  direction: OrderHistoryFilterValue
  orderType: OrderHistoryFilterValue
  status: OrderHistoryFilterValue
  onDirectionChange: (value: OrderHistoryFilterValue) => void
  onOrderTypeChange: (value: OrderHistoryFilterValue) => void
  onStatusChange: (value: OrderHistoryFilterValue) => void
}

export function OrderHistoryFilters({
  direction,
  orderType,
  status,
  onDirectionChange,
  onOrderTypeChange,
  onStatusChange,
}: Props) {
  const { meta, labelOf } = useMeta()
  // 방향·유형·상태 목록은 메타 orderDirections·orderTypes·orderStatuses가 SSOT — 값이 추가되면 서버 메타만 고친다
  const withAll = (category: 'orderDirections' | 'orderTypes' | 'orderStatuses'): Array<readonly [string, string]> =>
    [[ALL_FILTER_VALUE, '전체'], ...(meta[category] ?? []).map((i): readonly [string, string] => [i.code, labelOf(category, i.code)])]
  const directionOptions = withAll('orderDirections')
  const orderTypeOptions = withAll('orderTypes')
  const statusOptions = withAll('orderStatuses')
  return (
    <div className="grid grid-cols-3 gap-2 lg:flex lg:items-center">
      <Select items={directionOptions.map(([value, label]) => ({ value, label }))} value={direction} onValueChange={(value) => { if (value) onDirectionChange(value) }}>
        <SelectTrigger aria-label="방향" className="w-full lg:w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          {directionOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select items={orderTypeOptions.map(([value, label]) => ({ value, label }))} value={orderType} onValueChange={(value) => { if (value) onOrderTypeChange(value) }}>
        <SelectTrigger aria-label="유형" className="w-full lg:w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          {orderTypeOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select items={statusOptions.map(([value, label]) => ({ value, label }))} value={status} onValueChange={(value) => { if (value) onStatusChange(value) }}>
        <SelectTrigger aria-label="상태" className="w-full lg:w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          {statusOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

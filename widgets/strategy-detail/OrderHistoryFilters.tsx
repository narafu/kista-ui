'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMeta } from '@entities/meta'
import { ORDER_STATUS_LABEL } from '@entities/order'

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

const STATUS_OPTIONS = [
  [ALL_FILTER_VALUE, '전체'],
  ['PLANNED', ORDER_STATUS_LABEL.PLANNED],
  ['SUBMITTING', ORDER_STATUS_LABEL.SUBMITTING],
  ['PLACED', ORDER_STATUS_LABEL.PLACED],
  ['FILLED', ORDER_STATUS_LABEL.FILLED],
  ['PARTIALLY_FILLED', ORDER_STATUS_LABEL.PARTIALLY_FILLED],
  ['CANCELLED', ORDER_STATUS_LABEL.CANCELLED],
  ['FAILED', ORDER_STATUS_LABEL.FAILED],
] as const

export function OrderHistoryFilters({
  direction,
  orderType,
  status,
  onDirectionChange,
  onOrderTypeChange,
  onStatusChange,
}: Props) {
  const { meta, labelOf } = useMeta()
  // 방향·유형 목록은 메타 orderDirections·orderTypes가 SSOT — 값이 추가되면 서버 메타만 고친다
  const directionOptions: Array<readonly [string, string]> = [[ALL_FILTER_VALUE, '전체'], ...meta.orderDirections.map((d): readonly [string, string] => [d.code, labelOf('orderDirections', d.code)])]
  const orderTypeOptions: Array<readonly [string, string]> = [[ALL_FILTER_VALUE, '전체'], ...meta.orderTypes.map((t): readonly [string, string] => [t.code, labelOf('orderTypes', t.code)])]
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
      <Select items={STATUS_OPTIONS.map(([value, label]) => ({ value, label }))} value={status} onValueChange={(value) => { if (value) onStatusChange(value) }}>
        <SelectTrigger aria-label="상태" className="w-full lg:w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

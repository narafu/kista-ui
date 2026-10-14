'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DIRECTION_LABEL, ORDER_TYPE_LABEL } from '@entities/trade'
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

const DIRECTION_OPTIONS = [
  [ALL_FILTER_VALUE, '전체'],
  ['BUY', DIRECTION_LABEL.BUY],
  ['SELL', DIRECTION_LABEL.SELL],
] as const

// 유형 목록은 ORDER_TYPE_LABEL이 SSOT — 유형이 추가되면 라벨 맵만 고친다
const ORDER_TYPE_OPTIONS: Array<readonly [string, string]> = [[ALL_FILTER_VALUE, '전체'], ...Object.entries(ORDER_TYPE_LABEL)]

const STATUS_OPTIONS = [
  [ALL_FILTER_VALUE, '전체'],
  ['PLANNED', ORDER_STATUS_LABEL.PLANNED],
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
  return (
    <div className="grid grid-cols-3 gap-2 lg:flex lg:items-center">
      <Select items={DIRECTION_OPTIONS.map(([value, label]) => ({ value, label }))} value={direction} onValueChange={(value) => { if (value) onDirectionChange(value) }}>
        <SelectTrigger aria-label="방향" className="w-full lg:w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          {DIRECTION_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select items={ORDER_TYPE_OPTIONS.map(([value, label]) => ({ value, label }))} value={orderType} onValueChange={(value) => { if (value) onOrderTypeChange(value) }}>
        <SelectTrigger aria-label="유형" className="w-full lg:w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ORDER_TYPE_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
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

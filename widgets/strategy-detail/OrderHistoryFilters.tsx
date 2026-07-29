'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  ['BUY', '매수'],
  ['SELL', '매도'],
] as const

const ORDER_TYPE_OPTIONS = [
  [ALL_FILTER_VALUE, '전체'],
  ['LIMIT', 'LIMIT'],
  ['LOC', 'LOC'],
  ['MOC', 'MOC'],
] as const

const STATUS_OPTIONS = [
  [ALL_FILTER_VALUE, '전체'],
  ['PLANNED', '예정'],
  ['PLACED', '접수'],
  ['FILLED', '체결'],
  ['PARTIALLY_FILLED', '부분체결'],
  ['CANCELLED', '취소'],
  ['FAILED', '실패'],
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
      <Select value={direction} onValueChange={(value) => { if (value) onDirectionChange(value) }}>
        <SelectTrigger aria-label="방향" className="w-full lg:w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          {DIRECTION_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={orderType} onValueChange={(value) => { if (value) onOrderTypeChange(value) }}>
        <SelectTrigger aria-label="유형" className="w-full lg:w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ORDER_TYPE_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(value) => { if (value) onStatusChange(value) }}>
        <SelectTrigger aria-label="상태" className="w-full lg:w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

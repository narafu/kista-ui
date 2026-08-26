'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  value: string // 'YYYY-MM'
  onChange: (value: string) => void
  yearLabel: string
  monthLabel: string
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export function YearMonthSelect({ value, onChange, yearLabel, monthLabel }: Props) {
  const [year, month] = value.split('-').map(Number)
  const years = Array.from({ length: 7 }, (_, i) => year - 3 + i)

  const emit = (nextYear: number, nextMonth: number) => {
    onChange(`${nextYear}-${String(nextMonth).padStart(2, '0')}`)
  }

  return (
    <div className="flex gap-2">
      <Select items={years.map((y) => ({ value: String(y), label: `${y}년` }))} value={String(year)} onValueChange={(v) => { if (v) emit(Number(v), month) }}>
        <SelectTrigger aria-label={yearLabel} className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => <SelectItem key={y} value={String(y)}>{y}년</SelectItem>)}
        </SelectContent>
      </Select>
      <Select items={MONTHS.map((m) => ({ value: String(m), label: `${m}월` }))} value={String(month)} onValueChange={(v) => { if (v) emit(year, Number(v)) }}>
        <SelectTrigger aria-label={monthLabel} className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((m) => <SelectItem key={m} value={String(m)}>{m}월</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

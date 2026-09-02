'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@shared/lib/utils'

interface Props {
  value: string // YYYY-MM
  onValueChange: (value: string) => void
  today: string // YYYY-MM-DD, 연도 select 범위 계산 기준
  className?: string
}

// 연도·월 select 한 쌍 — 네이티브 <input type="month">은 데스크탑 사파리가 지원하지 않아 대체한다.
// 최근 15개년을 기본으로 잡되, 그 범위 밖 연도(과거든 미래든)를 선택 중이면 목록에 포함되도록 보정한다
// (안 하면 SelectValue가 목록에 없는 값이라 빈칸으로 보인다).
export function YearMonthSelect({ value, onValueChange, today, className }: Props) {
  const currentYear = Number(today.slice(0, 4))
  const selectedYear = Number(value.slice(0, 4))
  const latestYear = Math.max(selectedYear, currentYear)
  const earliestYear = Math.min(selectedYear, currentYear - 14)
  const yearOptions = Array.from({ length: latestYear - earliestYear + 1 }, (_, i) => latestYear - i)
  const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Select
        items={yearOptions.map((y) => ({ value: String(y), label: `${y}년` }))}
        value={value.slice(0, 4)}
        onValueChange={(year) => { if (year) onValueChange(`${year}-${value.slice(5, 7)}`) }}
      >
        <SelectTrigger aria-label="기준 연도" className="h-9 w-20 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}년</SelectItem>)}
        </SelectContent>
      </Select>
      <Select
        items={monthOptions.map((m) => ({ value: m, label: `${Number(m)}월` }))}
        value={value.slice(5, 7)}
        onValueChange={(month) => { if (month) onValueChange(`${value.slice(0, 4)}-${month}`) }}
      >
        <SelectTrigger aria-label="기준 월" className="h-9 w-16 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((m) => <SelectItem key={m} value={m}>{Number(m)}월</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

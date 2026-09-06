'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@shared/lib/utils'

interface Props {
  value: string // YYYY-MM
  onValueChange: (value: string) => void
  today: string // YYYY-MM-DD, 이동 범위 기준
  // 접근성 라벨 접두사 — 한 화면에 여러 개가 있을 때 구분한다(예: '소스', '대상'). 기본값 '기준 연월'.
  label?: string
  // 이동 가능한 연도 범위. 기본은 15년 전 ~ 올해(미래 데이터가 없는 조회용). 미래 월 선택이 필요하면 넓힌다.
  minYear?: number
  maxYear?: number
  className?: string
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

// 월 그리드 팝오버 — 네이티브 <input type="month">은 데스크탑 사파리가 지원하지 않아 대체한다.
// 연도 좌우 화살표 + 1~12월 4열 그리드. 이동 범위는 minYear~maxYear로 제한하되 현재 선택값은 항상 포함한다.
export function YearMonthSelect({ value, onValueChange, today, label = '기준 연월', minYear, maxYear, className }: Props) {
  const selectedYear = Number(value.slice(0, 4))
  const selectedMonth = Number(value.slice(5, 7))
  const currentYear = Number(today.slice(0, 4))
  const lowerYear = Math.min(selectedYear, minYear ?? currentYear - 14)
  const upperYear = Math.max(selectedYear, maxYear ?? currentYear)

  const [open, setOpen] = useState(false)
  // 팝오버 안에서 넘겨보는 연도 — 열 때마다 선택값 기준으로 되돌린다.
  const [viewYear, setViewYear] = useState(selectedYear)

  function handleOpenChange(next: boolean) {
    if (next) setViewYear(selectedYear)
    setOpen(next)
  }

  function pick(month: number) {
    onValueChange(`${viewYear}-${String(month).padStart(2, '0')}`)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label={`${label} ${selectedYear}년 ${selectedMonth}월`}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-transparent px-3 text-sm whitespace-nowrap transition-colors outline-none select-none hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          className,
        )}
      >
        {selectedYear}년 {selectedMonth}월
      </PopoverTrigger>
      <PopoverContent className="w-56 gap-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="이전 연도"
            disabled={viewYear <= lowerYear}
            onClick={() => setViewYear((y) => y - 1)}
            className="rounded p-1 transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="size-4 text-muted-foreground" />
          </button>
          <span aria-live="polite" className="text-sm font-medium tabular-nums">{viewYear}년</span>
          <button
            type="button"
            aria-label="다음 연도"
            disabled={viewYear >= upperYear}
            onClick={() => setViewYear((y) => y + 1)}
            className="rounded p-1 transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {MONTHS.map((month) => {
            const active = viewYear === selectedYear && month === selectedMonth
            return (
              <button
                key={month}
                type="button"
                aria-label={`${viewYear}년 ${month}월`}
                aria-pressed={active}
                onClick={() => pick(month)}
                className={cn(
                  'rounded px-2 py-2 text-sm tabular-nums transition-colors hover:bg-accent',
                  active && 'bg-[var(--brand-fg-soft)] text-[var(--background)] hover:bg-[var(--brand-fg-soft)]',
                )}
              >
                {month}월
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

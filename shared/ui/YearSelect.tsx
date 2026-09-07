'use client'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@shared/lib/utils'

interface Props {
  value: number // 선택된 연도
  onValueChange: (year: number) => void
  today: string // YYYY-MM-DD, 범위 기준
  // 접근성 라벨 접두사 — 한 화면에 여러 개가 있을 때 구분한다. 기본값 '기준 연도'.
  label?: string
  // 선택 가능한 연도 범위. 기본은 15년 전 ~ 올해이며 현재 선택값이 밖이면 그 값까지 넓힌다.
  minYear?: number
  maxYear?: number
  className?: string
}

// 연도 그리드 팝오버 — YearMonthSelect(월 그리드)와 같은 시각 언어. 연도 수가 적어(~15) 페이징 화살표 없이
// 전체를 최신순 3열 그리드로 보여준다.
export function YearSelect({ value, onValueChange, today, label = '기준 연도', minYear, maxYear, className }: Props) {
  const currentYear = Number(today.slice(0, 4))
  const lowerYear = Math.min(value, minYear ?? currentYear - 14)
  const upperYear = Math.max(value, maxYear ?? currentYear)
  const years = Array.from({ length: upperYear - lowerYear + 1 }, (_, i) => upperYear - i)

  const [open, setOpen] = useState(false)

  function pick(year: number) {
    onValueChange(year)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`${label} ${value}년`}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-transparent px-3 text-sm whitespace-nowrap transition-colors outline-none select-none hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          className,
        )}
      >
        {value}년
      </PopoverTrigger>
      <PopoverContent className="w-44">
        <div className="grid grid-cols-3 gap-1">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              aria-label={`${year}년`}
              aria-pressed={year === value}
              onClick={() => pick(year)}
              className={cn(
                'rounded px-2 py-2 text-sm tabular-nums transition-colors hover:bg-accent',
                year === value && 'bg-[var(--brand-fg-soft)] text-[var(--background)] hover:bg-[var(--brand-fg-soft)]',
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

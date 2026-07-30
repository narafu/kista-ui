'use client'

import { todayKst } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'

interface Props {
  value: string | null
  onChange: (date: string | null) => void
  loading: boolean
}

// 시작예정일 — 세 전략 공통, 등록 전용. 지정한 날짜 자체가 아니라 그 이후 첫 거래일부터 매매가 시작된다(경계 exclusive)
export function ScheduledStartSection({ value, onChange, loading }: Props) {
  return (
    <div className="py-[18px] border-b border-border">
      <label>
        <span className="block mb-1 text-xs font-semibold text-muted-foreground">시작예정일 (선택)</span>
        <input
          type="date"
          value={value ?? ''}
          min={todayKst()}
          disabled={loading}
          onChange={(e) => onChange(e.target.value || null)}
          className={cn(
            'flex items-center h-11 rounded-[var(--r-sm)] bg-card px-3 text-sm outline-none',
            loading
              ? 'opacity-50 border border-border'
              : 'border border-[var(--rose-400)] shadow-[0_0_0_3px_rgba(203,131,106,0.18)]',
          )}
        />
      </label>
      <p className="mt-2 text-sm text-muted-foreground">
        선택한 날짜 이후 첫 거래일부터 시작됩니다. 비워두면 오늘 시작합니다.
      </p>
    </div>
  )
}

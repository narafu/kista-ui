'use client'

import { todayKst } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'

interface Props {
  value: string | null
  onChange: (date: string | null) => void
  loading: boolean
  error?: string
}

// 시작예정일 — 네 전략 공통, 등록 전용, 필수(기본값 오늘). 시작예정일 밤 미국장(그날 22:00 개장 배치)부터 매매가 시작된다
export function ScheduledStartSection({ value, onChange, loading, error }: Props) {
  return (
    <div className="py-[18px] border-b border-border">
      <label>
        <span className="block mb-1 text-xs font-semibold text-muted-foreground">시작예정일</span>
        <input
          type="date"
          value={value ?? ''}
          min={todayKst()}
          required
          disabled={loading}
          onChange={(e) => onChange(e.target.value || todayKst())}
          className={cn(
            'flex items-center h-11 rounded-[var(--r-sm)] bg-card px-3 text-base outline-none',
            loading
              ? 'opacity-50 border border-border'
              : 'border border-[var(--rose-400)] shadow-[0_0_0_3px_rgba(203,131,106,0.18)]',
          )}
        />
      </label>
      {error && <p className="mt-1 text-sm text-[var(--status-error)]">{error}</p>}
    </div>
  )
}

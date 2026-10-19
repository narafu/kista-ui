'use client'

import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { todayKst } from '@shared/lib/format'
import { StrategyFieldLabel } from '../StrategyFieldLabel'

interface Props {
  value: string | null
  onChange: (date: string | null) => void
  loading: boolean
  error?: string
}

// 시작예정일 — 네 전략 공통, 등록 전용, 필수(기본값 오늘). 시작예정일 밤 미국장(그날 22:00 개장 배치)부터 매매가 시작된다
export function ScheduledStartSection({ value, onChange, loading, error }: Props) {
  const id = useId()
  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel htmlFor={id}>시작예정일</StrategyFieldLabel>
      <Input
        id={id}
        type="date"
        value={value ?? ''}
        min={todayKst()}
        required
        disabled={loading}
        onChange={(e) => onChange(e.target.value || todayKst())}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-11 w-auto rounded-[var(--r-sm)] px-3"
      />
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-[var(--status-error)]">{error}</p>}
    </div>
  )
}

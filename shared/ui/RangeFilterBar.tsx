'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export type RangePreset = '7d' | '30d' | 'all' | 'custom'

const LABELS: Record<RangePreset, string> = {
  '7d': '7일',
  '30d': '30일',
  all: '전체',
  custom: '직접입력',
}

interface Props {
  current: RangePreset
  from?: string
  to?: string
  pageParamKeys?: string[]
}

export function RangeFilterBar({ current, from, to, pageParamKeys = ['page'] }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [customFrom, setCustomFrom] = useState(from ?? '')
  const [customTo, setCustomTo] = useState(to ?? '')

  function navigate(range: RangePreset, f?: string, t?: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', range)
    pageParamKeys.forEach((key) => params.set(key, '1'))
    if (range === 'custom' && f && t) {
      params.set('from', f)
      params.set('to', t)
    } else {
      params.delete('from')
      params.delete('to')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {(['7d', '30d', 'all', 'custom'] as RangePreset[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => navigate(r, customFrom, customTo)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              current === r
                ? 'bg-rose-50 text-rose-600'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {LABELS[r]}
          </button>
        ))}
      </div>
      {current === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            aria-label="시작 날짜"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">~</span>
          <input
            type="date"
            aria-label="종료 날짜"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => navigate('custom', customFrom, customTo)}
            disabled={!customFrom || !customTo}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            적용
          </button>
        </div>
      )}
    </div>
  )
}

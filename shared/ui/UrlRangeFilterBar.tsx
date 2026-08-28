'use client'

import { Suspense, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { RANGE_LABELS, type RangePreset } from '@shared/lib/date-range'

export type { RangePreset }

interface Props {
  current: RangePreset
  from?: string
  to?: string
  pageParamKeys?: string[]
  paramPrefix?: string
  presets?: RangePreset[]
}

function RangeFilterBarContent({ current, from, to, pageParamKeys = ['page'], paramPrefix, presets = ['7d', '30d', 'all', 'custom'] }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [customFrom, setCustomFrom] = useState(from ?? '')
  const [customTo, setCustomTo] = useState(to ?? '')

  const rangeKey = paramPrefix ? `${paramPrefix}Range` : 'range'
  const fromKey  = paramPrefix ? `${paramPrefix}From`  : 'from'
  const toKey    = paramPrefix ? `${paramPrefix}To`    : 'to'

  function navigate(range: RangePreset, f?: string, t?: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(rangeKey, range)
    pageParamKeys.forEach((key) => params.set(key, '1'))
    if (range === 'custom' && f && t) {
      params.set(fromKey, f)
      params.set(toKey, t)
    } else {
      params.delete(fromKey)
      params.delete(toKey)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {presets.map((r) => (
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
            {RANGE_LABELS[r]}
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
            className="rounded-md border border-[var(--border-strong)] bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">~</span>
          <input
            type="date"
            aria-label="종료 날짜"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-md border border-[var(--border-strong)] bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
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

export function UrlRangeFilterBar(props: Props) {
  return (
    <Suspense>
      <RangeFilterBarContent {...props} />
    </Suspense>
  )
}

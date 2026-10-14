'use client'

import { Suspense, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@shared/lib/utils'
import { buttonVariants } from '@/components/ui/button-variants'
import { DEFAULT_RANGE_PRESETS, RANGE_LABELS, type RangePreset } from '@shared/lib/date-range'

export type { RangePreset }

interface Props {
  current: RangePreset
  from?: string
  to?: string
  pageParamKeys?: string[]
  paramPrefix?: string
  presets?: readonly RangePreset[]
}

function RangeFilterBarContent({ current, from, to, pageParamKeys = ['page'], paramPrefix, presets = DEFAULT_RANGE_PRESETS }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [customFrom, setCustomFrom] = useState(from ?? '')
  const [customTo, setCustomTo] = useState(to ?? '')
  const invalidRange = !!customFrom && !!customTo && customFrom > customTo

  const rangeKey = paramPrefix ? `${paramPrefix}Range` : 'range'
  const fromKey  = paramPrefix ? `${paramPrefix}From`  : 'from'
  const toKey    = paramPrefix ? `${paramPrefix}To`    : 'to'

  function navigate(range: RangePreset, f?: string, t?: string) {
    if (range === 'custom' && f && t && f > t) return
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
      <div className="flex flex-wrap gap-2">
        {presets.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={current === r}
            onClick={() => navigate(r, customFrom, customTo)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              current === r
                ? 'bg-rose-50 text-[var(--brand-fg-soft)]'
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
            className="rounded-md border border-[var(--border-strong)] bg-background px-3 py-1.5 text-base sm:text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">~</span>
          <input
            type="date"
            aria-label="종료 날짜"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-md border border-[var(--border-strong)] bg-background px-3 py-1.5 text-base sm:text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => navigate('custom', customFrom, customTo)}
            disabled={!customFrom || !customTo || invalidRange}
            className={cn(buttonVariants({ variant: 'brand-soft', size: 'sm' }))}
          >
            적용
          </button>
          {invalidRange && (
            <p role="alert" className="w-full text-xs text-destructive">시작 날짜가 종료 날짜보다 늦습니다.</p>
          )}
        </div>
      )}
    </div>
  )
}

// from/to가 바뀌면(뒤로가기·앞으로가기) key로 내부 입력 state를 새 URL 값에 다시 맞춘다.
export function UrlRangeFilterBar(props: Props) {
  return (
    <Suspense>
      <RangeFilterBarContent key={`${props.from ?? ''}|${props.to ?? ''}`} {...props} />
    </Suspense>
  )
}

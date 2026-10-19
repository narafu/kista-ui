'use client'

import { Suspense, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
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
      <SegmentedToggle
        aria-label="기간"
        options={presets.map((r) => ({ value: r, label: RANGE_LABELS[r] }))}
        value={current}
        onChange={(r) => navigate(r, customFrom, customTo)}
      />
      {current === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="date"
            aria-label="시작 날짜"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="w-auto"
          />
          <span className="text-xs text-muted-foreground">~</span>
          <Input
            type="date"
            aria-label="종료 날짜"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => setCustomTo(e.target.value)}
            className="w-auto"
          />
          <Button
            variant="brand-soft"
            size="sm"
            onClick={() => navigate('custom', customFrom, customTo)}
            disabled={!customFrom || !customTo || invalidRange}
          >
            적용
          </Button>
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

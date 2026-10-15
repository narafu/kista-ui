'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@shared/lib/utils'

const FILTERS = [
  { type: 'all',     label: '전체' },
  { type: 'anomaly', label: '이상 징후' },
  { type: 'error',   label: '오류 로그' },
  { type: 'audit',   label: '관리자 로그' },
] as const

const PRESERVE_KEYS = [
  'anoRange', 'anoFrom', 'anoTo',
  'errRange', 'errFrom', 'errTo', 'errSize',
  'audRange', 'audFrom', 'audTo', 'audSize',
]

export function LogsFilterChips() {
  const searchParams = useSearchParams()
  const active = searchParams.get('type') ?? 'all'

  function buildHref(type: string) {
    const params = new URLSearchParams()
    if (type !== 'all') params.set('type', type)
    for (const key of PRESERVE_KEYS) {
      const v = searchParams.get(key)
      if (v) params.set(key, v)
    }
    const qs = params.toString()
    return qs ? `/admin/logs?${qs}` : '/admin/logs'
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map(({ type, label }) => (
        <Link
          key={type}
          href={buildHref(type)}
          aria-current={active === type ? 'page' : undefined}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            active === type
              ? 'border border-[var(--rose-200)] bg-[var(--rose-50)] text-[var(--brand-fg-soft)]'
              : 'border border-transparent bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const FILTERS = [
  { type: 'all',     label: '전체' },
  { type: 'anomaly', label: '이상 징후' },
  { type: 'error',   label: '오류 로그' },
  { type: 'audit',   label: '감사 로그' },
] as const

export function LogsFilterChips() {
  const searchParams = useSearchParams()
  const active = searchParams.get('type') ?? 'all'

  return (
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map(({ type, label }) => (
        <Link
          key={type}
          href={type === 'all' ? '/admin/logs' : `/admin/logs?type=${type}`}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === type
              ? 'bg-rose-100 text-rose-700'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}

'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const OPTIONS = [
  { value: 7,  label: '7일' },
  { value: 14, label: '14일' },
  { value: 30, label: '30일' },
] as const

interface Props {
  current: number
}

export function InactiveDaysSelect({ current }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(days: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('inactiveDays', String(days))
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">비활성 기준</span>
      <div className="flex gap-1">
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleChange(value)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              current === value
                ? 'bg-rose-50 text-rose-600'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

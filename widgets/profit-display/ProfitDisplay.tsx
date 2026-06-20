import { cn } from '@shared/lib/utils'
import { fmtUsd, fmtKrw, fmtPercent } from '@shared/lib/format'

interface Props {
  amount?: number
  rate?: number
  size?: 'sm' | 'md' | 'lg'
  full?: boolean
  currency?: 'USD' | 'KRW'
  className?: string
}

const SIZE_MAP = { sm: 'text-sm', md: 'text-base', lg: 'text-xl font-bold' } as const

export function ProfitDisplay({ amount, rate, size = 'md', full, currency = 'USD', className }: Props) {
  const isPos = (rate ?? amount ?? 0) >= 0
  const color = isPos ? 'text-pos' : 'text-neg'
  const sign = isPos ? '+' : '-'
  const sym = currency === 'KRW' ? '₩' : '$'
  const fmt = (n: number) => currency === 'KRW' ? fmtKrw(n) : fmtUsd(n)

  return (
    <span className={cn('inline-flex items-baseline gap-1.5 flex-wrap', SIZE_MAP[size], color, className)}>
      {full && amount !== undefined && (
        <span>{sign}{sym}{fmt(Math.abs(amount))}</span>
      )}
      {rate !== undefined && (
        <span className={full ? 'text-[0.85em] opacity-80' : ''}>
          {fmtPercent(rate)}
        </span>
      )}
      {!full && amount !== undefined && rate === undefined && (
        <span>{sign}{fmt(Math.abs(amount))}</span>
      )}
    </span>
  )
}

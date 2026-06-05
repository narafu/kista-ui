import { cn } from '@shared/lib/utils'

interface Props {
  amount?: number
  rate?: number
  size?: 'sm' | 'md' | 'lg'
  full?: boolean
  currency?: 'USD' | 'KRW'
  className?: string
}

export function ProfitDisplay({ amount, rate, size = 'md', full, currency = 'USD', className }: Props) {
  const isPos = (rate ?? amount ?? 0) >= 0
  const color = isPos ? 'text-pos' : 'text-neg'
  const sizeMap = { sm: 'text-sm', md: 'text-base', lg: 'text-xl font-bold' }
  const sign = isPos ? '+' : '-'
  const sym = currency === 'KRW' ? '₩' : '$'
  const fmt = (n: number) => currency === 'KRW'
    ? n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <span className={cn('inline-flex items-baseline gap-1.5 flex-wrap', sizeMap[size], color, className)}>
      {full && amount !== undefined && (
        <span>{sign}{sym}{fmt(Math.abs(amount))}</span>
      )}
      {rate !== undefined && (
        <span className={full ? 'text-[0.85em] opacity-80' : ''}>
          {sign}{Math.abs(rate).toFixed(2)}%
        </span>
      )}
      {!full && amount !== undefined && rate === undefined && (
        <span>{sign}{fmt(Math.abs(amount))}</span>
      )}
    </span>
  )
}
